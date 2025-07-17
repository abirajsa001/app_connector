import { Static, Type } from '@sinclair/typebox';

// --- Enums ---
export enum PaymentOutcome {
  AUTHORIZED = 'Authorized',
  REJECTED = 'Rejected',
}

export enum PaymentMethodType {
  CARD = 'card',
  INVOICE = 'invoice',
  PREPAYMENT = 'prepayment',
  IDEAL = 'ideal',
}

// --- Schemas ---
export const PaymentResponseSchema = Type.Object({
  paymentReference: Type.String(),
});

export const PaymentOutcomeSchema = Type.Enum(PaymentOutcome);

export const PaymentRequestSchema = Type.Object({
  paymentMethod: Type.Object({
    type: Type.String(),
    poNumber: Type.Optional(Type.String()),
    invoiceMemo: Type.Optional(Type.String()),
  }),
  paymentOutcome: PaymentOutcomeSchema,
});

export const CreatePaymentRequestSchema = Type.Object({
  interfaceId: Type.String(),
  status: Type.String(),
  source: Type.String(),
});

// --- DTO Types ---
export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;
export type PaymentResponseSchemaDTO = Static<typeof PaymentResponseSchema>;
export type CreatePaymentRequestDTO = Static<typeof CreatePaymentRequestSchema>;

// Optional wrapper for passing `{ data: CreatePaymentRequestDTO }` into service
export type CreatePaymentRequest = {
  data: CreatePaymentRequestDTO;
};
