import type { Order } from '@commercetools/platform-sdk';

export async function getOrderByOrderNumber(orderNumber: string): Promise<any | null> {
  try {
    // Import dummy getApiRoot
    const { getApiRoot } = await import('../utils/ct-client.js');
    const apiRoot = getApiRoot();

    const response = await apiRoot
      .orders()
      .withOrderNumber({ orderNumber })
      .get()
      .execute();

    console.log('Mock API response:', response.body);

    return response.body;
  } catch (error: any) {
    console.log('Error fetching order (mock):', error);
    return null;
  }
}

export async function getOrderIdFromOrderNumber(orderNumber: string): Promise<string | null> {
  const order = await getOrderByOrderNumber(orderNumber);
  return order?.id ?? null;
}
