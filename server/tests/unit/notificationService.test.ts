import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NotificationService } from "../../src/services/notificationService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser } from "../helpers/fixtures";

describe("NotificationService — read/unread (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("markRead reports success when a matching notification was updated", async () => {
    const { user } = await createStudentUser();
    const notif = await prisma.notification.create({
      data: { recipientId: user.id, type: "SYSTEM", title: "t", body: "b" },
    });

    const result = await new NotificationService().markRead(notif.id, user.id);

    expect(result.success).toBe(true);
    const updated = await prisma.notification.findUnique({ where: { id: notif.id } });
    expect(updated?.read).toBe(true);
  });

  it("markRead reports failure when the notification doesn't belong to the caller (ownership)", async () => {
    const { user: owner } = await createStudentUser();
    const { user: attacker } = await createStudentUser();
    const notif = await prisma.notification.create({
      data: { recipientId: owner.id, type: "SYSTEM", title: "t", body: "b" },
    });

    const result = await new NotificationService().markRead(notif.id, attacker.id);

    expect(result.success).toBe(false);
    const unchanged = await prisma.notification.findUnique({ where: { id: notif.id } });
    expect(unchanged?.read).toBe(false);
  });

  it("unreadCount only counts unread notifications for the given recipient", async () => {
    const { user } = await createStudentUser();
    const { user: otherUser } = await createStudentUser();
    await prisma.notification.createMany({
      data: [
        { recipientId: user.id, type: "SYSTEM", title: "a", body: "a" },
        { recipientId: user.id, type: "SYSTEM", title: "b", body: "b", read: true },
        { recipientId: otherUser.id, type: "SYSTEM", title: "c", body: "c" },
      ],
    });

    const count = await new NotificationService().unreadCount(user.id);

    expect(count).toBe(1);
  });

  it("list reads notifications for the given recipient only", async () => {
    const { user } = await createStudentUser();
    const { user: otherUser } = await createStudentUser();
    await prisma.notification.create({ data: { recipientId: user.id, type: "SYSTEM", title: "mine", body: "b" } });
    await prisma.notification.create({ data: { recipientId: otherUser.id, type: "SYSTEM", title: "not mine", body: "b" } });

    const list = await new NotificationService().list(user.id);

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "mine" });
  });
});
