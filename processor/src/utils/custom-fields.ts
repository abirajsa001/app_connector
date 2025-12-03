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

type FieldDefSpec = {
  name: string;
  label: string;
  type: { name: string };
  required?: boolean;
  inputHint?: string;
};

const DEFAULT_FIELDS: FieldDefSpec[] = [
  {
    name: "transactionComments",
    label: "Transaction Comments",
    type: { name: "String" },
    required: false,
  },
  {
    name: "riskScore",
    label: "Risk Score",
    type: { name: "Number" },
    required: false,
  },
  {
    name: "merchantNote",
    label: "Merchant Note",
    type: { name: "String" },
    required: false,
    inputHint: "SingleLine",
  },
  {
    name: "deviceId",
    label: "Device ID",
    type: { name: "String" },
    required: false,
    // no inputHint (previous "Hidden" is not valid)
  },
];

/**
 * Create (if missing) or update (add missing fieldDefinitions) the
 * transaction-level custom Type key: novalnet-transaction-comments
 *
 * Call this at startup before writing transactions that rely on these fields.
 */
export const createTransactionCommentsType = async (): Promise<void> => {
  const KEY = "novalnet-transaction-comments";

  try {
    const existingResp = await apiRoot
      .types()
      .withKey({ key: KEY })
      .get()
      .execute()
      .catch(() => null);

    // If type doesn't exist -> create it with all fieldDefinitions
    if (!existingResp || !existingResp.body) {
      await apiRoot
        .types()
        .post({
          body: {
            key: KEY,
            name: { en: "Novalnet Transaction Comments (hidden)" },
            description: { en: "Transaction-level metadata for Novalnet (hidden in MC)" },
            resourceTypeIds: ["transaction"],
            fieldDefinitions: DEFAULT_FIELDS.map((f) => ({
              name: f.name,
              label: { en: f.label },
              type: f.type,
              required: !!f.required,
              ...(f.inputHint ? { inputHint: f.inputHint } : {}),
            })),
          },
        })
        .execute();
      return;
    }

    // Type exists -> add any missing fieldDefinitions
    const existingType = existingResp.body;
    const existingFieldNames = new Set((existingType.fieldDefinitions ?? []).map((fd: any) => fd.name));

    const actions: any[] = [];

    for (const f of DEFAULT_FIELDS) {
      if (!existingFieldNames.has(f.name)) {
        actions.push({
          addFieldDefinition: {
            fieldDefinition: {
              name: f.name,
              label: { en: f.label },
              type: f.type,
              required: !!f.required,
              ...(f.inputHint ? { inputHint: f.inputHint } : {}),
            },
          },
        });
      }
    }

    if (actions.length === 0) {
      // nothing to do
      return;
    }

    // apply update with current version
    await apiRoot
      .types()
      .withId({ ID: existingType.id })
      .post({
        body: {
          version: existingType.version,
          actions,
        },
      })
      .execute();

    // success
  } catch (err) {
    console.error("Error creating/updating custom type novalnet-transaction-comments:", err);
    throw err;
  }
};
