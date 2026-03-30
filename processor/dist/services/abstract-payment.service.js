"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractPaymentService = void 0;
const connect_payments_sdk_1 = require("@commercetools/connect-payments-sdk");

class AbstractPaymentService {
    ctCartService;
    ctPaymentService;
    constructor(ctCartService, ctPaymentService) {
        this.ctCartService = ctCartService;
        this.ctPaymentService = ctPaymentService;
    }
    /**
     * Modify payment
     *
     * @remarks
     * This method is used to execute Capture/Cancel/Refund payment in external PSPs and update composable commerce. The actual invocation to PSPs should be implemented in subclasses
     *
     * @param opts - input for payment modification including payment ID, action and payment amount
     * @returns Promise with outcome of payment modification after invocation to PSPs
     */
    async modifyPayment(opts) {
        const ctPayment = await this.ctPaymentService.getPayment({
            id: opts.paymentId,
        });
    }
}
exports.AbstractPaymentService = AbstractPaymentService;
