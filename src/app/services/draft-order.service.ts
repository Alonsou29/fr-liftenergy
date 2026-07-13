import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MedusaClientService } from './medusa-client.service';

export interface CreateDraftOrderInput {
  email: string;
  regionId: string;
  variantId: string;
  quantity: number;
  notes?: string;
}

export interface DraftOrderSummary {
  id: string;
  displayId: number;
  email: string;
  total: number;
  currencyCode: string;
}

interface StoreDraftOrderResponse {
  draft_order: {
    id: string;
    display_id: number;
    email: string;
    total: number;
    currency_code: string;
  };
}

// Cotización de un solo producto (sin carrito, sin dirección): el catálogo
// dispara esto al confirmar el modal de "Solicitar información".
@Injectable({ providedIn: 'root' })
export class DraftOrderService {
  constructor(private client: MedusaClientService) {}

  createDraftOrder(input: CreateDraftOrderInput): Observable<DraftOrderSummary> {
    const body = {
      email: input.email,
      region_id: input.regionId,
      items: [{ variant_id: input.variantId, quantity: input.quantity }],
      metadata: {
        source: 'angular-storefront',
        notes: input.notes ?? '',
      },
    };

    return this.client
      .post<StoreDraftOrderResponse>('/store/draft-orders', body)
      .pipe(
        map(res => ({
          id: res.draft_order.id,
          displayId: res.draft_order.display_id,
          email: res.draft_order.email,
          total: res.draft_order.total,
          currencyCode: res.draft_order.currency_code,
        }))
      );
  }
}
