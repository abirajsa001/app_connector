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

export class CreditcardBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Creditcard(this.baseOptions, config);
  }
}

export class Creditcard extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.creditcard, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  async submit() {
    this.sdk.init({ environment: this.environment });
    console.log('submit-triggered');

    try {
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "CREDIT_CARD",
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      console.log('requestData', requestData);

      const response = await fetch(this.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('responseData', data);

      if (data.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError("Some error occurred. Please try again.");
      }

    } catch (e) {
      console.error(e);
      this.onError("Some error occurred. Please try again.");
    }
  }

	private _getTemplate() {
	  const payButton = this.showPayButton
		? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
		  : "";

	  return `
	   <script src="https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js" integrity="sha384-wRpaQDgV62dqZ/HthwD84Gs9Mgxg5u5PrND0zS9L5rjOdWE8nTDLq+fdsCxbnj6K"  crossorigin="anonymous"></script>
		<div class="${styles.wrapper}">
		  <form class="${styles.paymentForm}" id="purchaseOrderForm">
			<iframe id="novalnet_iframe" frameborder="0" scrolling="no"></iframe>
			<input type="hidden" id="pan_hash" name="pan_hash"/>
			<input type="hidden" id="unique_id" name="unique_id"/>
			<input type="hidden" id="do_redirect" name="do_redirect"/>
			<input type="submit" name="submit" id="submit" value="submit">
			${payButton}
		  </form>
		</div>
	  `;
	}
}
