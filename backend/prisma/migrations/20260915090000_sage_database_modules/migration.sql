-- CreateEnum
CREATE TYPE "SageDatabaseModules" AS ENUM ('COMMERCIAL', 'COMPTABILITE', 'BOTH');

-- AlterTable
ALTER TABLE "SageDatabase" ADD COLUMN     "modules" "SageDatabaseModules" NOT NULL DEFAULT 'BOTH';

