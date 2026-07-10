import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MedusaClientService } from './medusa-client.service';
import { CartItem } from './cart.service';

export interface ShippingAddressInput {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code: string;
}

export interface CreateDraftOrderInput {
  email: string;
  regionId: string;
  shippingAddress: ShippingAddressInput;
  items: CartItem[];
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

@Injectable({ providedIn: 'root' })
export class DraftOrderService {
  constructor(private client: MedusaClientService) {}

  createDraftOrder(input: CreateDraftOrderInput): Observable<DraftOrderSummary> {
    const body = {
      email: input.email,
      region_id: input.regionId,
      shipping_address: input.shippingAddress,
      items: input.items.map(item => ({
        variant_id: item.variantId,
        quantity: item.quantity,
      })),
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
