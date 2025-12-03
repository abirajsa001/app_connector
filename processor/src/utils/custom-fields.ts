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
// src/commercetools/custom-fields.ts  (replace createTransactionCommentsType)
export const createTransactionCommentsType = async (): Promise<void> => {
  const KEY = "novalnet-transaction-comments";

  try {
    const existingResp = await apiRoot
      .types()
      .withKey({ key: KEY })
      .get()
      .execute()
      .catch(() => null);

    // helper to create plain, JSON-safe fieldDefinition literal
    const makeFieldDef = (f: FieldDefSpec) => {
      const typeObj = typeof f.type === "object" && (f.type as any).name ? { name: (f.type as any).name } : f.type;
      const base: any = {
        name: f.name,
        label: { en: f.label },
        type: typeObj,
        required: !!f.required,
      };
      // only attach inputHint when present and for string-like fields
      if (f.inputHint && typeObj && typeObj.name === "String") {
        base.inputHint = f.inputHint;
      }
      return base;
    };

    // If type doesn't exist -> create it with all fieldDefinitions
    if (!existingResp || !existingResp.body) {
      const body = {
        key: KEY,
        name: { en: "Novalnet Transaction Comments (hidden)" },
        description: { en: "Transaction-level metadata for Novalnet (hidden in MC)" },
        resourceTypeIds: ["transaction"],
        fieldDefinitions: DEFAULT_FIELDS.map(makeFieldDef),
      };

      // debug log: inspect final JSON structure being sent
      console.debug("Creating type - request body:", JSON.stringify(body, null, 2));

      await apiRoot
        .types()
        .post({ body })
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
            fieldDefinition: makeFieldDef(f),
          },
        });
      }
    }

    if (actions.length === 0) {
      // nothing to do
      return;
    }

    const updateBody = {
      version: existingType.version,
      actions,
    };

    // debug log: inspect final JSON structure being sent for update
    console.debug("Updating type - request body:", JSON.stringify(updateBody, null, 2));

    await apiRoot
      .types()
      .withId({ ID: existingType.id })
      .post({ body: updateBody })
      .execute();

  } catch (err: any) {
    // if CT returned structured error, print it (helps pinpoint invalid fields)
    if (err && err.body && err.body.errors) {
      console.error("Commercetools returned errors:", JSON.stringify(err.body.errors, null, 2));
    }
    console.error("Error creating/updating custom type novalnet-transaction-comments:", err);
    throw err;
  }
};

