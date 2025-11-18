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

function safeSnippet(obj: any, max = 1000) {
  try {
    const s = JSON.stringify(obj);
    return s.length > max ? s.slice(0, max) + '... (truncated)' : s;
  } catch {
    return String(obj).slice(0, max);
  }
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  const trimmed = (orderNumber ?? '').toString().trim();
  try {
    const apiRoot = getApiRoot();
    console.log('Using CT projectKey (diagnostic):', (apiRoot as any)?.projectKey ?? 'commercekey');

    const safeOrderNumber = trimmed.replace(/"/g, '\\"');
    const where = `orderNumber="${safeOrderNumber}"`;

    console.log('Searching orders with where clause:', where);

    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where,
          limit: 1,
        },
      })
      .execute();

    // diagnostic: show status and small snippet of body
    console.log('CT response status:', response?.statusCode ?? response?.status ?? 'success');
    console.log('CT response body (snippet):', safeSnippet(response?.body ?? response));

    const results = response?.body?.results ?? [];
    console.log('CT search results length:', Array.isArray(results) ? results.length : 'unknown result lenth');

    if (!Array.isArray(results) || results.length === 0) {
      console.log(`Order not found for orderNumber=${trimmed}`);
      return null;
    }

    console.log('Order found: id=', results[0].id, 'orderNumber=', results[0].orderNumber);
    return results[0] as Order;
  } catch (error: any) {
    console.log('Error fetching order (diagnostic):', error?.message ?? error);
    if (error?.response?.body) {
      console.log('Error response body snippet:', safeSnippet(error.response.body));
    }
    return null;
  }
}


export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
  const order = await getOrderByOrderNumber(orderNumber);
  return order?.id ?? null;
}
