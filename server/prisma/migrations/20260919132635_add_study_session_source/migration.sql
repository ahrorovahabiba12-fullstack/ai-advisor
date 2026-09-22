-- CreateEnum
CREATE TYPE "StudySessionSource" AS ENUM ('SCHEDULE', 'QUIZ');

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "source" "StudySessionSource" NOT NULL DEFAULT 'SCHEDULE';
