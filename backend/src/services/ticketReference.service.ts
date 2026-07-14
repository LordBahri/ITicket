import { prisma } from "../config/prisma";

export async function generateTicketReference(): Promise<string> {
  const count = await prisma.ticket.count();
  const next = count + 1;
  return `TCK-${String(next).padStart(6, "0")}`;
}
