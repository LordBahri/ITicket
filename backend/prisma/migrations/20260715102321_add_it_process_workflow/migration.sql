-- CreateEnum
CREATE TYPE "ProcessCategory" AS ENUM ('CHANGE_ENABLEMENT', 'REQUEST_FULFILLMENT', 'ACCESS_MANAGEMENT', 'ASSET_MANAGEMENT', 'ONBOARDING', 'OFFBOARDING');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "physicalFormArchivedAt" TIMESTAMP(3),
ADD COLUMN     "physicalFormArchivedById" TEXT,
ADD COLUMN     "processId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDepartmentHead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProcessCategory" NOT NULL,
    "description" TEXT,
    "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresPhysicalForm" BOOLEAN NOT NULL DEFAULT false,
    "formTemplateUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "processId" TEXT NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessApproval" (
    "id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,

    CONSTRAINT "ProcessApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStepCompletion" (
    "id" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "note" TEXT,
    "ticketId" TEXT NOT NULL,
    "processStepId" TEXT NOT NULL,
    "doneById" TEXT,

    CONSTRAINT "ProcessStepCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Process_name_key" ON "Process"("name");

-- CreateIndex
CREATE INDEX "ProcessStep_processId_idx" ON "ProcessStep"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessApproval_ticketId_key" ON "ProcessApproval"("ticketId");

-- CreateIndex
CREATE INDEX "ProcessStepCompletion_ticketId_idx" ON "ProcessStepCompletion"("ticketId");

-- CreateIndex
CREATE INDEX "Ticket_processId_idx" ON "Ticket"("processId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_physicalFormArchivedById_fkey" FOREIGN KEY ("physicalFormArchivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessApproval" ADD CONSTRAINT "ProcessApproval_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessApproval" ADD CONSTRAINT "ProcessApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepCompletion" ADD CONSTRAINT "ProcessStepCompletion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepCompletion" ADD CONSTRAINT "ProcessStepCompletion_processStepId_fkey" FOREIGN KEY ("processStepId") REFERENCES "ProcessStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepCompletion" ADD CONSTRAINT "ProcessStepCompletion_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
