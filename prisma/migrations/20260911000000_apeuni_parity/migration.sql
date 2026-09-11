-- APEUni parity: question numbering, PTE Core, vocab books, live classes,
-- Circle and Institute mode.
--
-- Every statement here is additive. No column is dropped and no row is
-- rewritten except the typeNumber backfill at the foot of this file, which
-- only fills a column that was null a moment earlier.
--
-- Two things are worth knowing before this is applied:
--
--   * `Question.typeNumber` is unique per question type but nullable. Postgres
--     treats nulls as distinct in a unique index, so any number of drafts can
--     sit unnumbered under one type without colliding.
--   * `QuestionType.lastTypeNumber` is the allocator. Handing out a number
--     means incrementing it and reading the result inside one transaction —
--     see `allocateTypeNumber` in src/lib/pte/numbering.ts. The backfill below
--     sets it to the high-water mark it just assigned, so the first number
--     issued after this migration continues the sequence rather than
--     colliding with it.

-- CreateEnum
CREATE TYPE "PteVariant" AS ENUM ('ACADEMIC_UKVI', 'CORE');

-- CreateEnum
CREATE TYPE "VocabMode" AS ENUM ('READING', 'LISTENING');

-- CreateEnum
CREATE TYPE "VocabFamiliarity" AS ENUM ('NEW', 'LEARNING', 'FAMILIAR', 'MASTERED');

