-- CreateEnum
CREATE TYPE "DrillMode" AS ENUM ('DICTATION', 'SHADOWING');

-- CreateTable
CREATE TABLE "DrillCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "audioDurationMs" INTEGER,
    "accent" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "timesAttempted" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillSegment" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL DEFAULT 0,
    "endMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DrillSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "segmentId" TEXT,
    "mode" "DrillMode" NOT NULL,
    "responseText" TEXT,
    "audioUrl" TEXT,
    "audioDurationMs" INTEGER,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "wordsCorrect" INTEGER NOT NULL DEFAULT 0,
    "wordsTotal" INTEGER NOT NULL DEFAULT 0,
    "wordsPerMinute" INTEGER,
    "detail" JSONB NOT NULL DEFAULT '[]',
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrillAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "mode" "DrillMode" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestAccuracy" INTEGER NOT NULL DEFAULT 0,
    "lastAccuracy" INTEGER NOT NULL DEFAULT 0,
    "segmentsCompleted" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrillProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrillCategory_slug_key" ON "DrillCategory"("slug");

-- CreateIndex
CREATE INDEX "DrillCategory_displayOrder_idx" ON "DrillCategory"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Drill_slug_key" ON "Drill"("slug");

-- CreateIndex
CREATE INDEX "Drill_status_displayOrder_idx" ON "Drill"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "Drill_categoryId_status_idx" ON "Drill"("categoryId", "status");

-- CreateIndex
CREATE INDEX "DrillSegment_drillId_idx" ON "DrillSegment"("drillId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillSegment_drillId_order_key" ON "DrillSegment"("drillId", "order");

-- CreateIndex
CREATE INDEX "DrillAttempt_userId_createdAt_idx" ON "DrillAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DrillAttempt_drillId_mode_idx" ON "DrillAttempt"("drillId", "mode");

-- CreateIndex
CREATE INDEX "DrillAttempt_segmentId_idx" ON "DrillAttempt"("segmentId");

-- CreateIndex
CREATE INDEX "DrillProgress_userId_lastActivityAt_idx" ON "DrillProgress"("userId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "DrillProgress_drillId_idx" ON "DrillProgress"("drillId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillProgress_userId_drillId_mode_key" ON "DrillProgress"("userId", "drillId", "mode");

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DrillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillSegment" ADD CONSTRAINT "DrillSegment_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "DrillSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillProgress" ADD CONSTRAINT "DrillProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillProgress" ADD CONSTRAINT "DrillProgress_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
