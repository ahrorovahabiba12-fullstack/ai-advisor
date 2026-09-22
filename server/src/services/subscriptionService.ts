import { MockPaymentProvider, PaymentProvider } from "../providers/payment/PaymentProvider";
import { SubscriptionRepository } from "../repositories/subscriptionRepository";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

export class SubscriptionService {
  private payment: PaymentProvider;

  constructor(private repo = new SubscriptionRepository(prisma)) {
    // PAYMENT_PROVIDER is validated to only ever be "mock" today (see env.ts);
    // swapping in a real provider later is a one-line change here.
    this.payment = env.PAYMENT_PROVIDER === "mock" ? new MockPaymentProvider() : new MockPaymentProvider();
  }

  getStatus(parentId: string) {
    return this.repo.findByParent(parentId);
  }

  async startUpgrade(parentId: string) {
    const { checkoutUrl, reference } = await this.payment.createCheckout(parentId, "PREMIUM");
    return { checkoutUrl, reference };
  }

  async confirmUpgrade(parentId: string, reference: string) {
    const ok = await this.payment.confirmPayment(reference);
    if (!ok) return { success: false };
    const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.repo.upsert(parentId, "PREMIUM", "ACTIVE", renewsAt);
    return { success: true };
  }

  async cancel(parentId: string) {
    await this.repo.upsert(parentId, "FREE", "CANCELED");
    return { success: true };
  }
}
