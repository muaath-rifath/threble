/*
  Warnings:

  - You are about to drop the column `commentId` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Connection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('NEW_FOLLOWER', 'POST_REACTION', 'POST_REPLY', 'MENTION', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'CONNECTION_REJECTED', 'COMMUNITY_INVITATION', 'COMMUNITY_REQUEST_APPROVED', 'COMMUNITY_REQUEST_REJECTED', 'COMMUNITY_NEW_MEMBER', 'COMMUNITY_POST', 'COMMUNITY_ROLE_CHANGED', 'COMMUNITY_MODERATION_INVITATION', 'COMMUNITY_MODERATION_ACCEPTED', 'COMMUNITY_MODERATION_DECLINED', 'COMMUNITY_EVENT_CREATED', 'COMMUNITY_EVENT_UPDATED', 'COMMUNITY_EVENT_CANCELLED', 'COMMUNITY_EVENT_REMINDER', 'EVENT_REMINDER', 'EVENT_CANCELLED', 'SYSTEM_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."AttendeeStatus" AS ENUM ('PENDING', 'ATTENDING', 'NOT_ATTENDING', 'MAYBE');

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reaction" DROP CONSTRAINT "Reaction_commentId_fkey";

-- DropIndex
DROP INDEX "public"."Reaction_commentId_type_idx";

-- AlterTable
ALTER TABLE "public"."Community" ADD COLUMN     "visibility" "public"."CommunityVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "public"."Connection" ADD COLUMN     "status" "public"."ConnectionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Reaction" DROP COLUMN "commentId",
ALTER COLUMN "postId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."Comment";

-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JoinRequest" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityInvitation" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "communityId" TEXT,
    "postId" TEXT,
    "data" JSONB DEFAULT '{}',
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "virtualLink" TEXT,
    "maxAttendees" INTEGER,
    "rsvpDeadline" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" JSONB DEFAULT '{}',
    "communityId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."AttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModerationAction" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "itemId" TEXT,
    "communityId" TEXT,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModerationInvitation" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MODERATOR',
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ModerationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "public"."Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_postId_idx" ON "public"."Bookmark"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_postId_key" ON "public"."Bookmark"("userId", "postId");

-- CreateIndex
CREATE INDEX "JoinRequest_communityId_idx" ON "public"."JoinRequest"("communityId");

-- CreateIndex
CREATE INDEX "JoinRequest_userId_idx" ON "public"."JoinRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_communityId_userId_key" ON "public"."JoinRequest"("communityId", "userId");

-- CreateIndex
CREATE INDEX "CommunityInvitation_communityId_idx" ON "public"."CommunityInvitation"("communityId");

-- CreateIndex
CREATE INDEX "CommunityInvitation_inviteeId_idx" ON "public"."CommunityInvitation"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityInvitation_communityId_inviteeId_key" ON "public"."CommunityInvitation"("communityId", "inviteeId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "public"."Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityEvent_communityId_startTime_idx" ON "public"."CommunityEvent"("communityId", "startTime");

-- CreateIndex
CREATE INDEX "CommunityEvent_creatorId_idx" ON "public"."CommunityEvent"("creatorId");

-- CreateIndex
CREATE INDEX "CommunityEvent_startTime_idx" ON "public"."CommunityEvent"("startTime");

-- CreateIndex
CREATE INDEX "EventAttendee_eventId_idx" ON "public"."EventAttendee"("eventId");

-- CreateIndex
CREATE INDEX "EventAttendee_userId_idx" ON "public"."EventAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendee_eventId_userId_key" ON "public"."EventAttendee"("eventId", "userId");

-- CreateIndex
CREATE INDEX "ModerationAction_communityId_idx" ON "public"."ModerationAction"("communityId");

-- CreateIndex
CREATE INDEX "ModerationAction_moderatorId_idx" ON "public"."ModerationAction"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationAction_contentType_idx" ON "public"."ModerationAction"("contentType");

-- CreateIndex
CREATE INDEX "ModerationAction_action_idx" ON "public"."ModerationAction"("action");

-- CreateIndex
CREATE INDEX "ModerationAction_createdAt_idx" ON "public"."ModerationAction"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationInvitation_inviteeId_status_idx" ON "public"."ModerationInvitation"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "ModerationInvitation_communityId_status_idx" ON "public"."ModerationInvitation"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationInvitation_communityId_inviteeId_role_key" ON "public"."ModerationInvitation"("communityId", "inviteeId", "role");

-- CreateIndex
CREATE INDEX "Community_visibility_idx" ON "public"."Community"("visibility");

-- CreateIndex
CREATE INDEX "Post_parentId_createdAt_idx" ON "public"."Post"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JoinRequest" ADD CONSTRAINT "JoinRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityEvent" ADD CONSTRAINT "CommunityEvent_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityEvent" ADD CONSTRAINT "CommunityEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."CommunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationAction" ADD CONSTRAINT "ModerationAction_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationInvitation" ADD CONSTRAINT "ModerationInvitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationInvitation" ADD CONSTRAINT "ModerationInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationInvitation" ADD CONSTRAINT "ModerationInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
