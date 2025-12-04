/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_username_key" ON "Driver"("username");
