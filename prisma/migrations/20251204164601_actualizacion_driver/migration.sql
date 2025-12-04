/*
  Warnings:

  - You are about to drop the column `userId` on the `Driver` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_userId_fkey";

-- DropIndex
DROP INDEX "Driver_userId_key";

-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "userId";
