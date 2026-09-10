-- AlterEnum
-- PostgreSQL 12+ permits ADD VALUE inside a transaction as long as the new
-- value is not used in the same transaction. Nothing below writes an
-- AiFeature row, so this is safe under "prisma migrate deploy".
ALTER TYPE "AiFeature" ADD VALUE 'WRITING_IMPROVEMENT';

-- CreateEnum
CREATE TYPE "WritingTaskKind" AS ENUM ('ESSAY', 'SUMMARIZE_WRITTEN_TEXT', 'SUMMARIZE_SPOKEN_TEXT', 'FREEFORM');

-- CreateTable
CREATE TABLE "WritingExercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "taskKind" "WritingTaskKind" NOT NULL DEFAULT 'ESSAY',
    "prompt" TEXT NOT NULL,
    "passage" TEXT,
    "guidance" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "wordMin" INTEGER NOT NULL DEFAULT 200,
    "wordMax" INTEGER NOT NULL DEFAULT 300,
    "minutes" INTEGER NOT NULL DEFAULT 20,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingImprovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "taskKind" "WritingTaskKind" NOT NULL DEFAULT 'FREEFORM',
    "prompt" TEXT,
    "originalText" TEXT NOT NULL,
    "improvedText" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "edits" JSONB NOT NULL DEFAULT '[]',
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingImprovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WritingExercise_slug_key" ON "WritingExercise"("slug");

-- CreateIndex
CREATE INDEX "WritingExercise_status_category_idx" ON "WritingExercise"("status", "category");

-- CreateIndex
CREATE INDEX "WritingExercise_status_taskKind_idx" ON "WritingExercise"("status", "taskKind");

-- CreateIndex
CREATE INDEX "WritingImprovement_userId_createdAt_idx" ON "WritingImprovement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WritingImprovement_exerciseId_idx" ON "WritingImprovement"("exerciseId");

-- AddForeignKey
ALTER TABLE "WritingImprovement" ADD CONSTRAINT "WritingImprovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingImprovement" ADD CONSTRAINT "WritingImprovement_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "WritingExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
