-- CreateTable
CREATE TABLE "TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketStatusHistory_ticketId_idx" ON "TicketStatusHistory"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every existing ticket an initial history entry matching its creation, plus
-- a RESOLVED/CLOSED entry when those timestamps are already set, so the timeline is never empty.
INSERT INTO "TicketStatusHistory" (id, "ticketId", status, "changedById", "createdAt")
SELECT gen_random_uuid()::text, id, status, "requesterId", "createdAt" FROM "Ticket";

INSERT INTO "TicketStatusHistory" (id, "ticketId", status, "changedById", "createdAt")
SELECT gen_random_uuid()::text, id, 'RESOLVED', COALESCE("assigneeId", "requesterId"), "resolvedAt"
FROM "Ticket" WHERE "resolvedAt" IS NOT NULL AND status <> 'RESOLVED';

INSERT INTO "TicketStatusHistory" (id, "ticketId", status, "changedById", "createdAt")
SELECT gen_random_uuid()::text, id, 'CLOSED', COALESCE("assigneeId", "requesterId"), "closedAt"
FROM "Ticket" WHERE "closedAt" IS NOT NULL AND status <> 'CLOSED';
