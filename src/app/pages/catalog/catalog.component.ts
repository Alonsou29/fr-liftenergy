import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type * as ThreeNamespace from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';
import { CatalogCategory, CatalogProduct, ProductService } from '../../services/product.service';
import { DraftOrderService } from '../../services/draft-order.service';
import { ContactRequestModalComponent, ContactRequestResult } from '../../components/contact-request-modal/contact-request-modal.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ContactRequestModalComponent],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly whatsappPhoneNumber = '17867251404';
  private regionId = '';
  private readonly pumpjackModelUrl = '/models/pumpjack.glb';
  private previousBodyStyles = {
    overflow: '',
    position: '',
    top: '',
    left: '',
    right: '',
    width: ''
  };
  private previousDocumentOverflow = '';
  private lockedScrollY = 0;
  private isBodyScrollLocked = false;

  @ViewChild('pumpjackCanvas') private pumpjackCanvas?: ElementRef<HTMLCanvasElement>;

  private three?: typeof ThreeNamespace;
  private pumpjackScene?: ThreeNamespace.Scene;
  private pumpjackCamera?: ThreeNamespace.PerspectiveCamera;
  private pumpjackRenderer?: ThreeNamespace.WebGLRenderer;
  private pumpjackControls?: OrbitControlsType;
  private pumpjackResizeObserver?: ResizeObserver;
  private pumpjackAnimationFrame = 0;

  constructor(
    private translate: TranslateService,
    private ngZone: NgZone,
    private productService: ProductService,
    private draftOrderService: DraftOrderService
  ) {}

  searchTerm = '';
  selectedCategory: CatalogCategory | 'all' = 'rtu';
  selectedProduct: CatalogProduct | null = null;
  products: CatalogProduct[] = [];
  isLoadingProducts = true;
  readonly skeletonPlaceholders = [0, 1, 2, 3, 4, 5];
  pendingContactProduct: CatalogProduct | null = null;
  isSubmittingContact = false;

  ngOnInit() {
    // El catálogo no muestra precio, así que no depende de la región para
    // pintarse: se pide de inmediato y en paralelo, sin esperar a
    // /store/regions (que solo hace falta más tarde, al confirmar el modal
    // de contacto y crear la cotización).
    this.productService.getCatalog().subscribe({
      next: products => {
        this.products = products;
        this.isLoadingProducts = false;
      },
      error: () => (this.isLoadingProducts = false),
    });
    this.productService.getRegionId().subscribe(regionId => (this.regionId = regionId));
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      queueMicrotask(() => this.initPumpjackScene());
    });
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    this.destroyPumpjackScene();
  }

  readonly categories: { id: CatalogCategory | 'all'; labelKey: string; descriptionKey: string }[] = [
    {
      id: 'rtu',
      labelKey: 'CATALOG.CATEGORIES.RTU',
      descriptionKey: 'CATALOG.CATEGORIES.RTU_DESC'
    },
    {
      id: 'accessories',
      labelKey: 'CATALOG.CATEGORIES.ACCESSORIES',
      descriptionKey: 'CATALOG.CATEGORIES.ACCESSORIES_DESC'
    },
    {
      id: 'drives',
      labelKey: 'CATALOG.CATEGORIES.DRIVES',
      descriptionKey: 'CATALOG.CATEGORIES.DRIVES_DESC'
    },
    {
      id: 'all',
      labelKey: 'CATALOG.CATEGORIES.ALL',
      descriptionKey: 'CATALOG.CATEGORIES.ALL_DESC'
    }
  ];

  get filteredProducts() {
    const search = this.normalizeSearch(this.searchTerm);

    return this.products.filter(product => {
      const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      const matchesSearch = !search || this.productMatchesSearch(product, search);
      return matchesCategory && matchesSearch;
    });
  }

  get activeCategoryLabel() {
    const category = this.categories.find(item => item.id === this.selectedCategory);
    return category ? this.t(category.labelKey) : '';
  }

  selectCategory(category: CatalogCategory | 'all') {
    this.selectedCategory = category;
    this.closeDetails();
  }

  applySearch() {
    this.closeDetails();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'rtu';
    this.closeDetails();
  }

  openDetails(product: CatalogProduct) {
    this.selectedProduct = product;
    this.lockBodyScroll();
  }

  closeDetails() {
    this.selectedProduct = null;
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  closeDetailsWithEscape() {
    this.closeDetails();
  }

  requestInfo(product?: CatalogProduct) {
    // Sin producto puntual (ej. botón genérico del hero) no hay variant_id
    // que enviar a Medusa: sigue abriendo WhatsApp directo, sin cotización.
    if (!product) {
      this.openWhatsapp(this.activeCategoryLabel || this.t('CATALOG.WHATSAPP.GENERIC_SUBJECT'));
      return;
    }
    this.pendingContactProduct = product;
  }

  onContactCancelled() {
    this.pendingContactProduct = null;
  }

  onContactConfirmed(contact: ContactRequestResult) {
    const product = this.pendingContactProduct;
    if (!product) return;

    this.isSubmittingContact = true;
    this.draftOrderService
      .createDraftOrder({
        email: contact.email,
        regionId: this.regionId,
        variantId: product.variantId,
        quantity: 1,
        notes: `Contacto: ${contact.name} / ${contact.phone}`,
      })
      .subscribe({
        next: draftOrder => {
          this.isSubmittingContact = false;
          this.pendingContactProduct = null;
          this.openWhatsapp(`${product.code} - ${product.name}`, draftOrder.displayId);
        },
        // No bloquear al asesor/cliente si Medusa falla: se abre WhatsApp
        // igual, solo sin número de cotización.
        error: () => {
          this.isSubmittingContact = false;
          this.pendingContactProduct = null;
          this.openWhatsapp(`${product.code} - ${product.name}`);
        },
      });
  }

  private openWhatsapp(subject: string, quoteDisplayId?: number) {
    const quoteLine = quoteDisplayId ? `\n${this.t('CATALOG.WHATSAPP.QUOTE_LABEL')}: #${quoteDisplayId}` : '';
    const message = `${this.t('CATALOG.WHATSAPP.GREETING')}\n\n${this.t('CATALOG.WHATSAPP.SUBJECT')}: ${subject}${quoteLine}\n${this.t('CATALOG.WHATSAPP.NOTE')}`;
    const whatsappUrl = `https://wa.me/${this.whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  getCategoryLabelKey(category: CatalogCategory) {
    const map: Record<CatalogCategory, string> = {
      rtu: 'CATALOG.CATEGORIES.RTU',
      accessories: 'CATALOG.CATEGORIES.ACCESSORIES',
      drives: 'CATALOG.CATEGORIES.DRIVES',
    };
    return map[category];
  }

  private productMatchesSearch(product: CatalogProduct, search: string) {
    const primaryTokens = this.getSearchTokens([
      product.code,
      product.name,
      product.subtitle,
      product.description,
      this.t(`CATALOG.CATEGORIES.${product.category === 'rtu' ? 'RTU' : product.category === 'accessories' ? 'ACCESSORIES' : 'DRIVES'}`),
      ...product.highlights
    ]);

    if (primaryTokens.some(token => token.startsWith(search))) {
      return true;
    }

    if (search.length < 3) {
      return false;
    }

    const secondaryTokens = this.getSearchTokens([
      ...product.applications,
      ...(product.related ?? []),
      ...product.specs.flatMap(spec => [spec.label, spec.value])
    ]);

    return secondaryTokens.some(token => token.startsWith(search));
  }

  private lockBodyScroll() {
    if (this.isBodyScrollLocked || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    this.lockedScrollY = window.scrollY;
    this.previousDocumentOverflow = document.documentElement.style.overflow;
    this.previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    this.isBodyScrollLocked = true;
  }

  private unlockBodyScroll() {
    if (!this.isBodyScrollLocked || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyStyles.overflow;
    document.body.style.position = this.previousBodyStyles.position;
    document.body.style.top = this.previousBodyStyles.top;
    document.body.style.left = this.previousBodyStyles.left;
    document.body.style.right = this.previousBodyStyles.right;
    document.body.style.width = this.previousBodyStyles.width;
    window.scrollTo(0, this.lockedScrollY);

    this.previousDocumentOverflow = '';
    this.lockedScrollY = 0;
    this.isBodyScrollLocked = false;
  }

  private getSearchTokens(values: string[]) {
    return values
      .join(' ')
      .split(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/)
      .map(value => this.normalizeSearch(value))
      .filter(Boolean);
  }

  private normalizeSearch(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private t(key: string) {
    const value = this.translate.instant(key);
    return typeof value === 'string' ? value : key;
  }

  private async initPumpjackScene() {
    const canvas = this.pumpjackCanvas?.nativeElement;
    const container = canvas?.parentElement;

    if (!canvas || !container) {
      return;
    }

    const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js')
    ]);

    this.three = THREE;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(4.4, 2.1, 5.2);

    let renderer: ThreeNamespace.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
    } catch (error) {
      container.classList.add('catalog-hero-model--webgl-unavailable');
      console.warn('No se pudo iniciar WebGL para el modelo pumpjack.glb', error);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const controls = new OrbitControls(camera, canvas);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.65;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.8;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;

    scene.add(new THREE.HemisphereLight(0xf4ffe0, 0x122014, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbef264, 2.4);
    rimLight.position.set(-4, 2.5, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x86efac, 18, 8);
    fillLight.position.set(0, 1.6, 3.5);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    loader.load(
      this.pumpjackModelUrl,
      gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              material.side = THREE.DoubleSide;
              material.needsUpdate = true;

              if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
                material.metalness = Math.min(material.metalness, 0.45);
                material.roughness = Math.max(material.roughness, 0.38);
              }
            });
          }
        });

        scene.add(model);
        this.framePumpjackModel(model, camera, controls);
      },
      undefined,
      error => {
        console.warn('No se pudo cargar el modelo pumpjack.glb', error);
      }
    );

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    this.pumpjackResizeObserver = new ResizeObserver(resize);
    this.pumpjackResizeObserver.observe(container);

    const animate = () => {
      this.pumpjackAnimationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    this.pumpjackScene = scene;
    this.pumpjackCamera = camera;
    this.pumpjackRenderer = renderer;
    this.pumpjackControls = controls;
  }

  private framePumpjackModel(
    model: ThreeNamespace.Object3D,
    camera: ThreeNamespace.PerspectiveCamera,
    controls: OrbitControlsType
  ) {
    const THREE = this.three;

    if (!THREE) {
      return;
    }

    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxInitialDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);

    if (maxInitialDimension > 0) {
      model.scale.setScalar(3.6 / maxInitialDimension);
    }

    const fittedBox = new THREE.Box3().setFromObject(model);
    const center = fittedBox.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const groundedBox = new THREE.Box3().setFromObject(model);
    model.position.y -= groundedBox.min.y;
    model.rotation.y = -Math.PI * 0.18;

    const finalBox = new THREE.Box3().setFromObject(model);
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const radius = Math.max(finalSize.x, finalSize.y, finalSize.z) * 0.58;

    controls.target.copy(finalCenter);
    controls.target.y += finalSize.y * 0.12;
    controls.minDistance = Math.max(radius * 1.2, 2.6);
    controls.maxDistance = Math.max(radius * 2.9, 6.5);
    camera.position.set(
      finalCenter.x + radius * 1.35,
      finalCenter.y + radius * 0.72,
      finalCenter.z + radius * 1.55
    );
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
  }

  private destroyPumpjackScene() {
    const THREE = this.three;

    if (this.pumpjackAnimationFrame) {
      window.cancelAnimationFrame(this.pumpjackAnimationFrame);
    }

    this.pumpjackResizeObserver?.disconnect();
    this.pumpjackControls?.dispose();
    this.pumpjackRenderer?.dispose();

    this.pumpjackScene?.traverse(object => {
      if (THREE && object instanceof THREE.Mesh) {
        object.geometry?.dispose();

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}
