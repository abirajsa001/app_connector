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

      if (data.txnSecret) {
        // Set up Novalnet message listener
        this.setupNovalnetListener();
        
        // Create Novalnet payment page URL with txn_secret
        const paymentPageUrl = `${this.processorUrl}/novalnet-payment?txn_secret=${data.txnSecret}`;
        // // Open Novalnet child window for payment
        // const width = 800;
        // const height = 600;
        // const left = (screen.width - width) / 2;
        // const top = (screen.height - height) / 2;
        
        // window.open(
        //   paymentPageUrl,
        //   'novalnet_payment',
        //   `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        // );
      } else {
        this.onError("Payment initialization failed. Please try again.");
      }

    } catch (e) {
      console.error('Payment submission error:', e);
      this.onError("Some error occurred. Please try again.");
    }
  }

  private setupNovalnetListener() {
    const messageHandler = (event: MessageEvent) => {
      console.log('Received Novalnet message:', event.data);
      
      if (event.origin === 'https://paygate.novalnet.de') {
        try {
          const jsonData = JSON.parse(event.data);
          
          if (jsonData.status_code == '100' || jsonData.status == 100) {
            // Payment success
            window.removeEventListener('message', messageHandler);
            
            this.onComplete && this.onComplete({
              isSuccess: true,
              paymentReference: jsonData.tid || jsonData.transaction?.tid,
            });
          } else if (jsonData.nnpf_postMsg == 'payment_cancel') {
            // Payment cancelled
            window.removeEventListener('message', messageHandler);
            
            this.onComplete && this.onComplete({
              isSuccess: false,
              paymentReference: jsonData.tid || 'cancelled',
            });
          }
        } catch (e) {
          console.error('Error parsing Novalnet response:', e);
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Cleanup after timeout
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
