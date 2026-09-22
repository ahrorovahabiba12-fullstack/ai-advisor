import { NotificationType } from "@prisma/client";
import { NotificationRepository } from "../repositories/notificationRepository";
import { prisma } from "../config/prisma";

export class NotificationService {
  constructor(private repo = new NotificationRepository(prisma)) {}

  notify(recipientId: string, type: NotificationType, title: string, body: string) {
    return this.repo.create(recipientId, type, title, body);
  }

  list(recipientId: string) {
    return this.repo.listForUser(recipientId);
  }

  async markRead(id: string, recipientId: string) {
    const updated = await this.repo.markRead(id, recipientId);
    return { success: updated.count > 0 };
  }

  unreadCount(recipientId: string) {
    return this.repo.unreadCount(recipientId);
  }
}
