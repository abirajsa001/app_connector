// src/commercetools/custom-fields.ts
import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from "@commercetools/sdk-client-v2";
import { createApiBuilderFromCtpClient } from "@commercetools/platform-sdk";
import { config } from "../config/config";

/**
 * NOTE:
 * - Keep payloads as plain JSON-safe objects (no class instances, no BigInt, no functions).
 * - This file purposely avoids casting values to SDK class instances to prevent
 *   "Request body does not contain valid JSON" errors from Commercetools.
 */

/* ---------- Client & API root ---------- */
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

/* ---------- Types for this module ---------- */
type FieldDefSpec = {
  name: string;
  label: string;
  // keep type as a plain object with a `name` property (e.g. { name: "String" })
  type: { name: string };
  required?: boolean;
  inputHint?: string; // e.g. "SingleLine" (only meaningful for string fields)
};

/* ---------- Field definitions you want on the transaction type ---------- */
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
  },
];

/* ---------- Utility: safe JSON serialization (forces plain JSON) ---------- */
const safeJson = (obj: any) => {
  try {
    // stringify + parse removes prototypes, functions, undefined, etc.
    const s = JSON.stringify(obj);
    return JSON.parse(s);
  } catch (e) {
    console.error("Failed to JSON-serialize object:", e);
    throw new Error("Request body is not JSON-serializable: " + (e as Error).message);
  }
};

/* ---------- Helper: produce a plain fieldDefinition object ---------- */
const makeFieldDef = (f: FieldDefSpec) => {
  const typeObj = { name: f.type.name };
  const base: any = {
    name: f.name,
    label: { en: f.label },
    type: typeObj,
    required: !!f.required,
  };

  // only attach inputHint when present and when the declared field type is "String"
  if (f.inputHint && typeObj.name === "String") {
    base.inputHint = f.inputHint;
  }

  return base;
};

/**
 * Create (if missing) or update (add missing fieldDefinitions) the
 * transaction-level custom Type with key: novalnet-transaction-comments
 *
 * Call this at application startup before writing transactions that rely on these fields.
 */
export const createTransactionCommentsType = async (): Promise<void> => {
  const KEY = "novalnet-transaction-comments";

  try {
    // attempt to fetch the Type by key (if not found, we'll create it)
    const existingResp = await apiRoot
      .types()
      .withKey({ key: KEY })
      .get()
      .execute()
      .catch(() => null);

    // If type doesn't exist -> create it with all fieldDefinitions
    if (!existingResp || !existingResp.body) {
      const body = {
        key: KEY,
        name: { en: "Novalnet Transaction Comments (hidden)" },
        description: { en: "Transaction-level metadata for Novalnet (hidden in MC)" },
        resourceTypeIds: ["transaction"],
        fieldDefinitions: DEFAULT_FIELDS.map(makeFieldDef),
      };

      // Make sure the object is JSON-safe before sending
      const plainCreateBody = safeJson(body);

      // debug: inspect the exact JSON payload we'll send
      console.debug("Creating transaction Type - request body:", JSON.stringify(plainCreateBody, null, 2));

      await apiRoot.types().post({ body: plainCreateBody }).execute();
      console.info(`Created Type '${KEY}'.`);
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
      console.info(`Type '${KEY}' already contains all required fieldDefinitions.`);
      return;
    }

    const updateBody = {
      version: existingType.version,
      actions,
    };

    const plainUpdateBody = safeJson(updateBody);
    console.debug("Updating transaction Type - request body:", JSON.stringify(plainUpdateBody, null, 2));

    await apiRoot.types().withId({ ID: existingType.id }).post({ body: plainUpdateBody }).execute();
    console.info(`Updated Type '${KEY}' (added ${actions.length} fieldDefinition(s)).`);
  } catch (err: any) {
    // helpful, structured logging when CT returns a 400 with validation errors
    if (err && err.body) {
      try {
        console.error("Commercetools error body:", JSON.stringify(err.body, null, 2));
        if (err.body.errors) {
          console.error("Commercetools validation errors:", JSON.stringify(err.body.errors, null, 2));
        }
      } catch (e) {
        console.error("Failed to stringify Commercetools error body:", e);
      }
    } else {
      console.error("Error creating/updating custom type novalnet-transaction-comments:", err);
    }
    throw err;
  }
};

/* ---------- Optionally export DEFAULT_FIELDS for other modules/tests ---------- */
export { DEFAULT_FIELDS, FieldDefSpec };
