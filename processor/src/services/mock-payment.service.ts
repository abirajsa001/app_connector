/* src/services/mock-payment.service.ts */
import {
  statusHandler,
  healthCheckCommercetoolsPermissions,
  Cart,
  ErrorRequiredField,
  TransactionType,
  TransactionState,
  ErrorInvalidOperation,
} from "@commercetools/connect-payments-sdk";
import {
  CancelPaymentRequest,
  CapturePaymentRequest,
  ConfigResponse,
  PaymentProviderModificationResponse,
  RefundPaymentRequest,
  ReversePaymentRequest,
  StatusResponse,
} from "./types/operation.type";

import { SupportedPaymentComponentsSchemaDTO } from "../dtos/operations/payment-componets.dto";
import { PaymentModificationStatus } from "../dtos/operations/payment-intents.dto";
import packageJSON from "../../package.json";

import { AbstractPaymentService } from "./abstract-payment.service";
import { getConfig } from "../config/config";
import { appLogger, paymentSDK } from "../payment-sdk";
import {
  CreatePaymentRequest,
  MockPaymentServiceOptions,
} from "./types/mock-payment.type";
import {
  PaymentMethodType,
  PaymentOutcome,
  PaymentResponseSchemaDTO,
} from "../dtos/mock-payment.dto";
import {
  getCartIdFromContext,
  getPaymentInterfaceFromContext,
  getMerchantReturnUrlFromContext,
  getFutureOrderNumberFromContext,
} from "../libs/fastify/context/context";
import { randomUUID } from "crypto";
import {
  TransactionDraftDTO,
  TransactionResponseDTO,
} from "../dtos/operations/transaction.dto";
import { log } from "../libs/logger";
import * as Context from "../libs/fastify/context/context";
import { ExtendedUpdatePayment } from './types/payment-extension';
import { createTransactionCommentsType } from '../utils/custom-fields';

type NovalnetConfig = {
  testMode: string;
  paymentAction: string;
  dueDate: string;
};

function getNovalnetConfigValues(
  type: string,
  config: Record<string, any>,
): NovalnetConfig {
  const upperType = type.toUpperCase();
  return {
    testMode: String(config?.[`novalnet_${upperType}_TestMode`] ?? "0"),
    paymentAction: String(
      config?.[`novalnet_${upperType}_PaymentAction`] ?? "payment",
    ),
    dueDate: String(config?.[`novalnet_${upperType}_DueDate`] ?? "3"),
  };
}

function getPaymentDueDate(configuredDueDate: number | string): string | null {
  const days = Number(configuredDueDate);
  if (isNaN(days)) {
    return null;
  }
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  const formattedDate = dueDate.toISOString().split("T")[0];
  return formattedDate;
}

export class MockPaymentService extends AbstractPaymentService {
  constructor(opts: MockPaymentServiceOptions) {
    super(opts.ctCartService, opts.ctPaymentService);
  }

  public async config(): Promise<ConfigResponse> {
    const config = getConfig();
    return {
      clientKey: config.mockClientKey,
      environment: config.mockEnvironment,
    };
  }

  public async status(): Promise<StatusResponse> {
    const handler = await statusHandler({
      timeout: getConfig().healthCheckTimeout,
      log: appLogger,
      checks: [
        healthCheckCommercetoolsPermissions({
          requiredPermissions: [
            "manage_payments",
            "view_sessions",
            "view_api_clients",
            "manage_orders",
            "introspect_oauth_tokens",
            "manage_checkout_payment_intents",
            "manage_types",
          ],
          ctAuthorizationService: paymentSDK.ctAuthorizationService,
          projectKey: getConfig().projectKey,
        }),
        async () => {
          try {
            const paymentMethods = "card";
            return {
              name: "Mock Payment API",
              status: "UP",
              message: "Mock api is working",
              details: {
                paymentMethods,
              },
            };
          } catch (e) {
            return {
              name: "Mock Payment API",
              status: "DOWN",
              message:
                "The mock payment API is down for some reason. Please check the logs for more details.",
              details: {
                error: e,
              },
            };
          }
        },
      ],
      metadataFn: async () => ({
        name: packageJSON.name,
        description: packageJSON.description,
        "@commercetools/connect-payments-sdk":
          packageJSON.dependencies["@commercetools/connect-payments-sdk"],
      }),
    })();
    return handler.body;
  }

  public async getSupportedPaymentComponents(): Promise<SupportedPaymentComponentsSchemaDTO> {
    return {
      dropins: [],
      components: [
        { type: PaymentMethodType.CARD },
        { type: PaymentMethodType.INVOICE },
        { type: PaymentMethodType.PREPAYMENT },
        { type: PaymentMethodType.IDEAL },
        { type: PaymentMethodType.PAYPAL },
        { type: PaymentMethodType.ONLINE_BANK_TRANSFER },
        { type: PaymentMethodType.ALIPAY },
        { type: PaymentMethodType.BANCONTACT },
        { type: PaymentMethodType.BLIK },
        { type: PaymentMethodType.EPS },
        { type: PaymentMethodType.MBWAY },
        { type: PaymentMethodType.MULTIBANCO },
        { type: PaymentMethodType.PAYCONIQ },
        { type: PaymentMethodType.POSTFINANCE },
        { type: PaymentMethodType.POSTFINANCE_CARD },
        { type: PaymentMethodType.PRZELEWY24 },
        { type: PaymentMethodType.TRUSTLY },
        { type: PaymentMethodType.TWINT },
        { type: PaymentMethodType.WECHATPAY },
        { type: PaymentMethodType.SEPA },
        { type: PaymentMethodType.ACH },
        { type: PaymentMethodType.CREDITCARD },
      ],
    };
  }

