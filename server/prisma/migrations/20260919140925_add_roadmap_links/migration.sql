-- AlterTable
ALTER TABLE "CareerRoadmapStep" ADD COLUMN     "resourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "taskLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];
