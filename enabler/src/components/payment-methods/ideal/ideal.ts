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
// import { getConfig } from "../../../config/config";

export class IdealBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Ideal(this.baseOptions, config);
  }
}

export class Ideal extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.ideal, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {
    document
      .querySelector(selector)
      .insertAdjacentHTML("afterbegin", this._getTemplate());

    if (this.showPayButton) {
      document
        .querySelector("#purchaseOrderForm-paymentButton")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

  async submit() {
    this.sdk.init({ environment: this.environment });
    console.log('submit-triggered');

    try {
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: this.paymentMethod,
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(this.processorUrl + "/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      console.log('Payment response:', data);

      if (data.paymentReference) {
        this.setupRedirectListener();
        const paymentWindow = window.open(
          data.paymentReference,
          'novalnet_payment',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (!paymentWindow) {
          window.location.href = data.paymentReference;
        }
      } else {
        this.onError("Payment initialization failed. Please try again.");
      }

    } catch (e) {
      console.error('Payment submission error:', e);
      this.onError("Some error occurred. Please try again.");
    }
  }

  private setupRedirectListener() {
    const messageHandler = (event: MessageEvent) => {
      console.log('Received payment message:', event.data);
      
      if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
        window.removeEventListener('message', messageHandler);
        
        this.onComplete && this.onComplete({
          isSuccess: true,
          paymentReference: event.data.paymentReference,
        });
      } else if (event.data && event.data.type === 'PAYMENT_FAILURE') {
        window.removeEventListener('message', messageHandler);
        
        this.onComplete && this.onComplete({
          isSuccess: false,
          paymentReference: event.data.paymentReference,
        });
      }
    };
    
    window.addEventListener('message', messageHandler);
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
    }, 300000);
  }

  private _getTemplate() {
    return this.showPayButton
      ? `
    <div class="${styles.wrapper}">
      <p>Pay easily with Ideal and transfer the shopping amount within the specified date.</p>
      <button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>
    </div>
    `
      : "";
  }
}
