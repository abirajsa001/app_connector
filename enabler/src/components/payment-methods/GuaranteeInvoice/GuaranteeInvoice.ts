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
  } from "../../../dtos/novalnet-payment.dto";
  import { BaseOptions } from "../../../payment-enabler/payment-enabler-mock";
  
  export class GuaranteeInvoiceBuilder implements PaymentComponentBuilder {
    public componentHasSubmit = true;
    constructor(private baseOptions: BaseOptions) {}
  
    build(config: ComponentOptions): PaymentComponent {
      return new GuaranteeInvoice(this.baseOptions, config);
    }
  }
  
  export class GuaranteeInvoice extends BaseComponent {
    private showPayButton: boolean;
  
    constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
      super(PaymentMethod.GuaranteeInvoice, baseOptions, componentOptions);
      this.showPayButton = componentOptions?.showPayButton ?? false;
    }
    
    mount(selector: string) {
      document
        .querySelector(selector)
        .insertAdjacentHTML("afterbegin", this._getTemplate());
  
        // ✅ Birthdate auto-format: DD-MM-YYYY
        const birthdateInput = document.getElementById("nn_birthdate") as HTMLInputElement;

        if (birthdateInput) {
            birthdateInput.addEventListener("input", () => {
            let value = birthdateInput.value.replace(/\D/g, ""); // numbers only
        
            if (value.length > 2) value = value.slice(0, 2) + "-" + value.slice(2);
            if (value.length > 5) value = value.slice(0, 5) + "-" + value.slice(5, 9);
        
            birthdateInput.value = value;
            });
        }


      if (this.showPayButton) {
        document
          .querySelector("#GuaranteeInvoiceForm-paymentButton")
          .addEventListener("click", (e) => {
            e.preventDefault();
            this.submit();
          });
      }
    }
  
    async submit() {
      // here we would call the SDK to submit the payment
      this.sdk.init({ environment: this.environment });
      const pathLocale = window.location.pathname.split("/")[1];
      const url = new URL(window.location.href);
      const baseSiteUrl = url.origin;
  
      try {
        const birthdateInput = document.getElementById("nn_birthdate") as HTMLInputElement;
        const birthdate = birthdateInput?.value.trim() ?? "";
        console.log('birthdate');
        console.log(birthdate);
        const requestData: PaymentRequestSchemaDTO = {
          paymentMethod: {
            type: "INVOICE",
          },
          paymentOutcome: PaymentOutcome.AUTHORIZED,
        };
       
        const response = await fetch(this.processorUrl + "/directPayment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": this.sessionId,
          },
          body: JSON.stringify(requestData),
        });
        const data = await response.json();
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
        ? `
      <div class="${styles.wrapper}">
        <p>Pay easily with GuaranteeInvoice and transfer the shopping amount within the specified date.</p>
        <button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="GuaranteeInvoiceForm-paymentButton">Pay</button>
      </div>
      `
        : "";
        return `
        <div style="width:100%; display:flex; flex-direction:column;">
          <script type="text/javascript" src="https://cdn.novalnet.de/js/v2/NovalnetUtility.js"></script>

            <!-- Birthdate -->
            <div style="display:flex; flex-direction:column; width:100%;">
            <label for="nn_birthdate"
                style="font-size:14px; font-weight:600; color:#333; margin-bottom:6px;"
            >
                Birthdate (DD-MM-YYYY) <span style="color:red;">*</span>
            </label>

            <input
                type="text"
                id="nn_birthdate"
                name="nn_birthdate"
                placeholder="DD-MM-YYYY"
                maxlength="10"
                style="
                padding:12px 14px;
                border:1.5px solid #d4d4d4;
                border-radius:6px;
                font-size:15px;
                transition:all 0.2s ease-in-out;
                "
            />

            <span
                id="nn_birthdate_error"
                style="
                display:none;
                margin-top:4px;
                font-size:12px;
                color:#d70000;
                "
            >Invalid birthdate</span>
            </div> 
        </form>
        </div>
      `;     

    }
  }
  