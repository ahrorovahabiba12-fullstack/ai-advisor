export interface NotificationProvider {
  send(recipientUserId: string, title: string, body: string): Promise<void>;
}

/** In-app notifications are always delivered by writing to the Notification table. */
export class InAppNotificationProvider implements NotificationProvider {
  constructor(private repo: { create: (userId: string, title: string, body: string) => Promise<unknown> }) {}

  async send(recipientUserId: string, title: string, body: string): Promise<void> {
    await this.repo.create(recipientUserId, title, body);
  }
}

/**
 * Architecture placeholder for email delivery. No credentials configured
 * by default -> logs instead of sending, so the calling code never breaks.
 */
export class EmailNotificationProvider implements NotificationProvider {
  async send(recipientUserId: string, title: string): Promise<void> {
    console.log(`[EmailNotificationProvider] (stub) would email user ${recipientUserId}: ${title}`);
  }
}

/** Architecture placeholder for Telegram bot delivery. */
export class TelegramNotificationProvider implements NotificationProvider {
  async send(recipientUserId: string, title: string): Promise<void> {
    console.log(`[TelegramNotificationProvider] (stub) would notify user ${recipientUserId} via Telegram: ${title}`);
  }
}
