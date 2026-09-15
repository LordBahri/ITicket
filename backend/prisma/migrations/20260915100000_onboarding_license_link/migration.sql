-- AlterTable
ALTER TABLE "ProcessStep" ADD COLUMN     "requiresLicenseLink" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProcessStepCompletion" ADD COLUMN     "licenseId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessStepCompletion" ADD CONSTRAINT "ProcessStepCompletion_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

