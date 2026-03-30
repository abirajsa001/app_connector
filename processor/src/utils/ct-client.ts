import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";

import {
  createApiBuilderFromCtpClient,
} from "@commercetools/platform-sdk";
import { getConfig } from "../config/config";
import { log } from "../libs/logger";

const logger_1 = require("../libs/logger");

logger_1.log.info("logger1 authurl fetched", {
  customerData: String(getConfig()?.authUrl),
});
log.info("logInfo apiUrl fetched", {
  customerDataID: String(getConfig()?.apiUrl),
});

const projectKey = String(getConfig()?.projectKey);
const authUrl = String(getConfig()?.authUrl);
const apiUrl = String(getConfig()?.apiUrl);
const clientId = String(getConfig()?.clientId);
const clientSecret = String(getConfig()?.clientSecret);

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: String(getConfig()?.authUrl),
  projectKey,
  credentials: {
    clientId: String(getConfig()?.clientId),
    clientSecret: String(getConfig()?.clientSecret),
  },
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host:  String(getConfig()?.apiUrl),
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



