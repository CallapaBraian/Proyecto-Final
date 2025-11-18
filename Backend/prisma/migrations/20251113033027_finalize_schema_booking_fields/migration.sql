/*
  Warnings:

  - You are about to drop the column `checkin` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `checkout` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `Reservation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `checkIn` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkOut` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestEmail` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestName` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestPhone` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerNight` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'PAID';

-- DropIndex
DROP INDEX "public"."Reservation_roomId_checkin_idx";

-- DropIndex
DROP INDEX "public"."Reservation_roomId_checkout_idx";

-- Primero borramos la columna period, que depende de checkin/checkout
ALTER TABLE "Reservation" DROP COLUMN "period";

-- AlterTable Reservation
ALTER TABLE "Reservation"
  DROP COLUMN "checkin",
  DROP COLUMN "checkout",
  ADD COLUMN "checkIn"        TIMESTAMP(3) NOT NULL,
  ADD COLUMN "checkOut"       TIMESTAMP(3) NOT NULL,
  ADD COLUMN "code"           TEXT         NOT NULL,
  ADD COLUMN "documentNumber" TEXT,
  ADD COLUMN "documentType"   TEXT,
  ADD COLUMN "guestEmail"     TEXT         NOT NULL,
  ADD COLUMN "guestName"      TEXT         NOT NULL,
  ADD COLUMN "guestPhone"     TEXT         NOT NULL,
  ADD COLUMN "guests"         INTEGER      NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt"      TIMESTAMP(3) NOT NULL;

-- AlterTable Room
ALTER TABLE "Room"
  ADD COLUMN "description"   TEXT,
  ADD COLUMN "imageUrl"      TEXT,
  ADD COLUMN "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN "pricePerNight" DECIMAL(10,2) NOT NULL,
  ADD COLUMN "updatedAt"     TIMESTAMP(3) NOT NULL;

-- AlterTable User
ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT       NOT NULL,
  ADD COLUMN "updatedAt"    TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_roomId_checkIn_checkOut_idx"
  ON "Reservation"("roomId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");