  /* ---------------------------
     Basic payment operations
     --------------------------- */
  public async capturePayment(
    request: CapturePaymentRequest,
  ): Promise<PaymentProviderModificationResponse> {
    await this.ctPaymentService.updatePayment({
      id: request.payment.id,
      transaction: {
        type: "Charge",
        amount: request.amount,
        interactionId: request.payment.interfaceId,
        state: "Success",
      },
    });
    return {
      outcome: PaymentModificationStatus.APPROVED,
      pspReference: request.payment.interfaceId as string,
    };
  }

  public async cancelPayment(
    request: CancelPaymentRequest,
  ): Promise<PaymentProviderModificationResponse> {
    await this.ctPaymentService.updatePayment({
      id: request.payment.id,
      transaction: {
        type: "CancelAuthorization",
        amount: request.payment.amountPlanned,
        interactionId: request.payment.interfaceId,
        state: "Success",
      },
    });
    return {
      outcome: PaymentModificationStatus.APPROVED,
      pspReference: request.payment.interfaceId as string,
    };
  }

  public async refundPayment(
    request: RefundPaymentRequest,
  ): Promise<PaymentProviderModificationResponse> {
    await this.ctPaymentService.updatePayment({
      id: request.payment.id,
      transaction: {
        type: "Refund",
        amount: request.amount,
        interactionId: request.payment.interfaceId,
        state: "Success",
      },
    });
    return {
      outcome: PaymentModificationStatus.APPROVED,
      pspReference: request.payment.interfaceId as string,
    };
  }

  public async reversePayment(
    request: ReversePaymentRequest,
  ): Promise<PaymentProviderModificationResponse> {
    const hasCharge = this.ctPaymentService.hasTransactionInState({
      payment: request.payment,
      transactionType: "Charge",
      states: ["Success"],
    });
    const hasRefund = this.ctPaymentService.hasTransactionInState({
      payment: request.payment,
      transactionType: "Refund",
      states: ["Success", "Pending"],
    });
    const hasCancelAuthorization = this.ctPaymentService.hasTransactionInState({
      payment: request.payment,
      transactionType: "CancelAuthorization",
      states: ["Success", "Pending"],
    });

    const wasPaymentReverted = hasRefund || hasCancelAuthorization;

    if (hasCharge && !wasPaymentReverted) {
      return this.refundPayment({
        payment: request.payment,
        merchantReference: request.merchantReference,
        amount: request.payment.amountPlanned,
      });
    }

    const hasAuthorization = this.ctPaymentService.hasTransactionInState({
      payment: request.payment,
      transactionType: "Authorization",
      states: ["Success"],
    });
    if (hasAuthorization && !wasPaymentReverted) {
      return this.cancelPayment({ payment: request.payment });
    }

    throw new ErrorInvalidOperation(
      "There is no successful payment transaction to reverse.",
    );
  }

  public async ctcc(cart: Cart) {
    const deliveryAddress = paymentSDK.ctCartService.getOneShippingAddress({
      cart,
    });
    return deliveryAddress;
  }

  public async ctbb(cart: Cart) {
    const billingAddress = cart.billingAddress;
    return billingAddress;
  }

  /* ---------------------------
     Novalnet helper flows (createPaymentt/createPayment/createPayments)
     --------------------------- */
  public async createPaymentt({ data }: { data: any }) {
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    const config = getConfig();
    await createTransactionCommentsType();
    log.info("getMerchantReturnUrlFromContext from context:", getMerchantReturnUrlFromContext());
    const merchantReturnUrl = getMerchantReturnUrlFromContext() || config.merchantReturnUrl;

    const novalnetPayload = {
      transaction: {
        tid: parsedData?.interfaceId ?? "",
      },
    };

    let responseData: any;
    try {
      const novalnetResponse = await fetch(
        "https://payport.novalnet.de/v2/transaction/details",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
          },
          body: JSON.stringify(novalnetPayload),
        },
      );

      if (!novalnetResponse.ok) {
        throw new Error(`Novalnet API error: ${novalnetResponse.status}`);
      }

