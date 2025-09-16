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

// declare NovalnetPaymentForm global (from checkout.js)
declare global {
  interface Window {
    NovalnetPaymentForm: new () => {
      initiate(config: Record<string, unknown>): void;
    };
  }
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

    // Render base template
    this.container.insertAdjacentHTML('afterbegin', this._getTemplate());

    try {
      // Preload call
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

      if (data?.result) {
        await this._initIframe(); // init iframe without setting src
      }
    } catch (err) {
      console.error('Error during preload fetch', err);
    }

    // Bind button
    if (this.showPayButton) {
      document
        .querySelector('#purchaseOrderForm-paymentButton')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

  private async _initIframe() {
    // load SDK script
    await this._loadScript();

    // insert iframe + hidden field (NO src attribute here)
    this.container?.insertAdjacentHTML(
      'beforeend',
      `
        <iframe
          style="width:100%; border:0; margin-left:-15px;"
          id="${this.iframeId}"
          allow="payment"
        ></iframe>
        <input type="hidden" id="${this.hiddenInputId}" name="nn_payment_details"/>
      `
    );

    // initialize iframe via SDK
    const paymentForm = new window.NovalnetPaymentForm();
    paymentForm.initiate({
      iframe: `#${this.iframeId}`,
      initForm: {
        orderInformation: {}, // TODO: pass order data if required
        setWalletPending: true,
        showButton: true,
      },
    });

    console.log('Novalnet iframe successfully initiated');
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
