import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Wrapper delgado sobre HttpClient para hablar con el Store API de Medusa.
 * No se usa @medusajs/js-sdk: solo se necesitan 3 endpoints de lectura +
 * 1 POST, no toda la gestión de sesión de carrito que trae el SDK.
 */
@Injectable({ providedIn: 'root' })
export class MedusaClientService {
  private readonly baseUrl = environment.medusaBackendUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string | string[]>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      params: this.toHttpParams(params),
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.headers(),
    });
  }

  private headers() {
    return { 'x-publishable-api-key': environment.medusaPublishableKey };
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
