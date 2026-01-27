/*
  Warnings:

  - You are about to drop the column `notes` on the `Content` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Content" DROP COLUMN "notes",
ADD COLUMN     "notesJSON" JSONB,
ADD COLUMN     "notesText" TEXT;
