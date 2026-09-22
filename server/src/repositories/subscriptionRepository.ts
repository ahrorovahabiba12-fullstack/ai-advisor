import { PrismaClient } from "@prisma/client";

export class SubscriptionRepository {
  constructor(private db: PrismaClient) {}

  findByParent(parentId: string) {
    return this.db.subscription.findUnique({ where: { parentId } });
  }

  upsert(parentId: string, plan: "FREE" | "PREMIUM", status: "ACTIVE" | "CANCELED", renewsAt?: Date) {
    return this.db.subscription.upsert({
      where: { parentId },
      create: { parentId, plan, status, renewsAt, provider: "mock" },
      update: { plan, status, renewsAt },
    });
  }
}
