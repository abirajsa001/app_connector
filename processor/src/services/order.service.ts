export async function getOrderIdByOrderNumber(orderNumberRaw: string) {
  const orderNumber = String(orderNumberRaw ?? '').trim();
  if (!orderNumber) {
    console.log('Empty orderNumber after trim.');
    return null;
  }

  try {
    // Primary query (standard)
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber="${orderNumber}"`,
          limit: '1',
        },
      })
      .execute();

    console.log('HTTP status:', response.statusCode ?? response.status);
    console.log('Response body keys:', Object.keys(response.body || {}));
    console.log('Result count:', Array.isArray(response.body?.results) ? response.body.results.length : 'no results array');
    // dump entire body for debugging (remove in prod)
    console.log('Full response.body:', JSON.stringify(response.body, null, 2));

    if (response.body?.results?.length > 0) {
      return response.body.results[0].id;
    }

    // Fallback 1: try single quotes (rarely necessary, but harmless)
    const response2 = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber='${orderNumber}'`,
          limit: '1',
        },
      })
      .execute();

    console.log('Fallback single-quote result count:', response2.body?.results?.length ?? 'no results array');
    if (response2.body?.results?.length > 0) return response2.body.results[0].id;

    // Fallback 2: try searching id (in case orderNumber is actually an id you have)
    const response3 = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `id="${orderNumber}" or orderNumber="${orderNumber}"`,
          limit: '1',
        },
      })
      .execute();

    console.log('Fallback id-or-orderNumber result count:', response3.body?.results?.length ?? 'no results array');
    if (response3.body?.results?.length > 0) return response3.body.results[0].id;

    console.log('Order not found for orderNumber:', orderNumber);
    return null;
  } catch (err: any) {
    console.error('Error fetching order:', err?.message ?? err);
    // If the response contains a body with errors, print it
    if (err?.response?.body) console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
    throw err;
  }
}
