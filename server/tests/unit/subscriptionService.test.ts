import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { SubscriptionService } from "../../src/services/subscriptionService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createParentUser } from "../helpers/fixtures";

describe("SubscriptionService — state transitions (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("startUpgrade returns a checkout url/reference without touching the subscription record yet", async () => {
    const { parent } = await createParentUser();

    const result = await new SubscriptionService().startUpgrade(parent.id);

    expect(result.checkoutUrl).toContain(parent.id);
    expect(result.reference).toContain(parent.id);
    const saved = await prisma.subscription.findUnique({ where: { parentId: parent.id } });
    expect(saved).toBeNull();
  });

  it("confirmUpgrade moves the parent to PREMIUM/ACTIVE once payment succeeds", async () => {
    const { parent } = await createParentUser();

    const result = await new SubscriptionService().confirmUpgrade(parent.id, `mock_${parent.id}_123`);

    expect(result.success).toBe(true);
    const saved = await prisma.subscription.findUnique({ where: { parentId: parent.id } });
    expect(saved).toMatchObject({ plan: "PREMIUM", status: "ACTIVE" });
    expect(saved?.renewsAt).not.toBeNull();
  });

  it("cancel moves the parent to FREE/CANCELED", async () => {
    const { parent } = await createParentUser();
    await prisma.subscription.create({ data: { parentId: parent.id, plan: "PREMIUM", status: "ACTIVE", provider: "mock" } });

    const result = await new SubscriptionService().cancel(parent.id);

    expect(result.success).toBe(true);
    const saved = await prisma.subscription.findUnique({ where: { parentId: parent.id } });
    expect(saved).toMatchObject({ plan: "FREE", status: "CANCELED" });
  });

  it("getStatus reads straight through to the repository for the given parent", async () => {
    const { parent } = await createParentUser();
    await prisma.subscription.create({ data: { parentId: parent.id, plan: "FREE", status: "ACTIVE", provider: "mock" } });

    const status = await new SubscriptionService().getStatus(parent.id);

    expect(status).toMatchObject({ plan: "FREE", status: "ACTIVE" });
  });
});
