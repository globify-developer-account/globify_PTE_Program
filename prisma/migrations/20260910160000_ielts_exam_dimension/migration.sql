-- IELTS, phase 0: the exam dimension.
--
-- Everything that exists before this migration is PTE content, so every new
-- column defaults to 'PTE' and no row needs rewriting. The two unique keys on
-- Progress and ProgressSnapshot do change shape, which is the only part of
-- this migration that can lose data if it is applied carelessly — see the
-- comments on those statements.

-- AlterEnum
-- PostgreSQL 12+ permits ADD VALUE inside a transaction as long as the new
-- value is not used in the same transaction. Nothing below writes an
-- AiFeature row, so this is safe under "prisma migrate deploy".
ALTER TYPE "AiFeature" ADD VALUE 'IELTS_WRITING_SCORE';
ALTER TYPE "AiFeature" ADD VALUE 'IELTS_SPEAKING_SCORE';

-- CreateEnum
CREATE TYPE "Exam" AS ENUM ('PTE', 'IELTS');

-- CreateEnum
CREATE TYPE "IeltsVariant" AS ENUM ('ACADEMIC', 'GENERAL_TRAINING');

-- CreateEnum
CREATE TYPE "ScoreScale" AS ENUM ('PTE_10_90', 'IELTS_BAND');

-- AlterTable
ALTER TABLE "QuestionType" ADD COLUMN "exam" "Exam" NOT NULL DEFAULT 'PTE';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "variant" "IeltsVariant";

-- AlterTable
ALTER TABLE "QuestionSet" ADD COLUMN "exam" "Exam" NOT NULL DEFAULT 'PTE';

-- AlterTable
ALTER TABLE "MockTest" ADD COLUMN "exam" "Exam" NOT NULL DEFAULT 'PTE',
                       ADD COLUMN "variant" "IeltsVariant";

-- AlterTable
-- `overall` stays the normalised 0-90 number every chart and rollup reads.
-- `band` is authoritative for IELTS rows and null everywhere else.
ALTER TABLE "Score" ADD COLUMN "scale" "ScoreScale" NOT NULL DEFAULT 'PTE_10_90',
                    ADD COLUMN "band" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MockTestResult" ADD COLUMN "overallBand" DOUBLE PRECISION,
                             ADD COLUMN "speakingBand" DOUBLE PRECISION,
                             ADD COLUMN "writingBand" DOUBLE PRECISION,
                             ADD COLUMN "readingBand" DOUBLE PRECISION,
                             ADD COLUMN "listeningBand" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "targetExam" "Exam" NOT NULL DEFAULT 'PTE',
                      ADD COLUMN "targetBand" DOUBLE PRECISION,
                      ADD COLUMN "ieltsVariant" "IeltsVariant";

-- AlterTable
ALTER TABLE "Progress" ADD COLUMN "exam" "Exam" NOT NULL DEFAULT 'PTE';

-- AlterTable
ALTER TABLE "ProgressSnapshot" ADD COLUMN "exam" "Exam" NOT NULL DEFAULT 'PTE';

-- DropIndex
-- Both columns were added NOT NULL DEFAULT 'PTE' above, so every existing row
-- already carries a value and the wider unique key cannot collide: (userId,
-- section) was unique, therefore (userId, 'PTE', section) is unique too. The
-- old key is dropped only after the new column exists, so there is no window
-- in which duplicates could be inserted.
DROP INDEX "Progress_userId_section_key";

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_exam_section_key" ON "Progress"("userId", "exam", "section");

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_date_key";

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ProgressSnapshot_userId_exam_date_key" ON "ProgressSnapshot"("userId", "exam", "date");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_userId_exam_date_idx" ON "ProgressSnapshot"("userId", "exam", "date");

-- DropIndex
DROP INDEX "QuestionType_section_displayOrder_idx";

-- CreateIndex
CREATE INDEX "QuestionType_exam_section_displayOrder_idx" ON "QuestionType"("exam", "section", "displayOrder");
