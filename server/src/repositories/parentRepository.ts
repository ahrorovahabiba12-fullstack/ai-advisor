import { PrismaClient } from "@prisma/client";

export class ParentRepository {
  constructor(private db: PrismaClient) {}

  create(userId: string) {
    return this.db.parent.create({ data: { userId } });
  }

  findByUserId(userId: string) {
    return this.db.parent.findUnique({ where: { userId } });
  }

  findByEmail(email: string) {
    return this.db.parent.findFirst({ where: { user: { email } } });
  }
}
