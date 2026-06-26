/** Order search — shared types and the data-access boundary. */
import type { Observable } from 'rxjs';

export const ORDER_STATUSES = ['paid', 'preparing', 'pending', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SORTS = ['date-desc', 'date-asc', 'total-desc', 'total-asc'] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export interface OrderItem {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  location: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  customer: string;
}

export interface OrderPage {
  items: Order[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: OrderSort;
}

export interface OrderQuery {
  page: number;
  pageSize: number;
  sort: OrderSort;
  q?: string;
  status?: OrderStatus;
  location?: string;
}

export type OrderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; page: OrderPage }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export const ORDERS = {
  /** API endpoint: GET /api/orders?page&pageSize&q&sort&status&location — do not change. */
  ENDPOINT: '/api/orders',
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_SORT: 'date-desc',
  DEBOUNCE_MS: 300,
} as const;

/** Data-access boundary — do not change the API contract. */
export abstract class OrderApi {
  abstract list(query: OrderQuery): Observable<OrderPage>;
}
