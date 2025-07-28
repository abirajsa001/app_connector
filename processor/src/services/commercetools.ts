// services/commercetools.ts
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { ClientBuilder } from '@commercetools/sdk-client-v2';

const client = new ClientBuilder()
  .withClientCredentialsFlow({
    host: 'https://auth.europe-west1.gcp.commercetools.com',
    projectKey: 'ecommerceprojectkey',
    credentials: {
      clientId: 'PG5lILMI9Ilp4EXReXf87iKA',
      clientSecret: 'OjFmOXzEzzy6w-7wWRigH-fJf5fqoKt6',
    },
  })
  .withHttpMiddleware({
    host: 'https://api.europe-west1.gcp.commercetools.com',
  })
  .build();

const apiRoot = createApiBuilderFromCtpClient(client).withProjectKey({
  projectKey: 'ecommerceprojectkey',
});

export async function getPaymentFromCommercetools(paymentId: string) {
  const response = await apiRoot.payments().withId({ ID: paymentId }).get().execute();
  return response.body;
}
