-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "allowsMultipleBeneficiaries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formFields" JSONB;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "formData" JSONB;

-- CreateTable
CREATE TABLE "TicketBeneficiaryLink" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TicketBeneficiaryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageDatabase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SageDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSageAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sageDatabaseId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "UserSageAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSageDatabaseAccess" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sageDatabaseId" TEXT NOT NULL,

    CONSTRAINT "TicketSageDatabaseAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketBeneficiaryLink_userId_idx" ON "TicketBeneficiaryLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketBeneficiaryLink_ticketId_userId_key" ON "TicketBeneficiaryLink"("ticketId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SageDatabase_name_key" ON "SageDatabase"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserSageAccess_userId_sageDatabaseId_key" ON "UserSageAccess"("userId", "sageDatabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSageDatabaseAccess_ticketId_sageDatabaseId_key" ON "TicketSageDatabaseAccess"("ticketId", "sageDatabaseId");

-- AddForeignKey
ALTER TABLE "TicketBeneficiaryLink" ADD CONSTRAINT "TicketBeneficiaryLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBeneficiaryLink" ADD CONSTRAINT "TicketBeneficiaryLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSageAccess" ADD CONSTRAINT "UserSageAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSageAccess" ADD CONSTRAINT "UserSageAccess_sageDatabaseId_fkey" FOREIGN KEY ("sageDatabaseId") REFERENCES "SageDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSageAccess" ADD CONSTRAINT "UserSageAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSageDatabaseAccess" ADD CONSTRAINT "TicketSageDatabaseAccess_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSageDatabaseAccess" ADD CONSTRAINT "TicketSageDatabaseAccess_sageDatabaseId_fkey" FOREIGN KEY ("sageDatabaseId") REFERENCES "SageDatabase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

