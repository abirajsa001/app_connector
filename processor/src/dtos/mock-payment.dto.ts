import { Static, Type } from '@sinclair/typebox';

// ENUMS
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

// SCHEMAS
export const PaymentResponseSchema = Type.Object({
  paymentReference: Type.String(),
});

export const PaymentRequestSchema = Type.Object({
  paymentMethod: Type.Object({
    type: Type.String(),
    poNumber: Type.Optional(Type.String()),
    invoiceMemo: Type.Optional(Type.String()),
  }),
  paymentOutcome: Type.Enum(PaymentOutcome),
});

export const CreatePaymentRequestSchema = Type.Object({
  interfaceId: Type.String(),
  status: Type.String(),
  source: Type.String(),
});

// TYPES
export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;
export type PaymentResponseSchemaDTO = Static<typeof PaymentResponseSchema>;
export type CreatePaymentRequestDTO = Static<typeof CreatePaymentRequestSchema>;
