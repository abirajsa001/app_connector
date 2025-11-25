// src/services/order.service.ts
import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const PROJECT_KEY = process.env.CT_PROJECT_KEY ?? 'commercekey';

// --- Auth / HTTP config ---
// Replace placeholders / move to env vars for production. Do NOT commit secrets.
const authMiddlewareOptions: AuthMiddlewareOptions = {
  host:  'https://auth.europe-west1.gcp.commercetools.com',
  projectKey: PROJECT_KEY,
  credentials: {
    clientId: 'zzykDtn0B_bBov_EVqk0Hvo-',
    clientSecret: '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy',
  },
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: process.env.CT_API_HOST ?? 'https://api.europe-west1.gcp.commercetools.com',
};

// Build the CTP client
const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({ projectKey: PROJECT_KEY });

/**
 * Get the order ID (CTP `id`) for a given orderNumber.
 * Tries the dedicated endpoint first (withOrderNumber), then falls back to where-queries.
 */
export async function getOrderIdFromOrderNumber(orderNumberRaw: string): Promise<string | null> {
  const orderNumber = String(orderNumberRaw ?? '').trim();
  if (!orderNumber) {
    console.log('Empty orderNumber after trim.');
    return null;
  }

  console.log(`Searching for orderNumber=[${orderNumber}] len=${orderNumber.length}`);

  // 1) Preferred: use the dedicated endpoint /orders/order-number={orderNumber}
  try {
    // Some SDK versions accept .withOrderNumber(orderNumber) and others accept an object.
    // Cast to any to avoid type mismatches across SDK versions.
    const res = await (apiRoot.orders() as any).withOrderNumber(orderNumber).get().execute();

    console.log('withOrderNumber HTTP statusCode:', res.statusCode ?? 'unknown');
    if (res?.body?.id) {
      console.log('Found order using withOrderNumber, id=', res.body.id);
      return res.body.id;
    }
    console.warn('withOrderNumber returned no id; falling back to queries.');
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status;
    if (status === 404) {
      console.log('withOrderNumber: order not found (404). Falling back to queries.');
    } else {
      // Log and continue to try fallbacks (helps when SDK endpoints/signatures differ)
      console.error('Error calling withOrderNumber endpoint (continuing to fallbacks):', err?.message ?? err);
      if (err?.response?.body) {
        try {
          console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
        } catch {
          /* ignore stringify errors */
        }
      }
    }
  }

  // 2) Fallback: where query (double quotes)
  try {
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber="${escapeForWhere(orderNumber)}"`,
          limit: 1, // <-- number, not string (TypeScript expects number)
        },
      })
      .execute();

    console.log('Fallback (double quotes) HTTP statusCode:', response.statusCode ?? 'unknown');
    console.log('Response body keys:', Object.keys(response.body || {}));
    console.log('Result count:', Array.isArray(response.body?.results) ? response.body.results.length : 'no results array');
    console.log('Full response.body (truncated):', JSON.stringify(response.body, null, 2).slice(0, 2000));

    if (response.body?.results?.length > 0) {
      return response.body.results[0].id;
    }
  } catch (err: any) {
    console.error('Error during fallback where query (double quotes):', err?.message ?? err);
    if (err?.response?.body) {
      try {
        console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
      } catch {}
    }
  }

  // 3) Fallback: single quotes
  try {
    const response2 = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber='${escapeForWhere(orderNumber)}'`,
          limit: 1,
        },
      })
      .execute();

    console.log('Fallback (single quotes) HTTP statusCode:', response2.statusCode ?? 'unknown');
    if (response2.body?.results?.length > 0) {
      return response2.body.results[0].id;
    }
  } catch (err: any) {
    console.error('Error during fallback where query (single quotes):', err?.message ?? err);
    if (err?.response?.body) {
      try {
        console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
      } catch {}
    }
  }

  // 4) Fallback: try matching as id OR orderNumber (in case the caller passed id)
  try {
    const response3 = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `id="${escapeForWhere(orderNumber)}" or orderNumber="${escapeForWhere(orderNumber)}"`,
          limit: 1,
        },
      })
      .execute();

    console.log('Fallback (id or orderNumber) HTTP statusCode:', response3.statusCode ?? 'unknown');
    if (response3.body?.results?.length > 0) {
      return response3.body.results[0].id;
    }
  } catch (err: any) {
    console.error('Error during fallback id-or-orderNumber query:', err?.message ?? err);
    if (err?.response?.body) {
      try {
        console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
      } catch {}
    }
  }

  console.log('Order not found for orderNumber:', orderNumber);
  return null;
}

/**
 * Debug helper — list a few orders and print their orderNumbers so you can compare.
 */
export async function debugListSomeOrders(limit = 5): Promise<void> {
  try {
    const res = await apiRoot.orders().get({ queryArgs: { limit } }).execute();
    console.log('Debug: total results returned:', res.body?.results?.length ?? 'unknown');
    (res.body?.results ?? []).forEach((o: any, i: number) => {
      console.log(`#${i} id=${o.id} orderNumber=[${o.orderNumber}] createdAt=${o.createdAt}`);
    });
  } catch (err: any) {
    console.error('Error listing orders for debug:', err?.message ?? err);
    if (err?.response?.body) {
      try {
        console.error('Error response body:', JSON.stringify(err.response.body, null, 2));
      } catch {}
    }
  }
}

/** Escape helper for building where predicates — keeps quotes/backslashes safe. */
function escapeForWhere(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export default {
  getOrderIdFromOrderNumber,
  debugListSomeOrders,
};