-- CreateEnum
CREATE TYPE "LiveClassKind" AS ENUM ('LIVE_CLASS', 'LECTURE', 'PRACTICE_SESSION', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'ATTENDED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CirclePostCategory" AS ENUM ('EXAM_EXPERIENCE', 'QUESTION_PREDICTION', 'STUDY_TIP', 'SCORE_REPORT', 'GENERAL');

-- CreateEnum
CREATE TYPE "CirclePostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "InstituteRole" AS ENUM ('OWNER', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "InstituteStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "pteVariant" "PteVariant" NOT NULL DEFAULT 'ACADEMIC_UKVI';

-- AlterTable
ALTER TABLE "QuestionType" ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTypeNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "variants" "PteVariant"[] DEFAULT ARRAY[]::"PteVariant"[];

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "typeNumber" INTEGER;

-- CreateTable
CREATE TABLE "VocabBook" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badge" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2e5bff',
    "modes" "VocabMode"[] DEFAULT ARRAY['READING', 'LISTENING']::"VocabMode"[],
    "questionTypeCode" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "phonetic" TEXT,
    "audioUrl" TEXT,
    "partOfSpeech" TEXT,
    "definition" TEXT NOT NULL,
    "example" TEXT,
    "acceptedForms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabWordProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "familiarity" "VocabFamiliarity" NOT NULL DEFAULT 'NEW',
    "streak" INTEGER NOT NULL DEFAULT 0,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabWordProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedVocabWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "questionId" TEXT,
    "note" TEXT,
    "familiarity" "VocabFamiliarity" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedVocabWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "LiveClassKind" NOT NULL DEFAULT 'LIVE_CLASS',
    "section" "PteSection",
    "instructorName" TEXT NOT NULL,
    "instructorAvatarUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "joinUrl" TEXT,
    "recordingUrl" TEXT,
    "capacity" INTEGER,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "ClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "CirclePostCategory" NOT NULL DEFAULT 'GENERAL',
    "section" "PteSection",
    "reportedScore" INTEGER,
    "examDate" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CirclePostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CirclePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "CirclePostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "seatLimit" INTEGER NOT NULL DEFAULT 25,
    "status" "InstituteStatus" NOT NULL DEFAULT 'PENDING',
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteMember" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "InstituteRole" NOT NULL DEFAULT 'STUDENT',
    "batch" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabBook_slug_key" ON "VocabBook"("slug");

-- CreateIndex
CREATE INDEX "VocabBook_status_displayOrder_idx" ON "VocabBook"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "VocabWord_bookId_displayOrder_idx" ON "VocabWord"("bookId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VocabWord_bookId_headword_key" ON "VocabWord"("bookId", "headword");

-- CreateIndex
CREATE INDEX "VocabWordProgress_userId_dueAt_idx" ON "VocabWordProgress"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "VocabWordProgress_userId_familiarity_idx" ON "VocabWordProgress"("userId", "familiarity");

-- CreateIndex
CREATE UNIQUE INDEX "VocabWordProgress_userId_wordId_key" ON "VocabWordProgress"("userId", "wordId");

-- CreateIndex
CREATE INDEX "SavedVocabWord_userId_createdAt_idx" ON "SavedVocabWord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedVocabWord_userId_headword_key" ON "SavedVocabWord"("userId", "headword");

-- CreateIndex
CREATE UNIQUE INDEX "LiveClass_slug_key" ON "LiveClass"("slug");

-- CreateIndex
CREATE INDEX "LiveClass_status_startsAt_idx" ON "LiveClass"("status", "startsAt");

-- CreateIndex
CREATE INDEX "LiveClass_kind_startsAt_idx" ON "LiveClass"("kind", "startsAt");

-- CreateIndex
CREATE INDEX "ClassBooking_userId_bookedAt_idx" ON "ClassBooking"("userId", "bookedAt");

-- CreateIndex
CREATE INDEX "ClassBooking_classId_status_idx" ON "ClassBooking"("classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_userId_classId_key" ON "ClassBooking"("userId", "classId");

-- CreateIndex
CREATE INDEX "CirclePost_status_isPinned_createdAt_idx" ON "CirclePost"("status", "isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "CirclePost_category_createdAt_idx" ON "CirclePost"("category", "createdAt");

-- CreateIndex
CREATE INDEX "CirclePost_authorId_createdAt_idx" ON "CirclePost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleComment_postId_createdAt_idx" ON "CircleComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleComment_parentId_idx" ON "CircleComment"("parentId");

-- CreateIndex
CREATE INDEX "CircleReaction_userId_createdAt_idx" ON "CircleReaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleReaction_postId_userId_key" ON "CircleReaction"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_slug_key" ON "Institute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_joinCode_key" ON "Institute"("joinCode");

-- CreateIndex
CREATE INDEX "Institute_status_name_idx" ON "Institute"("status", "name");

-- CreateIndex
CREATE INDEX "InstituteMember_instituteId_role_idx" ON "InstituteMember"("instituteId", "role");

-- CreateIndex
CREATE INDEX "InstituteMember_userId_idx" ON "InstituteMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteMember_instituteId_userId_key" ON "InstituteMember"("instituteId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionTypeId_typeNumber_key" ON "Question"("questionTypeId", "typeNumber");

-- AddForeignKey
ALTER TABLE "VocabWord" ADD CONSTRAINT "VocabWord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "VocabBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabWordProgress" ADD CONSTRAINT "VocabWordProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabWordProgress" ADD CONSTRAINT "VocabWordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedVocabWord" ADD CONSTRAINT "SavedVocabWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePost" ADD CONSTRAINT "CirclePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleComment" ADD CONSTRAINT "CircleComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleComment" ADD CONSTRAINT "CircleComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleComment" ADD CONSTRAINT "CircleComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CircleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleReaction" ADD CONSTRAINT "CircleReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleReaction" ADD CONSTRAINT "CircleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMember" ADD CONSTRAINT "InstituteMember_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMember" ADD CONSTRAINT "InstituteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: number the questions that already exist.
--
-- Numbers are handed out per question type in creation order, so the oldest
-- Read Aloud becomes RA #1. Drafts are numbered too — a question that is
-- published later keeps the number it was created with, which is what students
-- expect when a task they bookmarked comes back.
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "questionTypeId" ORDER BY "createdAt", "id") AS seq
  FROM "Question"
)
UPDATE "Question" AS q
SET "typeNumber" = numbered.seq
FROM numbered
WHERE q."id" = numbered."id";

-- Move each type's allocator past the highest number just assigned.
UPDATE "QuestionType" AS qt
SET "lastTypeNumber" = COALESCE(counts.total, 0)
FROM (
  SELECT "questionTypeId", COUNT(*) AS total
  FROM "Question"
  GROUP BY "questionTypeId"
) AS counts
WHERE qt."id" = counts."questionTypeId";
