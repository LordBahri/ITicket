import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const changelogSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(2).max(2000),
  type: z.enum(["FEATURE", "IMPROVEMENT", "FIX"]).default("FEATURE"),
});

export async function listChangelog(_req: Request, res: Response) {
  const entries = await prisma.changelogEntry.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  res.json({ entries });
}

export async function createChangelogEntry(req: Request, res: Response) {
  const data = changelogSchema.parse(req.body);
  const entry = await prisma.changelogEntry.create({ data });
  res.status(201).json({ entry });
}
