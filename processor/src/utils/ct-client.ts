
import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = 'commercekey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'zzykDtn0B_bBov_EVqk0Hvo-';
const clientSecret = '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy';


let cachedApiRoot: ReturnType<typeof createApiBuilderFromCtpClient> | null = null;

export function getApiRoot() {
  if (cachedApiRoot) return cachedApiRoot;

  const projectKey = 'commercekey';
  const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
  const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
  const clientId = 'zzykDtn0B_bBov_EVqk0Hvo-';
  const clientSecret = '9vrhw1oyV27jiLvlOvQJpR__UVhd6ETy';

  if (!clientId || !clientSecret) {
    throw new Error('Commercetools clientId/clientSecret not set in env (CT_CLIENT_ID, CT_CLIENT_SECRET)');
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






