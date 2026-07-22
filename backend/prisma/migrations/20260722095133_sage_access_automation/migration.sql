-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "sageDatabaseName" TEXT;

-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "supportsSageAutomation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adUsername" TEXT;
