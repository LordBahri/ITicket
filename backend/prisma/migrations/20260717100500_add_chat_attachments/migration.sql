-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "attachmentMime" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentUrl" TEXT,
ALTER COLUMN "body" DROP NOT NULL;
