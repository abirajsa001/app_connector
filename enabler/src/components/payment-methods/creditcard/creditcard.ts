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
    // Inject the form into the DOM
    document
      .querySelector(selector)
      .insertAdjacentHTML("afterbegin", this._getTemplate());

    const payButton = document.querySelector("#purchaseOrderForm-paymentButton") as HTMLButtonElement;
    if (payButton) {
      payButton.disabled = true;
    }

    // Set Novalnet client key (replace with actual key)
    NovalnetUtility.setClientKey("88fcbbceb1948c8ae106c3fe2ccffc12");

    const configurationObject = {
      callback: {
        on_success: function (data) {
          (document.getElementById("pan_hash") as HTMLInputElement).value = data["hash"];
          (document.getElementById("unique_id") as HTMLInputElement).value = data["unique_id"];
          (document.getElementById("do_redirect") as HTMLInputElement).value = data["do_redirect"];
          if (payButton) {
            payButton.disabled = false;
          }
          return true;
        },
        on_error: function (data) {
          if (data["error_message"] !== undefined) {
            alert(data["error_message"]);
            if (payButton) {
              payButton.disabled = true;
            }
            return false;
          }
        },
        on_show_overlay: function () {
          document.getElementById("novalnet_iframe").classList.add("overlay");
        },
        on_hide_overlay: function () {
          document.getElementById("novalnet_iframe").classList.remove("overlay");
        },
      },
      iframe: {
        id: "novalnet_iframe",
        inline: 1,
        style: {
          container: "",
          input: "",
          label: "",
        },
        text: {
          lang: "EN",
          error: "Your credit card details are invalid",
          card_holder: {
            label: "Card holder name",
            place_holder: "Name on card",
            error: "Please enter the valid card holder name",
          },
          card_number: {
            label: "Card number",
            place_holder: "XXXX XXXX XXXX XXXX",
            error: "Please enter the valid card number",
          },
          expiry_date: {
            label: "Expiry date",
            error: "Please enter the valid expiry month / year in the given format",
          },
          cvc: {
            label: "CVC/CVV/CID",
            place_holder: "XXX",
            error: "Please enter the valid CVC/CVV/CID",
          },
        },
      },
      customer: {
        first_name: "Max",
        last_name: "Mustermann",
        email: "test@novalnet.de",
        billing: {
          street: "Musterstr, 2",
          city: "Musterhausen",
          zip: "12345",
          country_code: "DE",
        },
        shipping: {
          same_as_billing: 1,
          first_name: "Max",
          last_name: "Mustermann",
          email: "test@novalnet.de",
          street: "Hauptstr, 9",
          city: "Kaiserslautern",
          zip: "66862",
          country_code: "DE",
        },
      },
      transaction: {
        amount: 100,
        currency: "EUR",
        test_mode: 1,
      },
      custom: {
        lang: "EN",
      }
    };

    NovalnetUtility.createCreditCardForm(configurationObject);

    // Attach submit handler if pay button is visible
    if (this.showPayButton && payButton) {
      payButton.addEventListener("click", (e) => {
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
    const payButtonHtml = this.showPayButton
      ? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
      : "";

    return `
      <script 
        src="https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js" 
        integrity="sha384-wRpaQDgV62dqZ/HthwD84Gs9Mgxg5u5PrND0zS9L5rjOdWE8nTDLq+fdsCxbnj6K" 
        crossorigin="anonymous">
      </script>

      <div class="${styles.wrapper}">
        <form 
          class="${styles.paymentForm}" 
          id="payment_form" 
          name="payment_form" 
          action="/confirmation" 
          method="POST">

          <iframe 
            id="novalnet_iframe" 
            frameborder="0" 
            scrolling="no"
            style="width: 100%; height: auto;">
          </iframe>

          <input type="hidden" id="pan_hash" name="pan_hash" />
          <input type="hidden" id="unique_id" name="unique_id" />
          <input type="hidden" id="do_redirect" name="do_redirect" />
          <input type="submit" name="submit" id="submit" value="submit" style="display: none;" />

          ${payButtonHtml}
        </form>
      </div>
    `;
  }
}
