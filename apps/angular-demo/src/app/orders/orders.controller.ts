/**
 * Orders controller — drives the order search query, paging, and view state.
 *
 * KNOWN BUG (workshop task — JIRA-0410): a request fires on every keystroke (no debounce) and
 * a slow earlier response can overwrite a newer one (mergeMap keeps every request in flight),
 * so the list storms the API and flickers with out-of-order results.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, of, type Observable } from 'rxjs';
import { catchError, map, mergeMap, startWith } from 'rxjs/operators';
import { OrderApi, ORDERS, type OrderQuery, type OrderSort, type OrderState, type OrderStatus } from './orders.types';

@Injectable()
export class OrdersController {
  private readonly state = new BehaviorSubject<OrderState>({ status: 'idle' });
  readonly state$: Observable<OrderState> = this.state.asObservable();

  private query: OrderQuery = {
    page: ORDERS.DEFAULT_PAGE,
    pageSize: ORDERS.DEFAULT_PAGE_SIZE,
    sort: ORDERS.DEFAULT_SORT,
  };

  private readonly trigger = new Subject<OrderQuery>();

  constructor(private readonly api: OrderApi) {}

  init(): void {
    // BUG: no debounce, and mergeMap lets every in-flight request resolve — a slow earlier
    // response can overwrite a newer one.
    this.trigger.pipe(mergeMap((query) => this.load(query))).subscribe((next) => this.state.next(next));
    this.run();
  }

  setQuery(q: string): void {
    this.query = { ...this.query, q: q.trim() || undefined, page: ORDERS.DEFAULT_PAGE };
    this.run();
  }

  setPage(page: number): void {
    this.query = { ...this.query, page };
    this.run();
  }

  setStatus(status: OrderStatus | undefined): void {
    this.query = { ...this.query, status, page: ORDERS.DEFAULT_PAGE };
    this.run();
  }

  setSort(sort: OrderSort): void {
    this.query = { ...this.query, sort, page: ORDERS.DEFAULT_PAGE };
    this.run();
  }

  private run(): void {
    this.trigger.next({ ...this.query });
  }

  private load(query: OrderQuery): Observable<OrderState> {
    return this.api.list(query).pipe(
      map((page): OrderState => (page.items.length ? { status: 'results', page } : { status: 'empty' })),
      startWith<OrderState>({ status: 'loading' }),
      catchError((err: unknown): Observable<OrderState> => of({ status: 'error', message: messageOf(err) })),
    );
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Failed to load orders.';
}
