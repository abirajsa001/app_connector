 import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
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

async mount(selector: string) {
  // render template
  const container = document.querySelector(selector);
  if (container) {
    container.insertAdjacentHTML("afterbegin", this._getTemplate());
  } else {
    console.error(`Mount failed: container ${selector} not found`);
    return;
  }

  // preload call
  try {
    const response = await fetch(this.processorUrl + "/v13", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": this.sessionId,
      },
      body: JSON.stringify({ init: true }),
    });

    const data = await response.json();
    console.log("Preload response", data);
  } catch (err) {
    console.error("Error during preload fetch", err);
  }

  // bind button
  if (this.showPayButton) {
    document
      .querySelector("#purchaseOrderForm-paymentButton")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.submit();
      });
  }
}


  async submit() {
    // here we would call the SDK to submit the payment
    this.sdk.init({ environment: this.environment });
    console.log('submit-triggered');
    try {
      // start original
 
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "PREPAYMENT",
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };
      console.log('requestData');
    console.log(requestData);
     
      const response = await fetch(this.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });
      console.log('responseData-newdata');
      console.log(response);
      console.log(response);
      const data = await response.json();
      console.log(data);
      if (data.paymentReference) {
        this.onComplete &&
          this.onComplete({
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

  private _getTemplate() {
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
