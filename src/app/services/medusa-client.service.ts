import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface CacheEntry<T> {
  observable$: Observable<T>;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000; // se alinea con el Cache-Control (max-age=60) del backend

/**
 * Wrapper delgado sobre HttpClient para hablar con el Store API de Medusa.
 * No se usa @medusajs/js-sdk: solo se necesitan 3 endpoints de lectura +
 * 1 POST, no toda la gestión de sesión de carrito que trae el SDK.
 *
 * Los GET se cachean en memoria (por URL+params) con TTL:
 * - Evita volver a pegarle a Medusa por datos que ya se pidieron hace poco
 *   (catálogo, regiones, fichas técnicas cambian poco).
 * - `shareReplay(1)` además deduplica llamadas concurrentes: si dos
 *   componentes piden lo mismo al mismo tiempo, solo sale 1 request HTTP.
 */
@Injectable({ providedIn: 'root' })
export class MedusaClientService {
  private readonly baseUrl = environment.medusaBackendUrl;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(private http: HttpClient) {}

  /**
   * @param cache Si es `false`, se salta la caché (para datos que deban
   * leerse siempre frescos). Por defecto `true`.
   * @param ttlMs Tiempo de vida de la entrada en caché, en milisegundos.
   */
  get<T>(
    path: string,
    params?: Record<string, string | string[]>,
    options?: { cache?: boolean; ttlMs?: number }
  ): Observable<T> {
    const cacheEnabled = options?.cache ?? true;
    const key = this.buildCacheKey(path, params);

    if (cacheEnabled) {
      const cached = this.cache.get(key) as CacheEntry<T> | undefined;
      if (cached && cached.expiresAt > Date.now()) {
        return cached.observable$;
      }
    }

    const request$ = this.http
      .get<T>(`${this.baseUrl}${path}`, {
        headers: this.headers(),
        params: this.toHttpParams(params),
      })
      .pipe(
        // Si falla, no se cachea el error: se saca la entrada de la caché
        // para que el próximo intento vuelva a golpear la red en vez de
        // quedar repitiendo el mismo fallo durante todo el TTL.
        catchError(err => {
          this.cache.delete(key);
          return throwError(() => err);
        }),
        // refCount: false -> aunque el request original ya haya completado,
        // un suscriptor nuevo dentro del TTL igual recibe la última respuesta
        // cacheada sin disparar una petición nueva.
        shareReplay({ bufferSize: 1, refCount: false })
      );

    if (cacheEnabled) {
      this.cache.set(key, {
        observable$: request$,
        expiresAt: Date.now() + (options?.ttlMs ?? DEFAULT_TTL_MS),
      });
    }

    return request$;
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.headers(),
    });
  }

  /** Invalida toda la caché en memoria (o solo las entradas de un path). */
  clearCache(path?: string) {
    if (!path) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${path}?`) || key === path) {
        this.cache.delete(key);
      }
    }
  }

  private headers() {
    return { 'x-publishable-api-key': environment.medusaPublishableKey };
  }

  private buildCacheKey(path: string, params?: Record<string, string | string[]>): string {
    if (!params) return path;
    const normalized = Object.keys(params)
      .sort()
      .map(k => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`)
      .join('&');
    return `${path}?${normalized}`;
  }

  private toHttpParams(params?: Record<string, string | string[]>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach(v => (httpParams = httpParams.append(`${key}[]`, v)));
      } else {
        httpParams = httpParams.set(key, value);
      }
    }
    return httpParams;
  }
}
