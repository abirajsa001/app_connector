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
import { getApiRoot } from '../utils/ct-client.js'; // static import is important

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  try {
    const apiRoot = getApiRoot();

    // small safe log — don't print the entire apiRoot object
    console.log('Using commercetools project (apiRoot loaded)');

    // Escape quotes to keep where clause valid
    const safeOrderNumber = orderNumber.replace(/"/g, '\\"');

    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber="${safeOrderNumber}"`,
          limit: 1,
        },
      })
      .execute();
      console.log('Response was found an order', response);
    // The search returns results[]
    const results = response?.body?.results ?? [];
    if (results.length === 0) {
      console.log(`Order not found for orderNumber=${orderNumber}`);
    }

    console.log('Order found: id=', results[0].id, 'orderNumber=', results[0].orderNumber);
    return results[0] as Order;
  } catch (error: any) {
    // Log the best diagnostic info available
    console.log('Error fetching order (mock):', error?.message ?? error);
    // If the error has a response body (SDK HTTP error) show useful bits
    if (error?.response?.body) {
      try {
        console.log('Error response body:', JSON.stringify(error.response.body));
      } catch (_) { /* ignore */ }
    }
    return null;
  }
}

export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
  const order = await getOrderByOrderNumber(orderNumber);
  return order?.id ?? null;
}
