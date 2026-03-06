import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";

import {
  createApiBuilderFromCtpClient,
} from "@commercetools/platform-sdk";


const projectKey = 'trailprojectkey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'IMYB1nOzGx0dtuShc-hieoG9';
const clientSecret = 'I-IjzEFDzTu1WFvlixQsD1HKb9S2orfz';

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: "https://auth.europe-west1.gcp.commercetools.com",
  projectKey,
  credentials: {
    clientId: 'IMYB1nOzGx0dtuShc-hieoG9',
    clientSecret: 'I-IjzEFDzTu1WFvlixQsD1HKb9S2orfz',
  },
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: "https://api.europe-west1.gcp.commercetools.com",
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

// THIS is your "projectApiRoot"
export const projectApiRoot = createApiBuilderFromCtpClient(ctpClient)
  .withProjectKey({ projectKey });
  
export function getApiRoot() {
  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: { clientId, clientSecret },
      fetch, // global fetch in Node 18+
    })
    .withHttpMiddleware({ host: apiUrl, fetch })
    .build();

  // Must scope API to project key to access resources like orders()
  return createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });
}



