//  import { getApiRoot } from '../utils/ct-client';
// import { Order } from '@commercetools/platform-sdk';

// export async function getOrderByOrderNumber(orderNumber: string): Promise<any | null> {
//   try {
//     // Lazy import to prevent bundler from resolving SDK during build
//     const { getApiRoot } = await import('../utils/ct-client.js');
//     const apiRoot = getApiRoot();

//     const response = await apiRoot
//       .orders()
//       .withOrderNumber({ orderNumber })
//       .get()
//       .execute();

//     return response.body;
//   } catch (error: any) {
//     // Optional: handle specific 404 cases
//     if (error?.statusCode === 404) return null;
//     console.error('Error fetching order:', error);
//     return null;
//   }
// }

// export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
//   const order = await getOrderByOrderNumber(orderNumber);
//   return order?.id ?? null;
// }
// src/services/order-service.ts (or your current file)


import type { Order } from '@commercetools/platform-sdk';
import { getApiRoot } from '../utils/ct-client.js';

/**
 * Safe snippet to avoid massive logs
 */
function safeSnippet(obj: any, max = 1000) {
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
    return s.length > max ? s.slice(0, max) + '... (truncated)' : s;
  } catch {
    return String(obj).slice(0, max);
  }
}

/**
 * Fetch order by orderNumber using withOrderNumber. Returns Order or null.
 * - trims and sanitizes input
 * - returns null when not found or on expected errors
 * - logs useful diagnostics
 */
export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  const trimmed = (orderNumber ?? '').toString().trim();
  if (!trimmed) {
    console.log('getOrderByOrderNumber: empty orderNumber provided');
    return null;
  }

  try {
    const { getApiRoot } = await import('../utils/ct-client.js');
    const apiRoot = getApiRoot();
    console.log('Using CT projectKey (diagnostic):', (apiRoot as any)?.projectKey ?? '(unknown)');

    // Use withOrderNumber route which returns the order object (or a 404)
    const response = await apiRoot
      .orders()
      .withOrderNumber({ orderNumber: trimmed })
      .get()
      .execute();

    console.log('HTTP status:', (response as any).statusCode ?? (response as any).status ?? '(unknown)');
    console.log('Order fetched snippet:', safeSnippet(response?.body, 1500));

    const order = response?.body as Order | undefined;
    if (!order) {
      console.log('Order fetch returned no body (unexpected).');
      return null;
    }

    return order;
  } catch (err: any) {
    // SDK often throws for 404 (not found) — treat as null 
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      console.log('Order not found for orderNumber:', trimmed);
      return null;
    }

    console.log('Error fetching order (withOrderNumber):', err?.message ?? err);
    if (err?.response?.body) console.log('Error body snippet:', safeSnippet(err.response.body));
    return null;
  }
}

/**
 * Return the order.id for the given orderNumber, or null when not found.
 */
export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
  const order = await getOrderByOrderNumber(orderNumber);
  return order?.id ?? null;
}

/**
 * Extract payment reference ids from an Order (if any).
 * Returns an array of payment ids (may be empty).
 *
 * The order shape contains payment info under order.paymentInfo.payments (array of References).
 * Each reference usually has an `id` field with the payment id.
 */
export function getPaymentIdsFromOrder(order: Order | null): string[] {
  if (!order) return [];
  // defensive access
  const payments = (order as any)?.paymentInfo?.payments;
  if (!Array.isArray(payments) || payments.length === 0) return [];
  // references are usually like { typeId: 'payment', id: '...' } or { id: '...' }
  return payments
    .map((p: any) => p?.id ?? (p?.obj?.id ?? undefined))
    .filter((id: string | undefined): id is string => typeof id === 'string');
}

/**
 * Given an orderNumber, return the commercetools payment ids attached to that order.
 * Optionally fetch the full payment objects if `fetchPayments` is true.
 */
export async function getPaymentsForOrderNumber(orderNumber: string, fetchPayments = false) {
  const order = await getOrderByOrderNumber(orderNumber);
  if (!order) {
    console.log('No order found for', orderNumber);
    return { order: null, paymentIds: [], payments: [] as any[] };
  }

  const paymentIds = getPaymentIdsFromOrder(order);
  console.log('Payment reference ids on order:', paymentIds);

  if (!fetchPayments || paymentIds.length === 0) {
    return { order, paymentIds, payments: [] as any[] };
  }

  // fetch each payment object individually (no expand usage, safe approach)
  const { getApiRoot } = await import('../utils/ct-client.js');
  const apiRoot = getApiRoot();
  const payments: any[] = [];

  for (const pid of paymentIds) {
    try {
      const resp = await apiRoot.payments().withId({ ID: pid }).get().execute();
      payments.push(resp?.body ?? null);
    } catch (err: any) {
      console.log('Error fetching payment id', pid, '->', err?.message ?? err);
      payments.push(null);
    }
  }

  return { order, paymentIds, payments };
}

