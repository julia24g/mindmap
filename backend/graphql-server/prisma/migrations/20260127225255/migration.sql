/*
  Warnings:

  - You are about to drop the column `publicUrl` on the `Dashboard` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicSlug]` on the table `Dashboard` will be added. If there are existing duplicate values, this will fail.
  - Made the column `updatedAt` on table `Content` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Dashboard` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DashboardVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- DropIndex
DROP INDEX "Dashboard_publicUrl_key";

-- AlterTable
ALTER TABLE "Content" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Dashboard" DROP COLUMN "publicUrl",
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMPTZ,
ADD COLUMN     "visibility" "DashboardVisibility" NOT NULL DEFAULT 'PRIVATE',
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Content_dashboardId_idx" ON "Content"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_publicSlug_key" ON "Dashboard"("publicSlug");

-- CreateIndex
CREATE INDEX "Dashboard_userId_idx" ON "Dashboard"("userId");
