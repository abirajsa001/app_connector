// src/commercetools/custom-fields.ts
import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";
import {
  createApiBuilderFromCtpClient,
  type FieldDefinition,
  type FieldType,
} from "@commercetools/platform-sdk";
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
  // use the SDK FieldType for better type-safety; the DEFAULT_FIELDS below use literal names
  type: FieldType | { name: string };
  required?: boolean;
  inputHint?: string;
};

const DEFAULT_FIELDS: FieldDefSpec[] = [
  {
    name: "transactionComments",
    label: "Transaction Comments",
    type: { name: "String" }, // literal string here is fine
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
            // --- CAST to FieldDefinition[] so TS accepts the shape ---
            fieldDefinitions: DEFAULT_FIELDS.map((f) => ({
              name: f.name,
              label: { en: f.label },
              // cast the `type` into the SDK FieldType union
              type: (f.type as unknown) as FieldType,
              required: !!f.required,
              ...(f.inputHint ? { inputHint: f.inputHint } : {}),
            })) as unknown as FieldDefinition[],
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
              type: (f.type as unknown) as FieldType,
              required: !!f.required,
              ...(f.inputHint ? { inputHint: f.inputHint } : {}),
            } as FieldDefinition,
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
