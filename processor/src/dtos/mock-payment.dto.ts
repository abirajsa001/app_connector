import { Type, Static } from '@sinclair/typebox';

// Payment Request
export const PaymentRequestSchema = Type.Object({
  amountPlanned: Type.Number(),
  currency: Type.String(),
  paymentMethod: Type.String(),
});

export type PaymentRequestSchemaDTO = Static<typeof PaymentRequestSchema>;

// Redirect Request
export const CreatePaymentRequestSchema = Type.Object({
  interfaceId: Type.String(),
  status: Type.String(),
  source: Type.String(),
});

export type CreatePaymentRequestDTO = Static<typeof CreatePaymentRequestSchema>;

// Payment Response
export const PaymentResponseSchema = Type.Object({
  paymentReference: Type.String(),
});

export type PaymentResponseSchemaDTO = Static<typeof PaymentResponseSchema>;
