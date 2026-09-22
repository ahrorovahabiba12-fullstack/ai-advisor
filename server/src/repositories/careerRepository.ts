import { PrismaClient } from "@prisma/client";

export class CareerRepository {
  constructor(private db: PrismaClient) {}

  findAll() {
    return this.db.career.findMany();
  }

  findByCode(code: string) {
    return this.db.career.findUnique({ where: { code }, include: { roadmapSteps: { orderBy: { order: "asc" } } } });
  }

  saveRecommendation(studentId: string, careerId: string, matchScore: number, reasoning: string) {
    return this.db.careerRecommendation.upsert({
      where: { studentId_careerId: { studentId, careerId } },
      create: { studentId, careerId, matchScore, reasoning },
      update: { matchScore, reasoning },
    });
  }

  listRecommendations(studentId: string) {
    return this.db.careerRecommendation.findMany({
      where: { studentId },
      include: { career: true },
      orderBy: { matchScore: "desc" },
    });
  }

  findUniversities() {
    return this.db.university.findMany();
  }

  saveUniversityRecommendation(studentId: string, universityId: string, matchScore: number, reasoning: string) {
    return this.db.universityRecommendation.upsert({
      where: { studentId_universityId: { studentId, universityId } },
      create: { studentId, universityId, matchScore, reasoning },
      update: { matchScore, reasoning },
    });
  }
}
