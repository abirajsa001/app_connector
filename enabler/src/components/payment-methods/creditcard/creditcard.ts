import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod,
  BaseOptions,
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from '../../base';
import styles from '../../../style/style.module.scss';
import buttonStyles from '../../../style/button.module.scss';
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from '../../../dtos/mock-payment.dto';

export class CreditcardBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;

  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Creditcard(this.baseOptions, config);
  }
}

declare global {
  interface Window {
    NovalnetUtility?: any;
  }
}

export class Creditcard extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.creditcard, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string): void {
    const root = document.querySelector(selector);
    if (!root) return;
    root.innerHTML = this._getTemplate();

    const payButton = document.querySelector(
      '#purchaseOrderForm-paymentButton'
    ) as HTMLButtonElement | null;

    if (this.showPayButton && payButton) {
      payButton.disabled = true;
      payButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.submit();
      });
    }

    this._loadNovalnetScriptOnce()
      .then(() => this._initNovalnetCreditCardForm(payButton))
      .catch(() => {});
  }

  async submit(): Promise<void> {
    const panhashInput = document.getElementById('pan_hash') as HTMLInputElement;
    const uniqueIdInput = document.getElementById('unique_id') as HTMLInputElement;

    if (!panhashInput?.value) {
      const utility = window.NovalnetUtility;
      if (utility?.getPanHash) {
        try {
          await new Promise<void>((resolve, reject) => {
            utility.getPanHash();
            const check = setInterval(() => {
              if (panhashInput.value && uniqueIdInput.value) {
                clearInterval(check);
                resolve();
              }
            }, 200);
            setTimeout(() => {
              clearInterval(check);
              reject('Timeout');
            }, 5000);
          });
        } catch {
          return;
        }
      } else {
        return;
      }
    }

    try {
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: { type: 'CREDITCARD' },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(`${this.processorUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError?.('Error during payment processing');
      }
    } catch {
      this.onError?.('Error during payment processing');
    }
  }

  private _getTemplate(): string {
    const payButton = this.showPayButton
      ? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
      : '';

    return `
      <div class="${styles.wrapper}">
        <form class="${styles.paymentForm}" id="purchaseOrderForm">
          <iframe id="novalnet_iframe" frameborder="0" scrolling="no"></iframe>
          <input type="hidden" id="pan_hash" name="pan_hash" />
          <input type="hidden" id="unique_id" name="unique_id" />
          <input type="hidden" id="do_redirect" name="do_redirect" />
          ${payButton}
        </form>
      </div>
    `;
  }

  private async _loadNovalnetScriptOnce(): Promise<void> {
    if (window.NovalnetUtility) return;

    const src = 'https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js';
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing && (existing as any)._nnLoadingPromise) {
      await (existing as any)._nnLoadingPromise;
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';

    const loadPromise = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
    });

    (script as any)._nnLoadingPromise = loadPromise;
    document.head.appendChild(script);
    await loadPromise;
  }

  private _initNovalnetCreditCardForm(payButton: HTMLButtonElement | null): void {
    const NovalnetUtility = window.NovalnetUtility;
    if (!NovalnetUtility) return;

    NovalnetUtility.setClientKey('88fcbbceb1948c8ae106c3fe2ccffc12');

    const config = {
      callback: {
        on_success: (data: any) => {
          (document.getElementById('pan_hash') as HTMLInputElement).value = data.hash;
          (document.getElementById('unique_id') as HTMLInputElement).value = data.unique_id;
          (document.getElementById('do_redirect') as HTMLInputElement).value = data.do_redirect;
          if (payButton) payButton.disabled = false;
        },
        on_error: (data: any) => {
          if (data?.error_message) alert(data.error_message);
          if (payButton) payButton.disabled = true;
        },
      },
      iframe: {
        id: 'novalnet_iframe',
        inline: 1,
        style: { container: '', input: '', label: '' },
        text: {
          lang: 'EN',
          error: 'Invalid credit card details',
          card_holder: {
            label: 'Card holder name',
            place_holder: 'Name on card',
            error: 'Enter valid name',
          },
          card_number: {
            label: 'Card number',
            place_holder: 'XXXX XXXX XXXX XXXX',
            error: 'Enter valid card number',
          },
          expiry_date: {
            label: 'Expiry date',
            error: 'Enter valid expiry date',
          },
          cvc: {
            label: 'CVC/CVV/CID',
            place_holder: 'XXX',
            error: 'Enter valid code',
          },
        },
      },
      customer: {
        first_name: 'Max',
        last_name: 'Mustermann',
        email: 'test@novalnet.de',
        billing: {
          street: 'Musterstr, 2',
          city: 'Musterhausen',
          zip: '12345',
          country_code: 'DE',
        },
        shipping: {
          same_as_billing: 1,
          first_name: 'Max',
          last_name: 'Mustermann',
          email: 'test@novalnet.de',
          street: 'Hauptstr, 9',
          city: 'Kaiserslautern',
          zip: '66862',
          country_code: 'DE',
        },
      },
      transaction: {
        amount: 123,
        currency: 'EUR',
        test_mode: 1,
      },
      custom: {
        lang: 'EN',
      },
    };

    NovalnetUtility.createCreditCardForm(config);
  }
}
