import { PrismaClient } from "@prisma/client";

export class SubjectRepository {
  constructor(private db: PrismaClient) {}

  findAll() {
    return this.db.subject.findMany({ where: { active: true } });
  }

  findByCode(code: string) {
    return this.db.subject.findUnique({ where: { code } });
  }

  findById(id: string) {
    return this.db.subject.findUnique({ where: { id } });
  }
}
