/**
 * Order-search tests. RED on the shipped (buggy) controller and GREEN once input is debounced and
 * stale responses are cancelled.
 */
import { fakeAsync, tick } from '@angular/core/testing';
import { of, type Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { OrdersController } from './orders.controller';
import { OrderApi, ORDERS, type OrderQuery, type Order, type OrderPage, type OrderState } from './orders.types';

function order(id: string): Order {
  return { id, location: 'centro', createdAt: '2026-06-24', status: 'paid', items: [], total: 100, customer: 'Ana' };
}

function makePage(items: Order[], page: number): OrderPage {
  return { items, page, pageSize: 10, total: items.length, totalPages: 3, sort: 'date-desc' };
}

class FakeApi extends OrderApi {
  readonly calls: OrderQuery[] = [];
  readonly delays = new Map<string, number>();
  list(query: OrderQuery): Observable<OrderPage> {
    this.calls.push({ ...query });
    const ms = this.delays.get(query.q ?? '') ?? 0;
    return of(makePage([order(query.q ?? 'init')], query.page)).pipe(delay(ms));
  }
}

function latest(controller: OrdersController): OrderState {
  let state: OrderState = { status: 'idle' };
  controller.state$.subscribe((s) => (state = s));
  return state;
}

describe('OrdersController search', () => {
  it('debounces rapid input into a single request for the final query', fakeAsync(() => {
    const api = new FakeApi();
    const controller = new OrdersController(api);
    controller.init();
    tick(ORDERS.DEBOUNCE_MS);
    const before = api.calls.length;

    controller.setQuery('a');
    controller.setQuery('as');
    controller.setQuery('asa');
    controller.setQuery('asada');
    tick(ORDERS.DEBOUNCE_MS);

    const after = api.calls.slice(before);
    expect(after.length).toBe(1);
    expect(after[0].q).toBe('asada');
  }));

  it('never lets a stale (slower, older) response overwrite a newer one', fakeAsync(() => {
    const api = new FakeApi();
    api.delays.set('slow', 50);
    api.delays.set('fast', 10);
    const controller = new OrdersController(api);
    controller.init();
    tick(ORDERS.DEBOUNCE_MS);

    controller.setQuery('slow');
    controller.setQuery('fast');
    tick(ORDERS.DEBOUNCE_MS + 100);

    const state = latest(controller);
    expect(state.status).toBe('results');
    if (state.status === 'results') expect(state.page.items[0].id).toBe('fast');
  }));
});
