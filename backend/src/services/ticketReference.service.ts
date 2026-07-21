import { prisma } from "../config/prisma";

export async function generateTicketReference(): Promise<string> {
  // Basé sur la référence la plus élevée existante (et non un simple count) pour rester valide
  // même après la suppression de tickets, qui créerait sinon des trous et des collisions.
  const last = await prisma.ticket.findFirst({
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNumber = last ? parseInt(last.reference.replace("TCK-", ""), 10) : 0;
  return `TCK-${String(lastNumber + 1).padStart(6, "0")}`;
}
