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

/**
 * CreditcardBuilder / Creditcard
 *
 * - _getTemplate() is synchronous and returns only HTML.
 * - mount() is non-blocking: it inserts HTML then starts background tasks
 *   (script load, config fetch) but never throws or blocks the UI.
 * - All browser-only operations are guarded with typeof window !== "undefined".
 */

export class CreditcardBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;

  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Creditcard(this.baseOptions, config);
  }
}

export class Creditcard extends BaseComponent {
  private showPayButton: boolean;
  private clientKey: string = "";
  private _nnLoadingPromise?: Promise<void>;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.creditcard, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  /**
   * mount: synchronous entry point called by the consumer.
   * We insert the template synchronously and then run safe async tasks.
   */
  mount(selector: string) {
    // Ensure DOM is present
    if (typeof window === "undefined" || typeof document === "undefined") {
      // Running on server - do not attempt DOM / network calls
      // Use console here because server-side log may differ
      console.warn("Creditcard.mount called on non-browser environment. Skipping DOM mount.");
      return;
    }

    const root = document.querySelector(selector);
    if (!root) {
      console.error("Mount selector not found:", selector);
      return;
    }

    // Insert HTML synchronously
    root.insertAdjacentHTML("afterbegin", this._getTemplate());

    // Grab references to elements we will use
    const payButton = document.querySelector("#purchaseOrderForm-paymentButton") as HTMLButtonElement | null;

    if (this.showPayButton && payButton) {
      payButton.disabled = true;
      payButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.submit();
      });
    }

    // Load Novalnet SDK and initialize the credit card form (browser-only).
    // This is safe: _loadNovalnetScriptOnce resolves or rejects; errors are logged.
    void this._loadNovalnetScriptOnce()
      .then(() => {
        try {
          this._initNovalnetCreditCardForm(payButton);
        } catch (initErr) {
          console.error("Novalnet init failed:", initErr);
        }
      })
      .catch((err) => {
        console.error("Failed to load Novalnet SDK:", err);
      });

    // Wire review order button logic (safe check)
    const reviewOrderButton = document.querySelector('[data-ctc-selector="confirmMethod"]');
    if (reviewOrderButton) {
      reviewOrderButton.addEventListener("click", async (event) => {
        event.preventDefault();
        const NovalnetUtility = (window as any).NovalnetUtility;
        if (NovalnetUtility?.getPanHash) {
          try {
            console.log("Calling NovalnetUtility.getPanHash()");
            await NovalnetUtility.getPanHash();
          } catch (error) {
            console.error("Error getting pan hash:", error);
          }
        } else {
          console.warn("NovalnetUtility.getPanHash() not available.");
        }
      });
    }

    // SAFE: background fetch to get connector config (/getconfig)
    // This never throws upward and will not block mount. Uses timeout via AbortController.
    void (async () => {
      if (!this.processorUrl) {
        console.warn("processorUrl missing; skipping getconfig fetch");
        return;
      }

      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: { type: "CREDITCARD" },
        paymentOutcome: "Success",
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.sessionId) headers["X-Session-Id"] = this.sessionId;

      const controller = new AbortController();
      const timeoutMs = 8_000; // adjust as needed
      const t = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const resp = await fetch(`${this.processorUrl}/getconfig`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });

        if (!resp.ok) {
          console.warn(`getconfig returned status ${resp.status}`);
          return;
        }

        const body = await resp.json().catch(() => ({}));
        this.clientKey = String(body?.paymentReference ?? "");
        console.info("Fetched clientKey for Novalnet:", this.clientKey);
        // Optionally, if you want to set client key into NovalnetUtility if already loaded:
        if ((window as any).NovalnetUtility && this.clientKey) {
          try {
            (window as any).NovalnetUtility.setClientKey(this.clientKey);
          } catch (err) {
            console.warn("Failed to set Novalnet client key dynamically:", err);
          }
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          console.warn("getconfig fetch aborted (timeout)");
        } else {
          console.error("getconfig fetch failed:", err);
        }
      } finally {
        clearTimeout(t);
      }
    })();
  }

  /**
   * submit: triggered by the pay button. Uses values populated by NovalnetUtility callbacks.
   */
  async submit() {
    // SDK init - keep as you had it
    try {
      this.sdk.init({ environment: this.environment });
    } catch (err) {
      console.warn("SDK init failed (non-fatal):", err);
    }

    try {
      const panhashInput = document.getElementById("pan_hash") as HTMLInputElement | null;
      const uniqueIdInput = document.getElementById("unique_id") as HTMLInputElement | null;
      const doRedirectInput = document.getElementById("do_redirect") as HTMLInputElement | null;

      const panhash = panhashInput?.value?.trim() ?? "";
      const uniqueId = uniqueIdInput?.value?.trim() ?? "";
      const doRedirect = doRedirectInput?.value?.trim() ?? "";

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

      if (!this.processorUrl) {
        this.onError("Payment processor URL is not configured.");
        return;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.sessionId) headers["X-Session-Id"] = this.sessionId;

      const response = await fetch(`${this.processorUrl}/payment`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Payment POST failed:", response.status, text);
        this.onError("Payment failed. Please try again.");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (data?.paymentReference) {
        this.onComplete?.({
          isSuccess: true,
          paymentReference: String(data.paymentReference),
        });
      } else {
        console.error("Payment response missing paymentReference:", data);
        this.onError("Payment failed. Please try again.");
      }
    } catch (e) {
      console.error("submit error:", e);
      this.onError("Some error occurred. Please try again.");
    }
  }

  /**
   * _getTemplate - synchronous. no network calls / no DOM references.
   */
  private _getTemplate(): string {
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

  /**
   * _loadNovalnetScriptOnce - idempotent script loader with timeout.
   */
  private async _loadNovalnetScriptOnce(): Promise<void> {
    // Browser guard
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // If NovalnetUtility already present, nothing to do
    if ((window as any).NovalnetUtility) return;

    // If we already started loading, reuse the same promise
    if (this._nnLoadingPromise) return this._nnLoadingPromise;

    // Script src
    const src = "https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js";
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existing) {
      // If script tag already has a stored promise, reuse it
      const existingPromise = (existing as any)._nnLoadingPromise as Promise<void> | undefined;
      if (existingPromise) {
        this._nnLoadingPromise = existingPromise;
        return existingPromise;
      }

      // If NovalnetUtility loaded already, resolve
      if ((window as any).NovalnetUtility) {
        this._nnLoadingPromise = Promise.resolve();
        return this._nnLoadingPromise;
      }

      // Otherwise fall through to attach load handlers
    }

    // Create script element and attach promise
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    if (!existing) script.setAttribute("data-novalnet-sdk", "true");

    const timeoutMs = 10_000;
    this._nnLoadingPromise = new Promise<void>((resolve, reject) => {
      let cleared = false;
      const timer = window.setTimeout(() => {
        cleared = true;
        // cleanup event listeners
        script.onload = null;
        script.onerror = null;
        reject(new Error(`Novalnet SDK load timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      script.onload = () => {
        if (cleared) return;
        window.clearTimeout(timer);
        // it is expected the script exports NovalnetUtility to window
        if ((window as any).NovalnetUtility) {
          resolve();
        } else {
          // Some SDKs load asynchronously after onload; small delay to check
          setTimeout(() => {
            if ((window as any).NovalnetUtility) resolve();
            else reject(new Error("Novalnet SDK loaded but NovalnetUtility not found on window"));
          }, 50);
        }
      };

      script.onerror = (ev) => {
        if (cleared) return;
        window.clearTimeout(timer);
        reject(new Error("Novalnet SDK failed to load"));
      };

      // store the promise on the element so duplicate inserts reuse it
      (script as any)._nnLoadingPromise = this._nnLoadingPromise;

      if (!existing) document.head.appendChild(script);
    });

    return this._nnLoadingPromise;
  }

  /**
   * _initNovalnetCreditCardForm - safe init of Novalnet form; uses callbacks to set hidden inputs.
   * This will not throw if NovalnetUtility is missing; it will log instead.
   */
  private _initNovalnetCreditCardForm(payButton: HTMLButtonElement | null) {
    if (typeof window === "undefined") {
      console.warn("_initNovalnetCreditCardForm called on non-browser environment.");
      return;
    }

    const NovalnetUtility = (window as any).NovalnetUtility;
    if (!NovalnetUtility) {
      console.warn("NovalnetUtility not available.");
      return;
    }

    // Prefer clientKey fetched from server, fallback to developer/test key if you must
    // TODO: Replace this fallback with secure retrieval. Do not hard-code production keys here.
    const clientKey = this.clientKey || "88fcbbceb1948c8ae106c3fe2ccffc12";
    try {
      if (typeof NovalnetUtility.setClientKey === "function") {
        NovalnetUtility.setClientKey(clientKey);
      } else {
        console.warn("NovalnetUtility.setClientKey is not a function");
      }
    } catch (err) {
      console.warn("Failed to set Novalnet client key:", err);
    }

    const configurationObject = {
      callback: {
        on_success: (data: any) => {
          try {
            const ph = document.getElementById("pan_hash") as HTMLInputElement | null;
            const uid = document.getElementById("unique_id") as HTMLInputElement | null;
            const dr = document.getElementById("do_redirect") as HTMLInputElement | null;

            if (ph) ph.value = data["hash"] ?? "";
            if (uid) uid.value = data["unique_id"] ?? "";
            if (dr) dr.value = String(data["do_redirect"] ?? "");

            if (payButton) {
              payButton.disabled = false;
              // do not auto-click in all cases; but if original flow required it:
              try {
                payButton.click();
              } catch (e) {
                // Some browsers block synthetic clicks; ignore
              }
            }
            return true;
          } catch (err) {
            console.error("Error in on_success callback:", err);
            return false;
          }
        },
        on_error: (data: any) => {
          try {
            if (data?.error_message) alert(String(data.error_message));
            if (payButton) payButton.disabled = true;
          } catch (err) {
            console.error("Error in on_error callback:", err);
          }
          return false;
        },
        on_show_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.add("overlay");
        },
        on_hide_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.remove("overlay");
        },
      },
      iframe: {
        id: "novalnet_iframe",
        inline: 1,
        style: { container: "", input: "", label: "" },
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
        amount: 123,
        currency: "EUR",
        test_mode: 1,
      },
      custom: {
        lang: "EN",
      },
    };

    try {
      NovalnetUtility.createCreditCardForm(configurationObject);
    } catch (err) {
      console.error("createCreditCardForm threw an error:", err);
    }
  }
}
