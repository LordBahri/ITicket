-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isSystemPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSystemPlaceholder" BOOLEAN NOT NULL DEFAULT false;
