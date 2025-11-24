// services/order-service.ts
import type { Order } from '@commercetools/platform-sdk';
import { getApiRoot } from '../utils/ct-client.js';

function safeSnippet(obj: any, max = 1000) {
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
    return s.length > max ? s.slice(0, max) + '... (truncated)' : s;
  } catch {
    return String(obj).slice(0, max);
  }
}

/**
 * findOrder: Attempts several strategies to find an Order resource.
 * Strategies (in order):
 *  1) orders().withOrderNumber({ orderNumber }).get().execute()
 *  2) orders().get({ queryArgs: { where: `orderNumber="X"` } })
 *  3) orders().get({ queryArgs: { where: `paymentInfo(payments(id="PAY"))` } }) when paymentId provided
 *  4) optional: orders.search (index-based) if useSearch=true and SDK supports it
 *
 * Returns Order | null
 */
export async function findOrder({
  orderNumber,
  paymentId,
  useSearch = false,
}: {
  orderNumber?: string;
  paymentId?: string;
  useSearch?: boolean;
}): Promise<Order | null> {
  const trimmedOrderNumber = (orderNumber ?? '').toString().trim();
  const apiRoot = getApiRoot();

  // 1) Direct endpoint: withOrderNumber
  if (trimmedOrderNumber) {
    try {
      const resp = await apiRoot.orders().withOrderNumber({ orderNumber: trimmedOrderNumber }).get().execute();
      console.log('[CT] withOrderNumber status:', (resp as any)?.statusCode ?? '(unknown)');
      console.log('[CT] withOrderNumber body snippet:', safeSnippet(resp?.body, 1500));
      const order = resp?.body as Order | undefined;
      if (order?.id) return order;
    } catch (err: any) {
      const status = err?.statusCode ?? err?.response?.statusCode ?? (err?.response && err.response.status);
      console.warn('[CT] withOrderNumber error status:', status);
      if (status !== 404) {
        console.warn('[CT] withOrderNumber error:', err?.message ?? safeSnippet(err?.response?.body ?? err));
      } else {
        console.log(`[CT] withOrderNumber: order not found (${trimmedOrderNumber})`);
      }
      // continue to fallback
    }

    // 2) Fallback: where query on orderNumber
    try {
      const q = await apiRoot.orders().get({
        queryArgs: { where: `orderNumber="${trimmedOrderNumber}"`, limit: '1' },
      }).execute();

      console.log('[CT] where query status:', (q as any)?.statusCode ?? '(unknown)');
      console.log('[CT] where query body snippet:', safeSnippet(q?.body, 1500));
      const found = q?.body?.results?.[0];
      if (found?.id) return found as Order;
    } catch (qerr: any) {
      console.error('[CT] where query error:', safeSnippet(qerr?.response?.body ?? qerr?.message ?? qerr));
    }
  }

  // 3) If paymentId provided, search orders referencing that payment
  if (paymentId) {
    try {
      const q2 = await apiRoot.orders().get({
        queryArgs: { where: `paymentInfo(payments(id="${paymentId}"))`, limit: '1' },
      }).execute();

      console.log('[CT] paymentId where status:', (q2 as any)?.statusCode ?? '(unknown)');
      console.log('[CT] paymentId where body snippet:', safeSnippet(q2?.body, 1500));
      const f = q2?.body?.results?.[0];
      if (f?.id) return f as Order;
    } catch (perr: any) {
      console.error('[CT] paymentId query error:', safeSnippet(perr?.response?.body ?? perr?.message ?? perr));
    }
  }

  // 4) Optional: Order search (index-based) - may not be available/usable in some projects
  if (useSearch && trimmedOrderNumber) {
    try {
      // The SDK might provide .orders().search() — if not, you can use raw HTTP path with apiRoot.client.
      const sresp = await (apiRoot as any).orders().search({ queryArgs: { text: trimmedOrderNumber, limit: '1' } }).execute();
      console.log('[CT] search status:', (sresp as any)?.statusCode ?? '(unknown)');
      console.log('[CT] search body snippet:', safeSnippet(sresp?.body, 1500));
      const ids = sresp?.body?.results?.map((r: any) => r?.id).filter(Boolean);
      if (ids?.length) {
        const getResp = await apiRoot.orders().withId({ ID: ids[0] }).get().execute();
        if (getResp?.body?.id) return getResp.body as Order;
      }
    } catch (serr: any) {
      console.warn('[CT] order search error (may not be supported):', safeSnippet(serr?.response?.body ?? serr?.message ?? serr));
    }
  }

  console.info('[CT] No order found using the configured strategies');
  return null;
}

export async function getOrderIdFromOrderNumber(orderNumber?: string): Promise<string | null> {
  const order = await findOrder({ orderNumber });
  return order?.id ?? null;
}
