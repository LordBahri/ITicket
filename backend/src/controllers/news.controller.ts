import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { refreshNewsFeeds } from "../services/newsFeed.service";

export async function listNews(_req: Request, res: Response) {
  const articles = await prisma.newsArticle.findMany({
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: 24,
  });
  res.json({ articles });
}

export async function refreshNews(_req: Request, res: Response) {
  const result = await refreshNewsFeeds();
  const articles = await prisma.newsArticle.findMany({
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: 24,
  });
  res.json({ ...result, articles });
}
