export interface PaymentProvider {
  readonly name: string;
  createCheckout(parentId: string, plan: "PREMIUM"): Promise<{ checkoutUrl: string; reference: string }>;
  confirmPayment(reference: string): Promise<boolean>;
}

/**
 * No real payment credentials configured -> mock provider. Simulates an
 * instant-success checkout so the subscription flow is fully testable
 * end-to-end without a live payment account.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckout(parentId: string): Promise<{ checkoutUrl: string; reference: string }> {
    const reference = `mock_${parentId}_${Date.now()}`;
    return { checkoutUrl: `https://mock-payment.local/checkout/${reference}`, reference };
  }

  async confirmPayment(_reference: string): Promise<boolean> {
    // Mock mode: every checkout "succeeds" immediately.
    return true;
  }
}
