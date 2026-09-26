import type { RazorpayCheckout, RazorpaySuccessResponse } from './checkout.types';

const RAZORPAY_CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string; contact?: string };
  theme: { color: string; backdrop_color: string };
  modal: { confirm_close: boolean; ondismiss: () => void };
  retry: { enabled: boolean };
  handler: (response: RazorpaySuccessResponse) => void;
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void): void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | undefined;

export function razorpayCheckoutExpired(expiresAt: string, now = Date.now()): boolean {
  const expiry = new Date(expiresAt).getTime();
  return !Number.isFinite(expiry) || expiry <= now;
}

export async function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return;
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`,
    );
    const script = existing ?? document.createElement('script');
    const complete = () => {
      cleanup();
      if (window.Razorpay) resolve();
      else reject(new Error('Razorpay Checkout did not initialize'));
    };
    const fail = () => {
      cleanup();
      scriptPromise = undefined;
      reject(new Error('Razorpay Checkout could not be loaded'));
    };
    const cleanup = () => {
      script.removeEventListener('load', complete);
      script.removeEventListener('error', fail);
    };

    script.addEventListener('load', complete, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (!existing) {
      script.src = RAZORPAY_CHECKOUT_SCRIPT;
      script.async = true;
      document.head.append(script);
    }
  });

  try {
    await scriptPromise;
  } catch (error) {
    scriptPromise = undefined;
    throw error;
  }
}

export async function openRazorpayCheckout(
  checkout: RazorpayCheckout,
  callbacks: {
    onSuccess: (response: RazorpaySuccessResponse) => void;
    onFailure: (message: string) => void;
    onDismiss: () => void;
  },
): Promise<void> {
  if (razorpayCheckoutExpired(checkout.expiresAt)) {
    throw new Error('This order is no longer available for payment');
  }
  await loadRazorpayCheckout();
  if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable');

  const instance = new window.Razorpay({
    key: checkout.keyId,
    amount: checkout.amountInPaise,
    currency: checkout.currency,
    name: checkout.checkoutName,
    description: checkout.description,
    order_id: checkout.providerOrderId,
    prefill: checkout.prefill,
    theme: { color: '#10483f', backdrop_color: '#183b34' },
    modal: { confirm_close: true, ondismiss: callbacks.onDismiss },
    retry: { enabled: true },
    handler: callbacks.onSuccess,
  });
  instance.on('payment.failed', (response) => {
    callbacks.onFailure(
      response.error?.description || 'Razorpay could not complete the payment. Please retry.',
    );
  });
  instance.open();
}
