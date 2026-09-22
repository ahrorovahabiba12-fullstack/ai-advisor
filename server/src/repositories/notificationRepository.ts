import { NotificationType, PrismaClient } from "@prisma/client";

export class NotificationRepository {
  constructor(private db: PrismaClient) {}

  create(recipientId: string, type: NotificationType, title: string, body: string) {
    return this.db.notification.create({ data: { recipientId, type, title, body } });
  }

  listForUser(recipientId: string, limit = 30) {
    return this.db.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  markRead(id: string, recipientId: string) {
    return this.db.notification.updateMany({ where: { id, recipientId }, data: { read: true } });
  }

  unreadCount(recipientId: string) {
    return this.db.notification.count({ where: { recipientId, read: false } });
  }
}
