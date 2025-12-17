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
  private customer: any = {};

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
        (window as any).NovalnetUtility?.getPanHash();
      };
    }

    // Wait until credit card is selected
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
     INITIALIZE (ONLY ONCE)
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
      this.onError?.("Failed to load credit card form.");
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
          <input type="hidden" id="pan_hash" name="pan_hash"/>
          <input type="hidden" id="unique_id" name="unique_id"/>
          <input type="hidden" id="do_redirect" name="do_redirect"/>
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
      script.type = "text/javascript";
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentMethod: { type: "CREDITCARD" },
        paymentOutcome: "AUTHORIZED",
      }),
    });

    const json = await response.json();

    if (!json?.paymentReference) {
      throw new Error("Missing client key");
    }

    this.clientKey = String(json.paymentReference);
    console.log('clientKey');
    console.log(this.clientKey);
    (window as any).NovalnetUtility.setClientKey(this.clientKey);
  }

  /* =========================================================================
     LOAD CUSTOMER DETAILS
  ========================================================================= */
  private async loadCustomerAddress() {
    try {
      const requestData = {
        paymentMethod: { type: "CREDITCARD" },
        paymentOutcome: "AUTHORIZED",
      };
    
      const body = JSON.stringify(requestData);
      console.log("Outgoing body string:", body);
      const currentCartId = window.localStorage.getItem('cartId');
      console.log(currentCartId ?? 'not-current-cart-id');

      const currentCartId2 = window.localStorage.getItem('cart-id');
      console.log(currentCartId2 ?? 'not-current-cart-id2');
      console.log(this.sessionId ?? 'sessionId');

      const response = await fetch(this.processorUrl + "/getCustomerAddress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Session-Id": this.sessionId, 
        },
        body,
      });
    
      console.log("Network response status:", response.status, response.statusText, "type:", response.type);
    
      // Inspect content-type header before parsing
      const contentType = response.headers.get("Content-Type") ?? response.headers.get("content-type");
      console.log("Response Content-Type:", contentType);
    
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.warn("getconfig returned non-200:", response.status, text);
      } else if (contentType && contentType.includes("application/json")) {
        const json = await response.json().catch((err) => {
          console.error("Failed to parse JSON response:", err);
          return null;
        });
        console.log("parsed response JSON:", json);
    
        if (json && json.firstName) {
          this.firstName = String(json.firstName);
          this.lastName = String(json.lastName);
          this.email = String(json.email);
          this.json = json;
          console.log("Customer Address set from server:", this.firstName);
          console.log(String(json.billingAddress.firstName));
          console.log(String(json.shippingAddress.lastName));
        } else {
          console.warn("JSON response missing paymentReference:", json);
        }
      } else {
        // fallback: treat as plain text
        const text = await response.text().catch(() => "");
        console.log("Response text (non-JSON):", text);
      }
    } catch (err) {
      console.warn("initPaymentProcessor: getconfig fetch failed (non-fatal):", err);
    }
  }


  async submit() {
    this.sdk.init({ environment: this.environment });

    try {
      const panhashInput = document.getElementById("pan_hash") as HTMLInputElement;
      const uniqueIdInput = document.getElementById("unique_id") as HTMLInputElement;
      const doRedirectInput = document.getElementById("do_redirect") as HTMLInputElement;
      
      const panhash = panhashInput?.value.trim();
      const uniqueId = uniqueIdInput?.value.trim();
      const doRedirect = doRedirectInput?.value.trim();

      console.log("PAN HASH:", panhash);
      console.log("UNIQUE ID:", uniqueId);
      console.log("DO REDIRECT:", doRedirect);
      
      if (!panhash || !uniqueId) {
        this.onError("Credit card information is missing or invalid.");
        return;
      }

      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "CREDITCARD",
          panHash: panhash,
          uniqueId: uniqueId,
          doRedirect: doRedirect,
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
      if (data.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError("Payment failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      this.onError("Some error occurred. Please try again.");
    }
  }
  
  /* =========================================================================
     INIT CREDIT CARD IFRAME
  ========================================================================= */
  private async initIframe(payButton: HTMLButtonElement | null) {
    const NovalnetUtility = (window as any).NovalnetUtility;

    const config = {
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
          street: String(this.json.billingAddress.streetName),
          city: String(this.json.billingAddress.city),
          zip: String(this.json.billingAddress.postalCode),
          country_code: String(this.json.billingAddress.country),
        },
        shipping: {
          same_as_billing: 1,
          first_name: String(this.json.billingAddress.firstName),
          last_name: String(this.json.billingAddress.lastName),
          street: String(this.json.billingAddress.streetName),
          city: String(this.json.billingAddress.city),
          zip: String(this.json.billingAddress.postalCode),
          country_code: String(this.json.billingAddress.country),
        },
      },

      callback: {
        on_success: (data: any) => {
          (document.getElementById("pan_hash") as HTMLInputElement).value = data["hash"];
          (document.getElementById("unique_id") as HTMLInputElement).value = data["unique_id"];
          (document.getElementById("do_redirect") as HTMLInputElement).value = data["do_redirect"];
          if (payButton) payButton.disabled = false;
          payButton.click(); 
          return true;
        },
        on_error: (data: any) => {
          if (data?.error_message) {
            alert(data.error_message);
          }
          if (payButton) payButton.disabled = true;
          return false;
        },
        on_show_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.add("overlay");
        },
        on_hide_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.remove("overlay");
        },
      },
    };

    NovalnetUtility.createCreditCardForm(config);
  }
}
