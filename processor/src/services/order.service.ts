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

export async function getOrderByOrderNumber(orderNumber: string): Promise<any | null> {
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
    console.log('CT response status:', response?.statusCode ?? response?.status ?? 'no status');
    console.log('CT response body (snippet):', safeSnippet(response?.body ?? response));

    // response.body is a PagedQueryResult with `results: Order[]`
    const paged = response?.body;
    if (!paged || !Array.isArray(paged.results) || paged.results.length === 0) {
      console.log('No orders found for orderNumber:', trimmed);
      return null;
    }

    const order = paged.results[0];
    console.log('Found order id:', order?.id);
    return order;
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
