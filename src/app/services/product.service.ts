import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { MedusaClientService } from './medusa-client.service';

export type CatalogCategory = 'rtu' | 'accessories' | 'drives';

export interface CatalogSpec {
  label: string;
  value: string;
}

/** Producto ya resuelto, listo para el template del catálogo (develop). */
export interface CatalogProduct {
  id: string;
  variantId: string;
  category: CatalogCategory;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  highlights: string[];
  specs: CatalogSpec[];
  applications: string[];
  related?: string[];
  datasheetUrl?: string;
}

interface MedusaProductMetadata {
  code?: string;
  highlights?: string[];
  applications?: string[];
  specs?: CatalogSpec[];
  related?: string[];
}

interface MedusaProduct {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  metadata: MedusaProductMetadata | null;
  categories?: { id: string; name: string }[];
  images?: { url: string }[];
  variants?: { id: string }[];
}

interface StoreProductsResponse {
  products: MedusaProduct[];
}

interface StoreRegionsResponse {
  regions: { id: string; currency_code: string }[];
}

interface StoreProductAttachment {
  product_id: string;
  type: string;
  file_url: string;
}

interface StoreProductAttachmentsResponse {
  attachments: StoreProductAttachment[];
}

const CATEGORY_NAME_MAP: Record<string, CatalogCategory> = {
  RTU: 'rtu',
  Accessories: 'accessories',
  Drives: 'drives',
};

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private client: MedusaClientService) {}

  // El backend puede tener otras regiones (ej. la demo de Medusa en EUR),
  // así que se busca explícitamente la región en USD del catálogo Lift
  // Energy en vez de asumir que es la primera de la lista.
  getRegionId(): Observable<string> {
    return this.client
      // Las regiones casi no cambian: TTL de caché más largo que el del
      // catálogo (que sí puede tener productos nuevos con más frecuencia).
      .get<StoreRegionsResponse>('/store/regions', undefined, { ttlMs: 5 * 60_000 })
      .pipe(map(res => {
        const region = res.regions.find(r => r.currency_code === 'usd') ?? res.regions[0];
        return region?.id ?? '';
      }));
  }

  /**
   * Catálogo completo con fichas técnicas ya mezcladas (datasheetUrl).
   * No depende de resolver la región primero: este catálogo no muestra
   * precio, así que no hace falta esperar /store/regions antes de pedir
   * /store/products -- ambas llamadas (productos y fichas técnicas) salen
   * en paralelo desde el primer momento, evitando un round-trip secuencial
   * extra en la carga inicial.
   */
  getCatalog(): Observable<CatalogProduct[]> {
    return forkJoin({
      products: this.getProducts(),
      datasheets: this.getDatasheets(),
    }).pipe(
      map(({ products, datasheets }) =>
        products.map(product => ({
          ...product,
          datasheetUrl: datasheets[product.id],
        }))
      )
    );
  }

  private getProducts(): Observable<CatalogProduct[]> {
    return this.client
      .get<StoreProductsResponse>('/store/products', {
        limit: '100',
        fields: 'variants.id,+metadata,*categories,*images',
      })
      .pipe(map(res => res.products.map(product => this.toProduct(product))));
  }

  private getDatasheets(): Observable<Record<string, string>> {
    return this.client
      .get<StoreProductAttachmentsResponse>('/store/product-attachments', { type: 'datasheet' })
      .pipe(
        map(res => Object.fromEntries(res.attachments.map(a => [a.product_id, a.file_url]))),
        // Sin fichas descargables no bloquea el catálogo: solo no se muestra el botón.
        catchError(() => of({} as Record<string, string>))
      );
  }

  private toProduct(raw: MedusaProduct): CatalogProduct {
    const metadata = raw.metadata ?? {};
    const variant = raw.variants?.[0];
    const categoryName = raw.categories?.[0]?.name ?? '';

    return {
      id: raw.id,
      variantId: variant?.id ?? '',
      category: CATEGORY_NAME_MAP[categoryName] ?? 'rtu',
      code: metadata.code ?? '',
      name: raw.title,
      subtitle: raw.subtitle ?? '',
      description: raw.description ?? '',
      image: raw.images?.[0]?.url ?? '',
      highlights: metadata.highlights ?? [],
      applications: metadata.applications ?? [],
      specs: metadata.specs ?? [],
      related: metadata.related ?? [],
    };
  }
}
