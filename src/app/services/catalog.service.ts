import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export type CatalogCategory = 'rtu' | 'accessories' | 'drives' | 'cameras' | 'flow' | 'temperature' | 'pressure';

export interface CatalogSpec {
  label: string;
  value: string;
}

export interface CatalogProduct {
  id: string;
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

interface StrapiMedia {
  url: string;
}

interface StrapiBulletItem {
  text: string;
}

interface StrapiCategory {
  key: CatalogCategory;
}

interface StrapiRelatedProduct {
  name: string;
}

interface StrapiProduct {
  documentId: string;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  image: StrapiMedia | null;
  datasheet: StrapiMedia | null;
  highlights: StrapiBulletItem[];
  specs: CatalogSpec[];
  applications: StrapiBulletItem[];
  category: StrapiCategory | null;
  related_products: StrapiRelatedProduct[];
}

interface StrapiListResponse<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly apiUrl = `${environment.strapiApiUrl}/api/products`;
  private products$?: Observable<CatalogProduct[]>;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<CatalogProduct[]> {
    if (!this.products$) {
      this.products$ = this.http
        .get<StrapiListResponse<StrapiProduct>>(this.apiUrl, {
          params: {
            locale: 'es',
            'sort': 'code:asc',
            'pagination[pageSize]': '100',
            'populate': '*'
          }
        })
        .pipe(
          map((response) => response.data.map((product) => this.toCatalogProduct(product))),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }

    return this.products$;
  }

  private toCatalogProduct(product: StrapiProduct): CatalogProduct {
    const related = product.related_products?.map((item) => item.name) ?? [];

    return {
      id: product.documentId,
      category: product.category?.key ?? 'rtu',
      code: product.code,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      image: this.resolveMediaUrl(product.image?.url),
      highlights: product.highlights?.map((item) => item.text) ?? [],
      specs: product.specs ?? [],
      applications: product.applications?.map((item) => item.text) ?? [],
      related: related.length > 0 ? related : undefined,
      datasheetUrl: this.resolveMediaUrl(product.datasheet?.url) || undefined
    };
  }

  private resolveMediaUrl(url?: string | null): string {
    if (!url) {
      return '';
    }

    return url.startsWith('/') ? `${environment.strapiApiUrl}${url}` : url;
  }
}
