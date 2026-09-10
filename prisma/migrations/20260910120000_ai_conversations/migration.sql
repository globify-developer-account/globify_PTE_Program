-- AlterEnum
-- PostgreSQL 12+ permits ADD VALUE inside a transaction as long as the new
-- value is not used in the same transaction. Nothing below writes an
-- AiFeature row, so this is safe under "prisma migrate deploy".
ALTER TYPE "AiFeature" ADD VALUE 'CONVERSATION';
ALTER TYPE "AiFeature" ADD VALUE 'CONVERSATION_REPORT';
ALTER TYPE "AiFeature" ADD VALUE 'SPEECH_SYNTHESIS';

-- CreateEnum
CREATE TYPE "ConversationCategory" AS ENUM ('DAILY_LIFE', 'SOCIAL', 'TRAVEL', 'WORK_AND_STUDY', 'EXAM_PREP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "ConversationTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "category" "ConversationCategory" NOT NULL DEFAULT 'DAILY_LIFE',
    "level" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "emoji" TEXT,
    "personaName" TEXT NOT NULL,
    "personaRole" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "openingLine" TEXT NOT NULL,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starterPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLanguage" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "personaRole" TEXT NOT NULL,
    "level" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "userTurns" INTEGER NOT NULL DEFAULT 0,
    "spokenTurns" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "audioKey" TEXT,
    "transcribed" BOOLEAN NOT NULL DEFAULT false,
    "correction" TEXT,
    "correctionNote" TEXT,
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "estimatedScore" INTEGER NOT NULL,
    "fluency" INTEGER NOT NULL,
    "vocabulary" INTEGER NOT NULL,
    "grammar" INTEGER NOT NULL,
    "interaction" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "corrections" JSONB NOT NULL DEFAULT '[]',
    "goalsMet" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTopic_slug_key" ON "ConversationTopic"("slug");

-- CreateIndex
CREATE INDEX "ConversationTopic_status_displayOrder_idx" ON "ConversationTopic"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "ConversationTopic_category_status_idx" ON "ConversationTopic"("category", "status");

-- CreateIndex
CREATE INDEX "Conversation_userId_lastMessageAt_idx" ON "Conversation"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_userId_status_idx" ON "Conversation"("userId", "status");

-- CreateIndex
CREATE INDEX "Conversation_topicId_idx" ON "Conversation"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMessage_conversationId_index_key" ON "ConversationMessage"("conversationId", "index");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationReport_conversationId_key" ON "ConversationReport"("conversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ConversationTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
