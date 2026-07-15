import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type * as ThreeNamespace from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';
import { CatalogCategory, CatalogProduct, CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly whatsappPhoneNumber = '17867251404';
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
    private catalogService: CatalogService
  ) {}

  searchTerm = '';
  selectedCategory: CatalogCategory | 'all' = 'all';
  selectedProduct: CatalogProduct | null = null;
  isProductImageZoomed = false;
  productImageLensLeft = 0;
  productImageLensTop = 0;
  productImageLensImageWidth = 0;
  productImageLensImageHeight = 0;
  productImageLensImageLeft = 0;
  productImageLensImageTop = 0;
  private readonly productImageLensRadius = 72;
  private readonly productImageLensZoom = 2.8;

  isLoadingProducts = true;
  catalogLoadError = false;

  ngOnInit() {
    this.catalogService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('No se pudo cargar el catálogo desde Strapi', error);
        this.isLoadingProducts = false;
        this.catalogLoadError = true;
      }
    });
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

  readonly categories: { id: CatalogCategory | 'all'; labelKey: string; filterLabelKey: string }[] = [
    {
      id: 'all',
      labelKey: 'CATALOG.CATEGORIES.ALL',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_ALL'
    },
    {
      id: 'rtu',
      labelKey: 'CATALOG.CATEGORIES.RTU',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_RTU'
    },
    {
      id: 'accessories',
      labelKey: 'CATALOG.CATEGORIES.ACCESSORIES',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_ACCESSORIES'
    },
    /* Variadores ocultos temporalmente hasta contar con información técnica real.
    {
      id: 'drives',
      labelKey: 'CATALOG.CATEGORIES.DRIVES',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_DRIVES'
    }, */
    {
      id: 'cameras',
      labelKey: 'CATALOG.CATEGORIES.CAMERAS',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_CAMERAS'
    },
    {
      id: 'flow',
      labelKey: 'CATALOG.CATEGORIES.FLOW',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_FLOW'
    },
    {
      id: 'temperature',
      labelKey: 'CATALOG.CATEGORIES.TEMPERATURE',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_TEMPERATURE'
    },
    {
      id: 'pressure',
      labelKey: 'CATALOG.CATEGORIES.PRESSURE',
      filterLabelKey: 'CATALOG.CATEGORIES.FILTER_PRESSURE'
    }
  ];

  products: CatalogProduct[] = [];

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

  getCategoryLabelKey(category: CatalogCategory) {
    const labels: Record<CatalogCategory, string> = {
      rtu: 'CATALOG.CATEGORIES.RTU',
      accessories: 'CATALOG.CATEGORIES.ACCESSORIES',
      drives: 'CATALOG.CATEGORIES.DRIVES',
      cameras: 'CATALOG.CATEGORIES.CAMERAS',
      flow: 'CATALOG.CATEGORIES.FLOW',
      temperature: 'CATALOG.CATEGORIES.TEMPERATURE',
      pressure: 'CATALOG.CATEGORIES.PRESSURE'
    };

    return labels[category];
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
    this.selectedCategory = 'all';
    this.closeDetails();
  }

  openDetails(product: CatalogProduct) {
    this.resetProductImageZoom();
    this.selectedProduct = product;
    this.lockBodyScroll();
  }

  closeDetails() {
    this.resetProductImageZoom();
    this.selectedProduct = null;
    this.unlockBodyScroll();
  }

  onProductImagePointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && !this.isProductImageZoomed) {
      return;
    }

    if (event.pointerType === 'touch') {
      event.preventDefault();
    }

    this.updateProductImageLens(event.currentTarget as HTMLElement, event.clientX, event.clientY);
    this.isProductImageZoomed = true;
  }

  onProductImagePointerLeave(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      this.resetProductImageZoom();
    }
  }

  onProductImagePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return;
    }

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateProductImageLens(event.currentTarget as HTMLElement, event.clientX, event.clientY);
    this.isProductImageZoomed = true;
  }

  onProductImagePointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      this.resetProductImageZoom();
    }
  }

  toggleProductImageZoom(event: Event) {
    if (this.isProductImageZoomed) {
      this.resetProductImageZoom();
      return;
    }

    const container = event.currentTarget as HTMLElement;
    const bounds = container.getBoundingClientRect();
    this.updateProductImageLens(container, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    this.isProductImageZoomed = true;
  }

  @HostListener('document:keydown.escape')
  closeDetailsWithEscape() {
    this.closeDetails();
  }

  requestInfo(product?: CatalogProduct) {
    const subject = product
      ? `${product.code} - ${product.name}`
      : this.activeCategoryLabel || this.t('CATALOG.WHATSAPP.GENERIC_SUBJECT');
    const message = `${this.t('CATALOG.WHATSAPP.GREETING')}\n\n${this.t('CATALOG.WHATSAPP.SUBJECT')}: ${subject}\n${this.t('CATALOG.WHATSAPP.NOTE')}`;
    const whatsappUrl = `https://wa.me/${this.whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private updateProductImageLens(container: HTMLElement, clientX: number, clientY: number) {
    const containerBounds = container.getBoundingClientRect();
    const image = container.querySelector<HTMLImageElement>('.catalog-modal-visual__image');

    if (!image?.naturalWidth || !image.naturalHeight) {
      return;
    }

    const radius = Math.min(this.productImageLensRadius, containerBounds.width / 2, containerBounds.height / 2);
    const localX = clientX - containerBounds.left;
    const localY = clientY - containerBounds.top;
    this.productImageLensLeft = Math.min(containerBounds.width - radius, Math.max(radius, localX));
    this.productImageLensTop = Math.min(containerBounds.height - radius, Math.max(radius, localY));

    const imageBounds = image.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = imageBounds.width / imageBounds.height;
    let renderedWidth = imageBounds.width;
    let renderedHeight = imageBounds.height;
    let renderedLeft = imageBounds.left;
    let renderedTop = imageBounds.top;

    if (boxRatio > naturalRatio) {
      renderedWidth = renderedHeight * naturalRatio;
      renderedLeft += (imageBounds.width - renderedWidth) / 2;
    } else {
      renderedHeight = renderedWidth / naturalRatio;
      renderedTop += (imageBounds.height - renderedHeight) / 2;
    }

    const focusX = Math.min(renderedWidth, Math.max(0, clientX - renderedLeft));
    const focusY = Math.min(renderedHeight, Math.max(0, clientY - renderedTop));
    this.productImageLensImageWidth = renderedWidth * this.productImageLensZoom;
    this.productImageLensImageHeight = renderedHeight * this.productImageLensZoom;
    this.productImageLensImageLeft = radius - focusX * this.productImageLensZoom;
    this.productImageLensImageTop = radius - focusY * this.productImageLensZoom;
  }

  private resetProductImageZoom() {
    this.isProductImageZoomed = false;
  }

  private productMatchesSearch(product: CatalogProduct, search: string) {
    const primaryTokens = this.getSearchTokens([
      product.code,
      product.name,
      product.subtitle,
      product.description,
      this.t(this.getCategoryLabelKey(product.category)),
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
