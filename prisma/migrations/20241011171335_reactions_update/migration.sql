/*
  Warnings:

  - A unique constraint covering the columns `[userId,postId]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Made the column `postId` on table `Reaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Reaction_userId_postId_commentId_key";

-- AlterTable
ALTER TABLE "Reaction" ALTER COLUMN "postId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_postId_key" ON "Reaction"("userId", "postId");
