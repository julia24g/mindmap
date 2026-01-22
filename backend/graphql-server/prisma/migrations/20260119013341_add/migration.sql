/*
  Warnings:

  - You are about to drop the column `userId` on the `Content` table. All the data in the column will be lost.
  - Added the required column `name` to the `Dashboard` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_userId_fkey";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN     "name" TEXT NOT NULL;
