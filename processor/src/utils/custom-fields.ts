// src/commercetools/custom-fields.ts
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
  // set the scopes that your API client has in Merchant Center,
  // for example: ["manage_payments:your-project-key"]
  scopes: config.scopes ?? [`manage_payments:${config.projectKey}`],
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
 * Create a single transaction-level custom Type (idempotent).
 * Key: novalnet-transaction-comments
 * Resource: transaction
 */
export const createTransactionCommentsType = async (): Promise<void> => {
  try {
    const existing = await apiRoot
      .types()
      .withKey({ key: "novalnet-transaction-comments" })
      .get()
      .execute()
      .catch(() => null);

    if (existing && existing.body) {
      // type already exists
      return;
    }

    await apiRoot
      .types()
      .post({
        body: {
          key: "novalnet-transaction-comments",
          name: { en: "Novalnet Transaction Comments (hidden)" },
          description: { en: "Transaction-level metadata for Novalnet (hidden in MC)" },
          resourceTypeIds: ["transaction"], // IMPORTANT: transaction-level custom fields
          fieldDefinitions: [
            {
              name: "transactionComments",
              label: { en: "Transaction Comments" },
              type: { name: "String" },
              required: false,
            },
            {
              name: "riskScore",
              label: { en: "Risk Score" },
              type: { name: "Number" },
              required: false,
            },
            {
              name: "merchantNote",
              label: { en: "Merchant Note" },
              type: { name: "String" },
              required: false,
              inputHint:"SingleLine",
            },
            {
              name: "deviceId",
              label: { en: "Device ID" },
              type: { name: "String" },
              required: false,
              inputHint: "Hidden",
            },
            // add more fields here as needed
          ],
        },
      })
      .execute();
  } catch (err) {
    // do not throw in production startup; log and continue if you prefer
    // but surface error for debugging
    console.error("Error creating custom type novalnet-transaction-comments:", err);
    throw err;
  }
};
