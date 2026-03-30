"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentIntentResponseSchema = exports.PaymentModificationStatus = exports.PaymentIntentRequestSchema = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.AmountSchema = typebox_1.Type.Object({
    centAmount: typebox_1.Type.Integer(),
    currencyCode: typebox_1.Type.String(),
});
/**
 * Payment intent request schema.
 *
 * Example:
 * {
 *  "actions": [
 *   {
 *    "action": "capturePayment",
 *    "amount": {
 *      "centAmount": 100,
 *      "currencyCode": "EUR"
 *    }
 *  ]
 * }
 */
var PaymentModificationStatus;
(function (PaymentModificationStatus) {
    PaymentModificationStatus["APPROVED"] = "approved";
    PaymentModificationStatus["REJECTED"] = "rejected";
    PaymentModificationStatus["RECEIVED"] = "received";
})(PaymentModificationStatus || (exports.PaymentModificationStatus = PaymentModificationStatus = {}));
const PaymentModificationSchema = typebox_1.Type.Enum(PaymentModificationStatus);
exports.PaymentIntentResponseSchema = typebox_1.Type.Object({
    outcome: PaymentModificationSchema,
});
