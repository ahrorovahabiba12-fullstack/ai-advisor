-- DropForeignKey
ALTER TABLE "StudentSkill" DROP CONSTRAINT "StudentSkill_skillId_fkey";

-- DropForeignKey
ALTER TABLE "StudentSkill" DROP CONSTRAINT "StudentSkill_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_skillId_fkey";

-- AlterTable
ALTER TABLE "StudySession" DROP COLUMN "skillId";

-- DropTable
DROP TABLE "Skill";

-- DropTable
DROP TABLE "StudentSkill";

