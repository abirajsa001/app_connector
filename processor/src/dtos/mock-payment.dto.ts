import { Static, Type } from '@sinclair/typebox';

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

// Response schema for any payment response
export const PaymentResponseSchema = Type.Object({
  paymentReference: Type.String(),
});
export type PaymentResponseSchemaDTO = Static<typeof PaymentResponseSchema>;

// Schema for incoming payment creation requests
export const CreatePaymentRequestSchema = Type.Object({
  interfaceId: Type.String(),
  status: Type.String(),
  source: Type.String(),
});
export type CreatePaymentRequestDTO = Static<typeof CreatePaymentRequestSchema>;

// Schema for original POST /payments body (used in /payments route)
export const PaymentRequestSchema = Type.Object({
  paymentMethod: Type.Object({
    type: Type.String(),
    poNumber: Type.Optional(Type.String()),
    invoiceMemo: Type.Optional(Type.String()),
  }),
  paymentOutcome: Type.Enum(PaymentOutcome),
});
export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;

// Optional: If your service method accepts an object with "data" key:
export type CreatePaymentRequest = {
  data: CreatePaymentRequestDTO;
};
