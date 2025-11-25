import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const PROJECT_KEY = 'commercekey';

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: 'https://auth.europe-west1.gcp.commercetools.com',
  projectKey: PROJECT_KEY,
  credentials: {
    clientId: 'zzykDtn0B_bBov_EVqk0Hvo-',
    clientSecret: '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy',
  },
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: 'https://api.europe-west1.gcp.commercetools.com',
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

const apiRoot = createApiBuilderFromCtpClient(ctpClient)
  .withProjectKey({ projectKey: PROJECT_KEY });

export async function getOrderIdFromOrderNumber(orderNumber: string) {
  try {
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `orderNumber="${orderNumber}"`,
        },
      })
      .execute();
      console.log("response fetching order:", response);
    if (response.body.results.length === 0) {
      console.log("Order not found");
      return null;
    }

    return response.body.results[0].id;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
}
