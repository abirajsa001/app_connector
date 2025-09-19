import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from '../../base';
import styles from '../../../style/style.module.scss';
import buttonStyles from '../../../style/button.module.scss';
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from '../../../dtos/mock-payment.dto';
import { BaseOptions } from '../../../payment-enabler/payment-enabler-mock';
// import  '../../../js/payment_form.js';

// declare NovalnetPaymentForm global
declare class NovalnetPaymentForm {
  initiate(config: Record<string, unknown>): void;
  getPayment(callback: (data: any) => void): void;
  walletResponse(config: { onProcessCompletion: (response: any) => Promise<any> }): void;
  selectedPayment(callback: (data: any) => void): void;
}

export class PrepaymentBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Prepayment(this.baseOptions, config);
  }
}

export class Prepayment extends BaseComponent {
  private showPayButton: boolean;
  private container?: Element;
  private iframeId = 'novalnet_iframe';
  private hiddenInputId = 'nn_payment_details';
  private scriptUrl = 'https://cdn.novalnet.de/js/pv13/checkout.js';

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.prepayment, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  async mount(selector: string) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      console.error(`Mount failed: container ${selector} not found`);
      return;
    }

    // Render template
    this.container.insertAdjacentHTML('afterbegin', this._getTemplate());

    // Preload call (fetch + initiate)
    try {
      const response = await fetch(this.processorUrl + '/v13', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify({ init: true }),
      });

      const data = await response.json();
      console.log('Preload response', data);

      if (data?.result?.redirect_url) {
        await this._initIframe(data.result.redirect_url);
      }
    } catch (err) {
      console.error('Error during preload fetch', err);
    }

    // bind button
    if (this.showPayButton) {
      document
        .querySelector('#purchaseOrderForm-paymentButton')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

private async _initIframe(redirectUrl: string) {
  await this._loadScript();

  this.container?.insertAdjacentHTML(
    'beforeend',
    `
      <iframe
        style="width:100%; border:0; margin-left:-15px;"
        id="${this.iframeId}"
        src="${redirectUrl}"
        allow="payment"
      ></iframe>
      <input type="hidden" id="${this.hiddenInputId}" name="nn_payment_details"/>
    `
  );

  const v13PaymentForm = new NovalnetPaymentForm();
  v13PaymentForm.initiate({
      iframe: `#${this.iframeId}`,
      initForm: {
        orderInformation: {},
        setWalletPending: true,
        showButton: true,
      },
  });

  v13PaymentForm.getPayment((data) => {
    if (data.result.status === 'ERROR') {
      console.log('get-payment-error', data);
      return false;
    } else {
      console.log('get-payment-success', data);
      return true;
    }
  });


  v13PaymentForm.selectedPayment((data) => {
    console.log('selected-payment', data);
  });

  console.log('Novalnet iframe initiated');
}


  private _loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${this.scriptUrl}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = this.scriptUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${this.scriptUrl}`));
      document.head.appendChild(script);
    });
  }

  async submit() {
    this.sdk.init({ environment: this.environment });
    console.log('submit-triggered');

    const requestData: PaymentRequestSchemaDTO = {
      paymentMethod: {
        type: 'PREPAYMENT',
      },
      paymentOutcome: PaymentOutcome.AUTHORIZED,
    };

    try {
      const response = await fetch(this.processorUrl + '/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify(requestData),
      });
      const data = await response.json();
      console.log('Submit response', data);

      if (data.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError('Some error occurred. Please try again.');
      }
    } catch (e) {
      this.onError('Some error occurred. Please try again.');
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
      : '';
  }
}
