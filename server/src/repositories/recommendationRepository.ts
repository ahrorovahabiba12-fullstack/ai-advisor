import { PrismaClient, RecommendationType } from "@prisma/client";

export class RecommendationRepository {
  constructor(private db: PrismaClient) {}

  save(studentId: string, type: RecommendationType, title: string, payload: unknown, confidence: number) {
    return this.db.recommendation.create({ data: { studentId, type, title, payload: payload as object, confidence } });
  }

  latestByType(studentId: string, type: RecommendationType) {
    return this.db.recommendation.findFirst({
      where: { studentId, type },
      orderBy: { createdAt: "desc" },
    });
  }
}
