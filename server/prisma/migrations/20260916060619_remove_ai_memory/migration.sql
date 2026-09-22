-- DropForeignKey
ALTER TABLE "AIMemoryFact" DROP CONSTRAINT "AIMemoryFact_studentId_fkey";

-- DropTable
DROP TABLE "AIMemoryFact";

-- DropEnum
DROP TYPE "MemoryFactSource";

