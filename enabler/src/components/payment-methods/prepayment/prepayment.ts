import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod,
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from "../../base";
import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/mock-payment.dto";
import { BaseOptions } from "../../../payment-enabler/payment-enabler-mock";

export class PrepaymentBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Prepayment(this.baseOptions, config);
  }
}

export class Prepayment extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.prepayment, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string): void {
    // render template
    document
      .querySelector(selector)
      .insertAdjacentHTML("afterbegin", this._getTemplate());

    // preload in background (don’t await)
    this._preload();

    // bind button handler
    if (this.showPayButton) {
      document
        .querySelector("#purchaseOrderForm-paymentButton")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

  private async _preload(): Promise<void> {
    const requestData: PaymentRequestSchemaDTO = {
      paymentMethod: { type: "PREPAYMENT" },
      paymentOutcome: PaymentOutcome.AUTHORIZED,
    };

    try {
      const response = await fetch(this.processorUrl + "/v13", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log("preload response", data);
      this.preloadData = data;
    } catch (err) {
      console.error("Error while preloading payment data", err);
    }
  }

  async submit(): Promise<void> {
    this.sdk.init({ environment: this.environment });
    console.log("submit-triggered");

    try {
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: { type: "PREPAYMENT" },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(this.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log("submit response", data);

      if (data.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError("Some error occurred. Please try again.");
      }
    } catch (e) {
      this.onError("Some error occurred. Please try again.");
    }
  }

  private _getTemplate(): string {
    return this.showPayButton
      ? `
        <div class="${styles.wrapper}">
          <p>Pay easily with Prepayment and transfer the shopping amount within the specified date.</p>
          <button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>
        </div>
      `
      : "";
  }
}
