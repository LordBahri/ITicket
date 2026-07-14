-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Company_parentId_idx" ON "Company"("parentId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