      responseData = await novalnetResponse.json();
    } catch (error) {
      log.error("Failed to fetch transaction details from Novalnet:", error);
      throw new Error("Payment verification failed");
    }
    const paymentRef = responseData?.custom?.paymentRef ?? "";
    const pspReference = parsedData?.pspReference;
    const transactionComments = `Novalnet Transaction ID: ${responseData?.transaction?.tid ?? "NN/A"}\nPayment Type: ${responseData?.transaction?.payment_type ?? "NN/A"}\nStatus: ${responseData?.result?.status ?? "NN/A"}`;

    log.info("Payment created with Novalnet details for redirect:");
    log.info("Payment transactionComments for redirect:", transactionComments);
    log.info("ctPayment id for redirect:", parsedData?.ctPaymentId);
    log.info("psp reference for redirect:", pspReference);

    // Use newly implemented helper to attach comments using the field name you declared in the Type.
    // Change 'commentDetails' to the actual field name in your Type (or 'transactionComments' if that is your Type field).
    try {
      const attachResult = await this.attachTransactionCommentsUsingField(
        parsedData.ctPaymentId,
        pspReference,
        "transactionComments", // <-- change if your Type uses a different field name
        transactionComments,
      );
      log.info("attachTransactionCommentsUsingField result:", attachResult);
    } catch (err) {
      log.error("attachTransactionCommentsUsingField threw:", err);
    }

    return {
      paymentReference: paymentRef,
    };
  }

  /* ---------------------------
     Utilities for updatePayment with retry and safe-update
     --------------------------- */

  /**
   * Robust update helper that:
   * - fetches the payment version
   * - runs updatePayment
   * - on 409 retries once with refreshed version
   *
   * returns { ok: boolean, resp?, retried?: boolean, status?, body?, error? }
   */
  public async updatePaymentWithActions(
    ctPaymentService: any,
    paymentId: string,
    actions: any[],
  ) {
    if (!Array.isArray(actions) || actions.length === 0) {
      return { ok: false, reason: "no_actions" };
    }

    const fetchPayment = async () => {
      const raw = await ctPaymentService.getPayment({ id: paymentId } as any);
      return (raw as any)?.body ?? raw;
    };

    const runUpdate = async (payload: any) => {
      try {
        const resp = await ctPaymentService.updatePayment(payload as any);
        return { ok: true, resp };
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status ?? null;
        const body = err?.body ?? err?.response ?? err;
        return { ok: false, error: err, status, body };
      }
    };

    // fetch current version
    let payment;
    try {
      payment = await fetchPayment();
    } catch (ex) {
      console.error("updatePaymentWithActions: failed to fetch payment:", ex);
      return { ok: false, reason: "fetch_failed", error: ex };
    }

    const version = payment?.version;
    if (version === undefined) {
      console.error("updatePaymentWithActions: payment.version is missing", { paymentId, payment });
      return { ok: false, reason: "missing_version", payment };
    }

    let payload: any = { id: paymentId, version, actions };

    // attempt 1
    let res = await runUpdate(payload);
    if (res.ok) {
      return { ok: true, resp: res.resp, retried: false };
    }

    // if 409 -> refetch and retry once
    const status = res.status;
    console.warn("updatePaymentWithActions: first attempt failed", { paymentId, status, body: res.body ?? res.error });

    if (status === 409) {
      try {
        payment = await fetchPayment();
      } catch (ex) {
        console.error("updatePaymentWithActions: failed to re-fetch payment after 409:", ex);
        return { ok: false, reason: "refetch_failed", error: ex, firstError: res.body ?? res.error, status: res.status };
      }

      const version2 = payment?.version;
      if (version2 === undefined) {
        console.error("updatePaymentWithActions: missing version on retry", { paymentId, payment });
        return { ok: false, reason: "missing_version_retry", payment, firstError: res.body ?? res.error };
      }

      payload.version = version2;
      const res2 = await runUpdate(payload);
      if (res2.ok) {
        return { ok: true, resp: res2.resp, retried: true };
      }

      console.error("updatePaymentWithActions: retry failed", {
        paymentId,
        firstError: res.body ?? res.error,
        retryError: res2.body ?? res2.error,
        retryStatus: res2.status,
      });
      return {
        ok: false,
        reason: "retry_failed",
        firstError: res.body ?? res.error,
        retryError: res2.body ?? res2.error,
        status: res2.status,
      };
    }

    // non-409 failure
    console.error("updatePaymentWithActions: update failed (non-409)", {
      paymentId,
      status: res.status,
      body: res.body ?? res.error,
    });
    return { ok: false, reason: "update_failed", status: res.status, body: res.body ?? res.error };
  }

  /* ---------------------------
     New helpers: attach/update custom type + field with dynamic fieldName
     --------------------------- */

  /**
   * Build setTransactionCustomType action with dynamic field name / value
   */
  private buildSetTransactionCustomTypeAction(
    txId: string,
    typeKey: string,
    fieldName: string,
    value: any,
  ) {
    return {
      action: "setTransactionCustomType",
      transactionId: txId,
      type: { typeId: "type", key: typeKey },
      fields: { [fieldName]: value },
    };
  }

  /**
   * Attach (or update) transaction custom field using Type attach action with dynamic field name.
   * - tries non-localized first, then localized if necessary.
   * - typeKey defaults to 'novalnet-transaction-comments'
   *
   * fieldName must match the field in your commercetools Type.
   */
  public async attachTransactionCommentsUsingField(
    paymentId: string,
    pspReference: string,
    fieldName: string,
    fieldValue: string,
    typeKey = "novalnet-transaction-comments",
  ) {
    // fetch payment
    const raw = await this.ctPaymentService.getPayment({ id: paymentId } as any);
    const payment = (raw as any)?.body ?? raw;
    if (!payment) throw new Error("Payment not found");

    const transactions: any[] = payment.transactions ?? [];
    if (!transactions.length) throw new Error("No transactions on payment");

    const tx = transactions.find((t: any) =>
      t.interactionId === pspReference || String(t.interactionId) === String(pspReference)
    ) ?? transactions[transactions.length - 1];

    if (!tx) throw new Error("Transaction not found");
    const txId = tx.id;
    if (!txId) throw new Error("Transaction id missing");

    // 1) Try attach with non-localized value
    const actionNonLocalized = this.buildSetTransactionCustomTypeAction(txId, typeKey, fieldName, fieldValue);
    console.info("Attempting setTransactionCustomType (non-localized) for txId:", txId);
    const r1 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, [actionNonLocalized]);
    if (r1.ok) {
      console.info("setTransactionCustomType (non-localized) succeeded");
      return { ok: true, method: "setTransactionCustomType", resp: r1.resp };
    }

    // 2) Try localized shape (common when field is LocalizedString)
    const actionLocalized = this.buildSetTransactionCustomTypeAction(txId, typeKey, fieldName, { en: fieldValue });
    console.info("Attempting setTransactionCustomType (localized) for txId:", txId);
    const r2 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, [actionLocalized]);
    if (r2.ok) {
      console.info("setTransactionCustomType (localized) succeeded");
      return { ok: true, method: "setTransactionCustomType_localized", resp: r2.resp };
    }

    console.error("Both setTransactionCustomType attempts failed", { first: r1.body ?? r1.error, localized: r2.body ?? r2.error });
    return { ok: false, reason: "attach_failed", attachError: r1.body ?? r1.error, attachLocalizedError: r2.body ?? r2.error };
  }

  /**
   * Attach the transaction custom type to the transaction with an empty field value
   * (so that later setTransactionCustomField calls will succeed).
   *
   * fieldName: the field name in your Type (e.g. 'commentDetails' or 'transactionComments')
   */
  public async attachEmptyTxCommentsTypeUsingField(
    paymentId: string,
    pspReference: string,
    fieldName = "commentDetails",
    typeKey = "novalnet-transaction-comments",
  ) {
    // fetch payment
    const raw = await this.ctPaymentService.getPayment({ id: paymentId } as any);
    const payment = (raw as any)?.body ?? raw;
    if (!payment) throw new Error("Payment not found in attachEmptyTxCommentsType");
    const transactions: any[] = payment.transactions ?? [];
    if (!transactions.length) throw new Error("No transactions on payment in attachEmptyTxCommentsType");

    // find tx
    const tx = transactions.find((t: any) =>
      t.interactionId === pspReference || String(t.interactionId) === String(pspReference)
    ) ?? transactions[transactions.length - 1];

    if (!tx) throw new Error("Target transaction not found in attachEmptyTxCommentsType");
    const txId = tx.id;
    if (!txId) throw new Error("Transaction id missing in attachEmptyTxCommentsType");

    // try attach with empty non-localized
    const actionEmpty = this.buildSetTransactionCustomTypeAction(txId, typeKey, fieldName, "");
    const r1 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, [actionEmpty]);
    if (r1.ok) return { ok: true, method: "setTransactionCustomType" };

    // fallback localized empty
    const actionEmptyLocalized = this.buildSetTransactionCustomTypeAction(txId, typeKey, fieldName, { en: "" });
    const r2 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, [actionEmptyLocalized]);
    if (r2.ok) return { ok: true, method: "setTransactionCustomType_localized" };

    return { ok: false, reason: "attach_failed", body: r1.body ?? r2.body ?? r1.error ?? r2.error };
  }

  /**
   * Fast-path when Type already attached: setTransactionCustomField to update single field.
   * Tries non-localized then localized fallback.
   */
  public async setTransactionCustomFieldFast(
    paymentId: string,
    pspReference: string,
    fieldName: string,
    fieldValue: any,
  ) {
    // fetch payment
    const raw = await this.ctPaymentService.getPayment({ id: paymentId } as any);
    const payment = (raw as any)?.body ?? raw;
    if (!payment) throw new Error("Payment not found");

    const transactions: any[] = payment.transactions ?? [];
    if (!transactions.length) throw new Error("No transactions on payment");

    const tx = transactions.find((t: any) =>
      t.interactionId === pspReference || String(t.interactionId) === String(pspReference)
    ) ?? transactions[transactions.length - 1];

    if (!tx) throw new Error("Transaction not found");
    const txId = tx.id;
    if (!txId) throw new Error("Transaction id missing");

    const actions = [
      {
        action: "setTransactionCustomField",
        transactionId: txId,
        name: fieldName,
        value: fieldValue,
      },
    ];

    // Try non-localized
    const r1 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, actions);
    if (r1.ok) return { ok: true, method: "setTransactionCustomField", resp: r1.resp };

    // localized fallback
    const actionsLocalized = [
      {
        action: "setTransactionCustomField",
        transactionId: txId,
        name: fieldName,
        value: { en: fieldValue },
      },
    ];
    const r2 = await this.updatePaymentWithActions(this.ctPaymentService, paymentId, actionsLocalized);
    if (r2.ok) return { ok: true, method: "setTransactionCustomField_localized", resp: r2.resp };

    return { ok: false, reason: "field_update_failed", body: r1.body ?? r1.error, localizedBody: r2.body ?? r2.error };
  }

  /* ---------------------------
     Main createPayment / createPayments updated to use helpers
     --------------------------- */

  public async createPayment(
    request: CreatePaymentRequest,
  ): Promise<PaymentResponseSchemaDTO> {
    const type = String(request.data?.paymentMethod?.type ?? "INVOICE");
    const config = getConfig();
    const { testMode, paymentAction, dueDate } = getNovalnetConfigValues(
      type,
      config,
    );
    await createTransactionCommentsType();
    const ctCart = await this.ctCartService.getCart({
      id: getCartIdFromContext(),
    });

    const deliveryAddress = await this.ctcc(ctCart);
    const billingAddress = await this.ctbb(ctCart);
    const parsedCart = typeof ctCart === "string" ? JSON.parse(ctCart) : ctCart;
    const dueDateValue = getPaymentDueDate(dueDate);

    const transaction: Record<string, any> = {
      test_mode: testMode === "1" ? "1" : "0",
      payment_type: String(request.data.paymentMethod.type),
      amount: String(parsedCart?.taxedPrice?.totalGross?.centAmount ?? "0"),
      currency: String(
        parsedCart?.taxedPrice?.totalGross?.currencyCode ?? "EUR",
      ),
    };

    if (dueDateValue) {
      transaction.due_date = dueDateValue;
    }

    if (
      String(request.data.paymentMethod.type).toUpperCase() ===
      "DIRECT_DEBIT_SEPA"
    ) {
      transaction.create_token = 1;
      transaction.payment_data = {
        account_holder: String(
          request.data.paymentMethod.poNumber ?? "Norbert Maier",
        ),
        iban: String(
          request.data.paymentMethod.invoiceMemo ?? "DE24300209002411761956",
        ),
      };
    }

    if (
      String(request.data.paymentMethod.type).toUpperCase() ===
      "DIRECT_DEBIT_ACH"
    ) {
      transaction.create_token = 1;
      transaction.payment_data = {
        account_holder: String(
          request.data.paymentMethod.accHolder ?? "Norbert Maier",
        ),
        account_number: String(
          request.data.paymentMethod.poNumber ?? "123456789",
        ),
        routing_number: String(
          request.data.paymentMethod.invoiceMemo ?? "031200730",
        ),
      };
    }

    if (
      String(request.data.paymentMethod.type).toUpperCase() === "CREDITCARD"
    ) {
      transaction.payment_data = {
        pan_hash: String(request.data.paymentMethod.panHash ?? ""),
        unique_id: String(request.data.paymentMethod.uniqueId ?? ""),
      };
    }

    const novalnetPayload = {
      merchant: {
        signature: String(getConfig()?.novalnetPrivateKey ?? ""),
        tariff: String(getConfig()?.novalnetTariff ?? ""),
      },
      customer: {
        billing: {
          city: String(billingAddress?.city ?? "demo"),
          country_code: String(billingAddress?.country ?? "US"),
          house_no: String(billingAddress?.streetName ?? "10"),
          street: String(billingAddress?.streetName ?? "teststreet"),
          zip: String(billingAddress?.postalCode ?? "12345"),
        },
        shipping: {
          city: String(deliveryAddress?.city ?? "demoshipping"),
          country_code: String(deliveryAddress?.country ?? "US"),
          house_no: String(deliveryAddress?.streetName ?? "11"),
          street: String(deliveryAddress?.streetName ?? "testshippingstreet"),
          zip: String(deliveryAddress?.postalCode ?? "12345"),
        },
        first_name: "Max",
        last_name: "Mustermann",
        email: "abiraj_s@novalnetsolutions.com",
      },
      transaction,
      custom: {
        input1: "currencyCode",
        inputval1: String(
          parsedCart?.taxedPrice?.totalGross?.currencyCode ?? "empty",
        ),
        input2: "transaction amount",
        inputval2: String(
          parsedCart?.taxedPrice?.totalGross?.centAmount ?? "empty",
        ),
        input3: "customerEmail",
        inputval3: String(parsedCart.customerEmail ?? "Email not available"),
        input4: "Payment-Method",
        inputval4: String(
          request.data.paymentMethod.type ?? "Payment-Method not available",
        ),
        input5: "TestMode",
        inputval5: String(testMode ?? "0"),
      },
    };

    const url =
      paymentAction === "payment"
        ? "https://payport.novalnet.de/v2/payment"
        : "https://payport.novalnet.de/v2/authorize";

    let responseString = "";
    let responseData: any;
    try {
      const novalnetResponse = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
        },
        body: JSON.stringify(novalnetPayload),
      });

      if (!novalnetResponse.ok) {
        throw new Error(`Novalnet API error: ${novalnetResponse.status}`);
      }

      responseData = await novalnetResponse.json();
      responseString = JSON.stringify(responseData);
    } catch (err) {
      log.error("Failed to process payment with Novalnet:", err);
      throw new Error("Payment processing failed");
    }
    const parsedResponse = JSON.parse(responseString);

    const transactiondetails = `Novalnet Transaction ID: ${parsedResponse?.transaction?.tid ?? "N/A"}\nTest Order`;

    let bankDetails = "";
    if (parsedResponse?.transaction?.bank_details) {
      bankDetails = `Please transfer the amount of ${parsedResponse.transaction.amount} to the following account.\nAccount holder: ${parsedResponse.transaction.bank_details.account_holder}\nIBAN: ${parsedResponse.transaction.bank_details.iban}\nBIC: ${parsedResponse.transaction.bank_details.bic}\nBANK NAME: ${parsedResponse.transaction.bank_details.bank_name}\nBANK PLACE: ${parsedResponse.transaction.bank_details.bank_place}\nPlease use the following payment reference for your money transfer:\nPayment Reference 1: ${parsedResponse.transaction.tid}`;
    }

    const ctPayment = await this.ctPaymentService.createPayment({
      amountPlanned: await this.ctCartService.getPaymentAmount({
        cart: ctCart,
      }),
      paymentMethodInfo: {
        paymentInterface: getPaymentInterfaceFromContext() || "mock",
      },
      paymentStatus: {
        interfaceCode: JSON.stringify(parsedResponse),
        interfaceText: transactiondetails + "\n" + bankDetails,
      },
      ...(ctCart.customerId && {
        customer: { typeId: "customer", id: ctCart.customerId },
      }),
      ...(!ctCart.customerId &&
        ctCart.anonymousId && {
          anonymousId: ctCart.anonymousId,
        }),
    });

    await this.ctCartService.addPayment({
      resource: { id: ctCart.id, version: ctCart.version },
      paymentId: ctPayment.id,
    });

    const pspReference = randomUUID().toString();
    // Generate transaction comments
    const transactionComments = `Novalnet Transaction ID: ${parsedResponse?.transaction?.tid ?? "N/A"}\nPayment Type: ${parsedResponse?.transaction?.payment_type ?? "N/A"}\nStatus: ${parsedResponse?.result?.status ?? "N/A"}`;
    log.info("Payment created with Novalnet details for direct:");
    log.info("Payment transactionComments for direct:", transactionComments);
    log.info("ctPayment id for direct:", ctPayment.id);
    log.info("psp reference for direct:", pspReference);

    // Create transaction without inline custom
    await this.ctPaymentService.updatePayment({
      id: ctPayment.id,
      pspReference,
      paymentMethod: request.data.paymentMethod.type,
      transaction: {
        type: "Authorization",
        amount: ctPayment.amountPlanned,
        interactionId: pspReference,
        state: this.convertPaymentResultCode(request.data.paymentOutcome),
      } as unknown as any,
    } as any);

    // Attach the custom type + field robustly via helper
    // If your Type field is 'commentDetails' change the third arg accordingly
    const attachResult = await this.attachTransactionCommentsUsingField(
      ctPayment.id,
      pspReference,
      "transactionComments", // <-- field name in the Type
      transactionComments,
    );
    log.info("attachTransactionCommentsUsingField result (createPayment):", attachResult);

    return {
      paymentReference: ctPayment.id,
    };
  }

  public async createPayments(
    request: CreatePaymentRequest,
  ): Promise<PaymentResponseSchemaDTO> {
    log.info("=== IDEAL PAYMENT START ===");
    log.info("Request data:", JSON.stringify(request.data, null, 2));
    const type = String(request.data?.paymentMethod?.type ?? "INVOICE");
    log.info("Payment type:", type);
    log.info(getFutureOrderNumberFromContext());
    const config = getConfig();
    log.info("Config loaded:", {
      hasPrivateKey: !!config.novalnetPrivateKey,
      hasTariff: !!config.novalnetTariff,
      privateKeyLength: config.novalnetPrivateKey?.length || 0
    });
    await createTransactionCommentsType();
    const { testMode, paymentAction } = getNovalnetConfigValues(type, config);
    log.info("Novalnet config:", { testMode, paymentAction });

    const cartId = getCartIdFromContext();
    log.info("Cart ID from context:", cartId);

    const ctCart = await this.ctCartService.getCart({
      id: cartId,
    });
    log.info("Cart retrieved:", {
      id: ctCart.id,
      version: ctCart.version,
      customerId: ctCart.customerId,
      anonymousId: ctCart.anonymousId,
      customerEmail: ctCart.customerEmail
    });

    const deliveryAddress = await this.ctcc(ctCart);
    const billingAddress = await this.ctbb(ctCart);
    log.info("Addresses:", {
      billing: billingAddress,
      delivery: deliveryAddress
    });

    const parsedCart = typeof ctCart === "string" ? JSON.parse(ctCart) : ctCart;
    log.info("Cart amount:", {
      centAmount: parsedCart?.taxedPrice?.totalGross?.centAmount,
      currency: parsedCart?.taxedPrice?.totalGross?.currencyCode
    });

    const processorURL = Context.getProcessorUrlFromContext();
    const sessionId = Context.getCtSessionIdFromContext();
    log.info("Context data:", {
      processorURL,
      sessionId
    });

    const paymentAmount = await this.ctCartService.getPaymentAmount({
      cart: ctCart,
    });
    log.info("Payment amount calculated:", paymentAmount);

    const paymentInterface = getPaymentInterfaceFromContext() || "mock";
    log.info("Payment interface:", paymentInterface);

    const ctPayment = await this.ctPaymentService.createPayment({
      amountPlanned: paymentAmount,
      paymentMethodInfo: {
        paymentInterface,
      },
      ...(ctCart.customerId && {
        customer: { typeId: "customer", id: ctCart.customerId },
      }),
      ...(!ctCart.customerId &&
        ctCart.anonymousId && {
          anonymousId: ctCart.anonymousId,
        }),
    });
    log.info("CT Payment created:", {
      id: ctPayment.id,
      amountPlanned: ctPayment.amountPlanned
    });

    await this.ctCartService.addPayment({
      resource: { id: ctCart.id, version: ctCart.version },
      paymentId: ctPayment.id,
    });

    // Generate transaction comments
    const transactionComments = `Novalnet Transaction ID: ${"N/A"}\nPayment Type: ${"N/A"}\nStatus: ${"N/A"}`;
    const pspReference = randomUUID().toString();

    // CREATE TRANSACTION (NO CUSTOM)
    const updatedPayment = await this.ctPaymentService.updatePayment({
      id: ctPayment.id,
      pspReference,
      paymentMethod: request.data.paymentMethod.type,
      transaction: {
        type: "Authorization",
        amount: ctPayment.amountPlanned,
        interactionId: pspReference,
        state: this.convertPaymentResultCode(request.data.paymentOutcome),
      } as unknown as any,
    } as any);

    // Attach empty typed field to avoid later validation issues (so setTransactionCustomField can be used)
    const attachResult = await this.attachEmptyTxCommentsTypeUsingField(ctPayment.id, pspReference, "transactionComments");
    log.info("attachEmptyTxCommentsTypeUsingField result (createPayments):", attachResult);

    const paymentRef    = (updatedPayment as any)?.id ?? ctPayment.id;
    const paymentCartId = ctCart.id;
    const orderNumber   = getFutureOrderNumberFromContext() ?? "";
    const ctPaymentId   = ctPayment.id;

    const url = new URL("/success", processorURL);
    url.searchParams.append("paymentReference", paymentRef);
    url.searchParams.append("ctsid", sessionId);
    url.searchParams.append("orderNumber", orderNumber);
    url.searchParams.append("ctPaymentID", ctPaymentId);
    url.searchParams.append("pspReference", pspReference);
    const returnUrl = url.toString();

    const ReturnurlContext = getMerchantReturnUrlFromContext();
    const novalnetPayload = {
      merchant: {
        signature: String(getConfig()?.novalnetPrivateKey ?? ""),
        tariff: String(getConfig()?.novalnetTariff ?? ""),
      },
      customer: {
        billing: {
          city: String(billingAddress?.city ?? "demo"),
          country_code: String(billingAddress?.country ?? "US"),
          house_no: String(billingAddress?.streetName ?? "10"),
          street: String(billingAddress?.streetName ?? "teststreet"),
          zip: String(billingAddress?.postalCode ?? "12345"),
        },
        shipping: {
          city: String(deliveryAddress?.city ?? "demoshipping"),
          country_code: String(deliveryAddress?.country ?? "US"),
          house_no: String(deliveryAddress?.streetName ?? "11"),
          street: String(deliveryAddress?.streetName ?? "testshippingstreet"),
          zip: String(deliveryAddress?.postalCode ?? "12345"),
        },
        first_name: "Max",
        last_name: "Mustermann",
        email: "abiraj_s@novalnetsolutions.com",
      },
      transaction: {
        test_mode: testMode === "1" ? "1" : "0",
        payment_type: type.toUpperCase(),
        amount: String(parsedCart?.taxedPrice?.totalGross?.centAmount ?? "100"),
        currency: String(parsedCart?.taxedPrice?.totalGross?.currencyCode ?? "EUR"),
        return_url: returnUrl,
        error_return_url: returnUrl,
        create_token: 1,
      },
      hosted_page: {
        display_payments: [type.toUpperCase()],
        hide_blocks: [
          "ADDRESS_FORM",
          "SHOP_INFO",
          "LANGUAGE_MENU",
          "HEADER",
          "TARIFF",
        ],
        skip_pages: ["CONFIRMATION_PAGE", "SUCCESS_PAGE", "PAYMENT_PAGE"],
      },
      custom: {
        input1: "paymentRef",
        inputval1: String(paymentRef ?? "no paymentRef"),
        input2: "ReturnurlContexts",
        inputval2: String(ReturnurlContext ?? "no merchantReturnURL"),
        input3: "currencyCode",
        inputval3: String(parsedCart?.taxedPrice?.totalGross?.currencyCode ?? "EUR"),
        input4: "customerEmail",
        inputval4: String(parsedCart.customerEmail ?? "Email not available"),
        input5: "getFutureOrderNumberFromContext",
        inputval5: String(orderNumber ?? "getFutureOrderNumberFromContext"),
      },
    };

    log.info("Full Novalnet payload:", JSON.stringify(novalnetPayload, null, 2));

    let parsedResponse: any = {};

    try {
      const novalnetResponse = await fetch(
        "https://payport.novalnet.de/v2/seamless/payment",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
          },
          body: JSON.stringify(novalnetPayload),
        },
      );

      log.info("Novalnet response status:", novalnetResponse.status);

      if (!novalnetResponse.ok) {
        throw new Error(`Novalnet API error: ${novalnetResponse.status}`);
      }

      parsedResponse = await novalnetResponse.json();
      log.info("Novalnet response parsed:", JSON.stringify(parsedResponse, null, 2));
    } catch (err) {
      log.error("Failed to process payment with Novalnet:", err);
      throw new Error("Payment initialization failed");
    }

    // Check for Novalnet API errors
    if (parsedResponse?.result?.status !== 'SUCCESS') {
      log.error("Novalnet API error - Status not SUCCESS:", {
        status: parsedResponse?.result?.status,
        statusText: parsedResponse?.result?.status_text,
        fullResponse: parsedResponse
      });
      throw new Error(parsedResponse?.result?.status_text || "Payment initialization failed");
    }
    const redirectResult = parsedResponse?.result?.redirect_url;
    const txnSecret = parsedResponse?.transaction?.txn_secret;
    if (!txnSecret) {
      log.error("No txn_secret in Novalnet response:", {
        transaction: parsedResponse?.transaction,
        fullResponse: parsedResponse
      });
      throw new Error("Payment initialization failed - missing transaction secret");
    }

    log.info("=== IDEAL PAYMENT SUCCESS ===, returning txn_secret:", txnSecret);
    return {
      paymentReference: paymentRef,
      txnSecret: redirectResult,
    };
  }

  // TEMP DEBUG helper — keep only while debugging
  public async debugUpdatePayment(payload: any, callerName = "unknown") {
    try {
      console.info("DEBUG updatePayment called by:", callerName, "payload.actions_length:", (payload.actions ?? []).length);
      if (Array.isArray(payload.actions) && payload.actions.length > 0) {
        console.info("DEBUG actions:", JSON.stringify(payload.actions, null, 2));
      }
      const res = await this.ctPaymentService.updatePayment(payload as any);
      console.info(`DEBUG updatePayment succeeded for ${callerName}`);
      return res;
    } catch (err: any) {
      console.error(`DEBUG updatePayment error for ${callerName}:`, err?.statusCode ?? err?.status, err?.body ?? err);
      throw err;
    }
  }

  public async handleTransaction(
    transactionDraft: TransactionDraftDTO,
  ): Promise<TransactionResponseDTO> {
    const TRANSACTION_AUTHORIZATION_TYPE: TransactionType = "Authorization";
    const TRANSACTION_STATE_SUCCESS: TransactionState = "Success";
    const TRANSACTION_STATE_FAILURE: TransactionState = "Failure";
    const maxCentAmountIfSuccess = 10000;

    const ctCart = await this.ctCartService.getCart({
      id: transactionDraft.cartId,
    });

    let amountPlanned = transactionDraft.amount;
    if (!amountPlanned) {
      amountPlanned = await this.ctCartService.getPaymentAmount({
        cart: ctCart,
      });
    }

    const isBelowSuccessStateThreshold =
      amountPlanned.centAmount < maxCentAmountIfSuccess;

    const newlyCreatedPayment = await this.ctPaymentService.createPayment({
      amountPlanned,
      paymentMethodInfo: {
        paymentInterface: transactionDraft.paymentInterface,
      },
    });

    await this.ctCartService.addPayment({
      resource: {
        id: ctCart.id,
        version: ctCart.version,
      },
      paymentId: newlyCreatedPayment.id,
    });

    const transactionState: TransactionState = isBelowSuccessStateThreshold
      ? TRANSACTION_STATE_SUCCESS
      : TRANSACTION_STATE_FAILURE;

    const pspReference = randomUUID().toString();

    await this.ctPaymentService.updatePayment({
      id: newlyCreatedPayment.id,
      pspReference: pspReference,
      transaction: {
        amount: amountPlanned,
        type: TRANSACTION_AUTHORIZATION_TYPE,
        state: transactionState,
        interactionId: pspReference,
      },
    });

    if (isBelowSuccessStateThreshold) {
      return {
        transactionStatus: {
          errors: [],
          state: "Pending",
        },
      };
    } else {
      return {
        transactionStatus: {
          errors: [
            {
              code: "PaymentRejected",
              message: `Payment '${newlyCreatedPayment.id}' has been rejected.`,
            },
          ],
          state: "Failed",
        },
      };
    }
  }

  private convertPaymentResultCode(resultCode: PaymentOutcome): string {
    switch (resultCode) {
      case PaymentOutcome.AUTHORIZED:
        return "Success";
      case PaymentOutcome.REJECTED:
        return "Failure";
      default:
        return "Initial";
    }
  }
}
