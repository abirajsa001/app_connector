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
    // here we would call the SDK to submit the payment
    this.sdk.init({ environment: this.environment });
    console.log('submit-triggered');
    try {
      // start original
 
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "CREDIT_CARD",
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
  		<script>
   		 NovalnetUtility.setClientKey("88fcbbceb1948c8ae106c3fe2ccffc12");
		var configurationObject = {
		callback: {
			on_success: function (data) {
				document.getElementById('pan_hash').value = data ['hash'];
				document.getElementById('unique_id').value = data ['unique_id'];
				document.getElementById('do_redirect').value = data ['do_redirect'];
				return true;
			},
			
			on_error:  function (data) {
				if ( undefined !== data['error_message'] ) {
					alert(data['error_message']);
					return false;
				}
			},
			on_show_overlay:  function (data) {
				document.getElementById('novalnet_iframe').classList.add(".overlay");
			},
			on_hide_overlay:  function (data) {
				document.getElementById('novalnet_iframe').classList.remove(".overlay");
			}
		},
		
		iframe: {
			id: "novalnet_iframe",
			inline: 1,
			style: {
				container: "",
				input: "",
				label: ""
			},
			
			text: {
				lang : "EN",
				error: "Your credit card details are invalid",
				card_holder : {
					label: "Card holder name",
					place_holder: "Name on card",
					error: "Please enter the valid card holder name"
				},
				card_number : {
					label: "Card number",
					place_holder: "XXXX XXXX XXXX XXXX",
					error: "Please enter the valid card number"
				},
				expiry_date : {
					label: "Expiry date",
					error: "Please enter the valid expiry month / year in the given format"
				},
				cvc : {
					label: "CVC/CVV/CID",
					place_holder: "XXX",
					error: "Please enter the valid CVC/CVV/CID"
				}
			}
		},
		
		customer: {
			first_name: "Max",
			last_name: "Mustermann",
			email: "test@novalnet.de",
			billing: {
				street: "Musterstr, 2",
				city: "Musterhausen",
				zip: "12345",
				country_code: "DE"
			},
			shipping: {
				"same_as_billing": 1,
				first_name: "Max",
				last_name: "Mustermann",
				email: "test@novalnet.de",
				street: "Hauptstr, 9",
				city: "Kaiserslautern",
				zip: "66862",
				country_code: "DE"
			},
		},
		
		transaction: {
			amount: 123,
			currency: "EUR",
			test_mode: 1
		},
		custom: {
			lang: "EN"
		}
	}
	
	NovalnetUtility.createCreditCardForm(configurationObject);
 </script>
	  `;
	}
}
