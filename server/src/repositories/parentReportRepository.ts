import { PrismaClient } from "@prisma/client";

export class ParentReportRepository {
  constructor(private db: PrismaClient) {}

  save(parentId: string, studentId: string, summary: string, payload: unknown) {
    return this.db.parentReport.create({ data: { parentId, studentId, summary, payload: payload as object } });
  }

  latest(parentId: string, studentId: string) {
    return this.db.parentReport.findFirst({
      where: { parentId, studentId },
      orderBy: { createdAt: "desc" },
    });
  }
}
