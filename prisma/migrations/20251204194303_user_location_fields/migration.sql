-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3);
