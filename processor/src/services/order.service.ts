// src/services/order.service.ts
import type { Order } from '@commercetools/platform-sdk';
import { getApiRoot } from '../utils/ct-client.js';

function safeTrim(v?: string) {
  return (v ?? '').toString().trim();
}

function safeEscapeForWhere(s: string) {
  return s.replace(/"/g, '\\"');
}

function extractErrorInfo(err: any) {
  // return useful pieces of the CT SDK error for debugging
  return {
    message: err?.message ?? String(err),
    status:
      err?.statusCode ??
      err?.response?.statusCode ??
      err?.response?.status ??
      null,
    body: err?.response?.body ?? err?.body ?? null,
    stack: err?.stack ?? null,
  };
}

/**
 * Try multiple strategies to get the order id
 * 1) Prefer direct endpoint /orders/order-number={orderNumber} if available
 * 2) Otherwise fallback to search via where query
 */
export async function getOrderIdFromOrderNumber(orderNumber?: string): Promise<string | null> {
  const cleaned = safeTrim(orderNumber);
  if (!cleaned) return null;

  const apiRoot = getApiRoot();

  // defensive: inspect available methods on orders() builder
  let ordersBuilder: any;
  try {
    ordersBuilder = apiRoot.orders();
  } catch (err) {
    console.error('[CT] apiRoot.orders() failed:', extractErrorInfo(err));
    return null;
  }

  // 1) If withOrderNumber exists and is a function, try it
  if (typeof ordersBuilder.withOrderNumber === 'function') {
    try {
      const resp = await ordersBuilder.withOrderNumber({ orderNumber: cleaned }).get().execute();
      if (resp?.body?.id) {
        return resp.body.id as string;
      }
      // if no body or id, log and fall through to where
      console.warn('[CT] withOrderNumber returned no id, falling back to where query. body snippet:', JSON.stringify(resp?.body ?? {}, null, 2).slice(0, 2000));
    } catch (err: any) {
      const info = extractErrorInfo(err);
      console.warn('[CT] withOrderNumber threw error:', info);
      // If 404 -> go to fallback (not an exceptional failure)
      if (info.status && info.status !== 404) {
        // For non-404 status we still attempt fallback, but log prominently
        console.error('[CT] withOrderNumber non-404 error, attempting fallback where query.');
      }
      // continue to fallback
    }
  } else {
    console.warn('[CT] orders().withOrderNumber not available on this SDK build — using fallback where query.');
  }

  // 2) Fallback: use where query (works even if SDK doesn't have withOrderNumber)
  try {
    const whereVal = `orderNumber="${safeEscapeForWhere(cleaned)}"`;
    const qResp = await ordersBuilder.get({ queryArgs: { where: whereVal, limit: 1 } }).execute();
    const found = qResp?.body?.results?.[0] as Order | undefined;
    if (found?.id) return found.id;
    console.info('[CT] where query returned no results for:', cleaned, 'response snippet:', JSON.stringify(qResp?.body ?? {}, null, 2).slice(0, 2000));
    return null;
  } catch (werr: any) {
    const info = extractErrorInfo(werr);
    console.error('[CT] where query failed:', info);
    return null;
  }
}
