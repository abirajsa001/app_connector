import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod,
} from "../../../payment-enabler/payment-enabler";

import { BaseComponent } from "../../base";
import styles from "../../../style/style.module.scss";
import buttonStyles from "../../../style/button.module.scss";

import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/mock-payment.dto";

import { BaseOptions } from "../../../payment-enabler/payment-enabler-mock";

/* ============================================================================
   BUILDER
============================================================================ */
export class CreditcardBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;

  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Creditcard(this.baseOptions, config);
  }
}

/* ============================================================================
   CREDIT CARD COMPONENT
============================================================================ */
export class Creditcard extends BaseComponent {
  private initialized = false;
  private showPayButton = false;

  private clientKey = "";
  private json: any = {};

  constructor(baseOptions: BaseOptions, options: ComponentOptions) {
    super(PaymentMethod.creditcard, baseOptions, options);
    this.showPayButton = options?.showPayButton ?? false;
  }

  /* =========================================================================
     MOUNT
  ========================================================================= */
  mount(selector: string) {
    if (typeof window === "undefined") return;

    const root = document.querySelector(selector);
    if (!root) {
      console.error("Creditcard mount selector not found:", selector);
      return;
    }

    root.insertAdjacentHTML("afterbegin", this.template());

    const payButton = document.getElementById(
      "purchaseOrderForm-paymentButton"
    ) as HTMLButtonElement | null;

    if (payButton) {
      payButton.disabled = true;

      payButton.onclick = (e) => {
        e.preventDefault();

        const panHash = (document.getElementById("pan_hash") as HTMLInputElement)
          ?.value;
        const uniqueId = (document.getElementById("unique_id") as HTMLInputElement)
          ?.value;

        // If token already exists → submit
        if (panHash && uniqueId) {
          this.submit();
          return;
        }

        // Otherwise generate PAN hash
        (window as any).NovalnetUtility?.getPanHash();
      };
    }

    /** initialize ONLY when credit card is selected */
    document.addEventListener("click", (event: any) => {
      if (
        event?.target?.name === "payment-selector-list" &&
        event.target.value?.startsWith("creditcard-")
      ) {
        this.initialize(payButton);
      }
    });
  }

  /* =========================================================================
     INITIALIZE (ONCE)
  ========================================================================= */
  private async initialize(payButton: HTMLButtonElement | null) {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await this.loadNovalnetScript();
      await this.getConfigValues();
      await this.loadCustomerAddress();
      await this.initIframe(payButton);
    } catch (err) {
      console.error("Credit card init failed:", err);
      this.onError?.("Failed to initialize credit card payment.");
    }
  }

  /* =========================================================================
     TEMPLATE
  ========================================================================= */
  private template() {
    const payButton = this.showPayButton
      ? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
      : "";

    return `
      <div class="${styles.wrapper}">
        <iframe id="novalnet_iframe" frameborder="0" scrolling="no"></iframe>

        <input type="hidden" id="pan_hash" />
        <input type="hidden" id="unique_id" />
        <input type="hidden" id="do_redirect" />

        ${payButton}
      </div>
    `;
  }

  /* =========================================================================
     LOAD NOVALNET SCRIPT
  ========================================================================= */
  private loadNovalnetScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).NovalnetUtility) return resolve();

      const script = document.createElement("script");
      script.src = "https://cdn.novalnet.de/js/v2/NovalnetUtility.js";
      script.onload = () => resolve();
      script.onerror = () => reject("Failed to load NovalnetUtility");

      document.head.appendChild(script);
    });
  }

  /* =========================================================================
     LOAD CLIENT KEY
  ========================================================================= */
  private async getConfigValues() {
    const response = await fetch(this.processorUrl + "/getconfig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: { type: "CREDITCARD" },
        paymentOutcome: "AUTHORIZED",
      }),
    });

    const json = await response.json();

    if (!json?.paymentReference) {
      throw new Error("Client key missing");
    }

    this.clientKey = String(json.paymentReference);
    (window as any).NovalnetUtility.setClientKey(this.clientKey);
  }

  /* =========================================================================
     LOAD CUSTOMER DETAILS
  ========================================================================= */
  private async loadCustomerAddress() {
    const response = await fetch(this.processorUrl + "/getCustomerAddress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": this.sessionId,
      },
      body: JSON.stringify({
        paymentMethod: { type: "CREDITCARD" },
        paymentOutcome: "AUTHORIZED",
      }),
    });

    if (!response.ok) return;

    this.json = await response.json();

    this.firstName = this.json?.firstName ?? "";
    this.lastName = this.json?.lastName ?? "";
    this.email = this.json?.email ?? "";
  }

  /* =========================================================================
     INIT CREDIT CARD IFRAME (FINAL FIX)
  ========================================================================= */
  private async initIframe(payButton: HTMLButtonElement | null) {
    const NovalnetUtility = (window as any).NovalnetUtility;

    NovalnetUtility.createCreditCardForm({
      iframe: {
        id: "novalnet_iframe",
        inline: 1,
        style: {
          width: "100%",
          height: "180px",
        },
      },

      customer: {
        first_name: this.firstName,
        last_name: this.lastName,
        email: this.email,
        billing: {
          street: this.json?.billingAddress?.streetName,
          city: this.json?.billingAddress?.city,
          zip: this.json?.billingAddress?.postalCode,
          country_code: this.json?.billingAddress?.country,
        },
      },

      callback: {
        on_submit: (data: any) => {
          console.log("Novalnet on_submit:", data);

          if (!data?.hash || !data?.unique_id) {
            this.onError?.("Invalid card details");
            return false;
          }

          (document.getElementById("pan_hash") as HTMLInputElement).value =
            data.hash;
          (document.getElementById("unique_id") as HTMLInputElement).value =
            data.unique_id;
          (document.getElementById("do_redirect") as HTMLInputElement).value =
            data.do_redirect ?? "0";

          if (payButton) payButton.disabled = false;

          return true;
        },

        on_error: (error: any) => {
          console.error("Novalnet error:", error);
          this.onError?.(error?.error_message || "Card validation failed");
          return false;
        },
      },
    });
  }

  /* =========================================================================
     SUBMIT PAYMENT
  ========================================================================= */
  async submit() {
    try {
      const panHash = (document.getElementById("pan_hash") as HTMLInputElement)
        ?.value;
      const uniqueId = (document.getElementById("unique_id") as HTMLInputElement)
        ?.value;

      if (!panHash || !uniqueId) {
        this.onError?.("Missing credit card token");
        return;
      }

      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "CREDITCARD",
          panHash,
          uniqueId,
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(this.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data?.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError?.("Payment failed");
      }
    } catch (err) {
      console.error(err);
      this.onError?.("Unexpected payment error");
    }
  }
}
