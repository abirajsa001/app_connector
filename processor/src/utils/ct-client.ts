// utils/ct-client.ts
import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient, type ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';

/**
 * Singleton cached Api root, typed as ByProjectKeyRequestBuilder
 */
let cachedApiRoot: ByProjectKeyRequestBuilder | undefined;

export function getApiRoot(): ByProjectKeyRequestBuilder {
  if (cachedApiRoot) return cachedApiRoot;

  const projectKey = 'commercekey';
  const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
  const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
  const clientId = 'zzykDtn0B_bBov_EVqk0Hvo-';
  const clientSecret = '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy';

  if (!clientId || !clientSecret) {
    // Throwing here ensures callers receive a runtime error rather than a nullable value
    throw new Error('Commercetools credentials are not set (CT_CLIENT_ID / CT_CLIENT_SECRET).');
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

  // createApiBuilderFromCtpClient(client) returns an object with .withProjectKey()
  cachedApiRoot = createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });

  return cachedApiRoot;
}







