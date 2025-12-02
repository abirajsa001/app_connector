// src/utils/ct-client.ts
import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient, type ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';

let cachedApiRoot: ByProjectKeyRequestBuilder | undefined;

const projectKey = 'commercekey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'zzykDtn0B_bBov_EVqk0Hvo-';
const clientSecret = '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy';
const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: authUrl,
  projectKey,
  credentials: {
    clientId,
    clientSecret,
  },
};

// HTTP middleware
const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: apiUrl,
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

export const projectApiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({
  projectKey,
});


export function getApiRoot(): ByProjectKeyRequestBuilder {
  if (cachedApiRoot) return cachedApiRoot;

  if (!clientId || !clientSecret) {
    throw new Error('Commercetools credentials missing.');
  }

  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: { clientId, clientSecret },
      fetch,
    })
    .withHttpMiddleware({ host: apiUrl, fetch })
    .build();

  cachedApiRoot = createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });
  return cachedApiRoot;
}
