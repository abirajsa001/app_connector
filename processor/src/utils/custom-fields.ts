import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
import { config } from "../config/config";

const authOptions: AuthMiddlewareOptions = {
  host: config.authUrl,
  projectKey: config.projectKey,
  credentials: {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  },
};

const httpOptions: HttpMiddlewareOptions = {
  host: config.apiUrl,
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authOptions)
  .withHttpMiddleware(httpOptions)
  .build();

export const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({
  projectKey: config.projectKey,
});

/**
 * Custom type for Payment Transaction comments
 * Storefront-visible (Payment → Transaction → custom.fields)
 */
export const createTransactionCommentsType = async () => {
  try {
    await apiRoot
      .types()
      .withKey({ key: "novalnet-transaction-comments" })
      .get()
      .execute();

    // already exists
    return;
  } catch {
    // create if not exists
  }

  await apiRoot.types().post({
    body: {
      key: "novalnet-transaction-comments",
      name: { en: "Novalnet Transaction Comments" },
      resourceTypeIds: ["transaction"],
      fieldDefinitions: [
        {
          name: "transactionComments",
          label: { en: "Transaction Comments" },
          type: { name: "String" }, // ❗ MUST be String
          required: false,
        },
      ],
    },
  }).execute();
};
