-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'CONTENT_MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "PteSection" AS ENUM ('SPEAKING', 'WRITING', 'READING', 'LISTENING');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'MANUAL_REVIEW', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethodKind" AS ENUM ('CARD', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'STRIPE', 'DEMO');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('PRACTICE', 'MOCK');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STARTED', 'SUBMITTED', 'SCORING', 'SCORED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('RULE', 'AI', 'TEACHER');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('SPEAKING_SCORE', 'WRITING_SCORE', 'TRANSCRIPTION', 'FEEDBACK', 'RECOMMENDATION', 'PROGRESS_ANALYSIS');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('SUCCESS', 'FAILED', 'CACHED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('CLICKED', 'REGISTERED', 'PURCHASED', 'REWARDED');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'FREE', 'PREMIUM', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MockTestKind" AS ENUM ('FULL', 'SECTIONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT DEFAULT 'Pakistan',
    "city" TEXT,
    "studyDestination" TEXT,
    "targetScore" INTEGER NOT NULL DEFAULT 79,
    "currentEstimateScore" INTEGER,
    "preferredTestDate" TIMESTAMP(3),
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 45,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPracticeDate" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "referralCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "compareAtCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "durationDays" INTEGER NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limits" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'checkout',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "couponId" TEXT,
    "provider" TEXT NOT NULL,
    "method" "PaymentMethodKind" NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "proofUrl" TEXT,
    "failureReason" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountCents" INTEGER,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "applicablePlanIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "paymentId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'CLICKED',
    "rewardCents" INTEGER NOT NULL DEFAULT 0,
    "rewardedAt" TIMESTAMP(3),
    "landingPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "section" "PteSection" NOT NULL,
    "description" TEXT,
    "renderer" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultTimeLimitSeconds" INTEGER,
    "defaultPreparationSeconds" INTEGER,
    "requiresAudioResponse" BOOLEAN NOT NULL DEFAULT false,
    "requiresTextResponse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "questionTypeId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "prompt" TEXT,
    "passage" TEXT,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "audioTranscript" TEXT,
    "options" JSONB NOT NULL DEFAULT '[]',
    "correctAnswer" JSONB NOT NULL DEFAULT '{}',
    "explanation" TEXT,
    "sampleAnswer" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeLimitSeconds" INTEGER,
    "preparationSeconds" INTEGER,
    "wordLimitMin" INTEGER,
    "wordLimitMax" INTEGER,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "timesAttempted" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "section" "PteSection",
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSetItem" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "MockTestKind" NOT NULL DEFAULT 'FULL',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestSection" (
    "id" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "section" "PteSection" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "MockTestSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestQuestion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MockTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "speakingScore" INTEGER NOT NULL,
    "writingScore" INTEGER NOT NULL,
    "readingScore" INTEGER NOT NULL,
    "listeningScore" INTEGER NOT NULL,
    "enablingSkills" JSONB NOT NULL DEFAULT '{}',
    "strongestArea" TEXT,
    "weakestArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SessionKind" NOT NULL DEFAULT 'PRACTICE',
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "section" "PteSection",
    "questionTypeCode" TEXT,
    "questionSetId" TEXT,
    "mockTestId" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "completedQuestions" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "text" TEXT,
    "selection" JSONB NOT NULL DEFAULT '{}',
    "audioUrl" TEXT,
    "audioDurationMs" INTEGER,
    "transcript" TEXT,
    "wordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "source" "ScoreSource" NOT NULL DEFAULT 'RULE',
    "overall" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION,
    "maxRawScore" DOUBLE PRECISION,
    "isCorrect" BOOLEAN,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "result" JSONB NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestedRewrite" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costMicros" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherReview" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUESTED',
    "score" INTEGER,
    "comments" TEXT,
    "corrections" TEXT,
    "recommendations" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TeacherReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "PteSection" NOT NULL,
    "estimatedScore" INTEGER NOT NULL DEFAULT 0,
    "previousScore" INTEGER,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "minutesPracticed" INTEGER NOT NULL DEFAULT 0,
    "byQuestionType" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "speakingScore" INTEGER,
    "writingScore" INTEGER,
    "readingScore" INTEGER,
    "listeningScore" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "section" "PteSection",
    "questionTypeCode" TEXT,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "ScoreSource" NOT NULL DEFAULT 'RULE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'ALL',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentMd" TEXT NOT NULL,
    "readMinutes" INTEGER NOT NULL DEFAULT 4,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "targetScore" INTEGER,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" "AiFeature" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiRequestStatus" NOT NULL DEFAULT 'SUCCESS',
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_referralCode_key" ON "Profile"("referralCode");

-- CreateIndex
CREATE INDEX "Profile_referralCode_idx" ON "Profile"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_displayOrder_idx" ON "SubscriptionPlan"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

-- CreateIndex
CREATE INDEX "Subscription_createdAt_idx" ON "Subscription"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_expiresAt_idx" ON "Coupon"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_userId_idx" ON "CouponRedemption"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_paymentId_key" ON "Referral"("paymentId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_code_idx" ON "Referral"("code");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionType_code_key" ON "QuestionType"("code");

-- CreateIndex
CREATE INDEX "QuestionType_section_displayOrder_idx" ON "QuestionType"("section", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_slug_key" ON "QuestionCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Question_code_key" ON "Question"("code");

-- CreateIndex
CREATE INDEX "Question_questionTypeId_status_idx" ON "Question"("questionTypeId", "status");

-- CreateIndex
CREATE INDEX "Question_status_difficulty_idx" ON "Question"("status", "difficulty");

-- CreateIndex
CREATE INDEX "Question_createdAt_idx" ON "Question"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSet_slug_key" ON "QuestionSet"("slug");

-- CreateIndex
CREATE INDEX "QuestionSetItem_questionId_idx" ON "QuestionSetItem"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSetItem_questionSetId_questionId_key" ON "QuestionSetItem"("questionSetId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockTest_slug_key" ON "MockTest"("slug");

-- CreateIndex
CREATE INDEX "MockTest_status_displayOrder_idx" ON "MockTest"("status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MockTestSection_mockTestId_order_key" ON "MockTestSection"("mockTestId", "order");

-- CreateIndex
CREATE INDEX "MockTestQuestion_questionId_idx" ON "MockTestQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockTestQuestion_sectionId_questionId_key" ON "MockTestQuestion"("sectionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockTestResult_sessionId_key" ON "MockTestResult"("sessionId");

-- CreateIndex
CREATE INDEX "MockTestResult_userId_createdAt_idx" ON "MockTestResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MockTestResult_mockTestId_idx" ON "MockTestResult"("mockTestId");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_status_idx" ON "PracticeSession"("userId", "status");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_startedAt_idx" ON "PracticeSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PracticeSession_mockTestId_idx" ON "PracticeSession"("mockTestId");

-- CreateIndex
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_questionId_idx" ON "Attempt"("questionId");

-- CreateIndex
CREATE INDEX "Attempt_sessionId_idx" ON "Attempt"("sessionId");

-- CreateIndex
CREATE INDEX "Attempt_status_idx" ON "Attempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_attemptId_key" ON "Answer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_attemptId_key" ON "Score"("attemptId");

-- CreateIndex
CREATE INDEX "Score_createdAt_idx" ON "Score"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysis_attemptId_key" ON "AIAnalysis"("attemptId");

-- CreateIndex
CREATE INDEX "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherReview_attemptId_key" ON "TeacherReview"("attemptId");

-- CreateIndex
CREATE INDEX "TeacherReview_status_requestedAt_idx" ON "TeacherReview"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "TeacherReview_studentId_idx" ON "TeacherReview"("studentId");

-- CreateIndex
CREATE INDEX "Progress_userId_idx" ON "Progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_section_key" ON "Progress"("userId", "section");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_userId_date_idx" ON "ProgressSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressSnapshot_userId_date_key" ON "ProgressSnapshot"("userId", "date");

-- CreateIndex
CREATE INDEX "Recommendation_userId_status_priority_idx" ON "Recommendation"("userId", "status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_userId_code_key" ON "Recommendation"("userId", "code");

-- CreateIndex
CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");

-- CreateIndex
CREATE INDEX "Resource_status_category_idx" ON "Resource"("status", "category");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "StudentNote_studentId_createdAt_idx" ON "StudentNote"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_status_createdAt_idx" ON "SupportMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_feature_createdAt_idx" ON "AiUsageLog"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "UsageCounter_userId_feature_idx" ON "UsageCounter"("userId", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_userId_feature_periodStart_key" ON "UsageCounter"("userId", "feature", "periodStart");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionTypeId_fkey" FOREIGN KEY ("questionTypeId") REFERENCES "QuestionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSetItem" ADD CONSTRAINT "QuestionSetItem_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSetItem" ADD CONSTRAINT "QuestionSetItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestSection" ADD CONSTRAINT "MockTestSection_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestion" ADD CONSTRAINT "MockTestQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "MockTestSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestion" ADD CONSTRAINT "MockTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestResult" ADD CONSTRAINT "MockTestResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestResult" ADD CONSTRAINT "MockTestResult_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReview" ADD CONSTRAINT "TeacherReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReview" ADD CONSTRAINT "TeacherReview_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

