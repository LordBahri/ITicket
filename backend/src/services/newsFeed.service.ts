import Parser from "rss-parser";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

type FeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  "content:encoded"?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string; type?: string };
  media?: { $?: { url?: string; medium?: string } };
  mediaThumbnail?: { $?: { url?: string } };
};

const parser: Parser<Record<string, unknown>, FeedItem> = new Parser({
  customFields: {
    item: [
      ["media:content", "media"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "content:encoded"],
    ],
  },
});

const IMG_TAG_REGEX = /<img[^>]+src=["']([^"']+)["']/i;
const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i;

function resolveUrl(maybeRelative: string, baseUrl?: string): string | null {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractImage(item: FeedItem): string | null {
  const base = item.link;
  const enclosureUrl = item.enclosure?.url;
  if (enclosureUrl && ((item.enclosure?.type ?? "").startsWith("image") || IMAGE_EXTENSION_REGEX.test(enclosureUrl))) {
    return resolveUrl(enclosureUrl, base);
  }
  if (item.media?.$?.url) return resolveUrl(item.media.$.url, base);
  if (item.mediaThumbnail?.$?.url) return resolveUrl(item.mediaThumbnail.$.url, base);

  const html = item["content:encoded"] ?? item.content ?? "";
  const match = html.match(IMG_TAG_REGEX);
  return match ? resolveUrl(match[1], base) : null;
}

function sourceNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source inconnue";
  }
}

async function fetchFeed(url: string): Promise<void> {
  const feed = await parser.parseURL(url);
  const sourceName = feed.title || sourceNameFromUrl(url);

  for (const item of feed.items) {
    if (!item.link || !item.title) continue;

    const publishedAt = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
    const summary = (item.contentSnippet ?? "").slice(0, 500) || null;
    const imageUrl = extractImage(item);

    await prisma.newsArticle.upsert({
      where: { sourceUrl: item.link },
      update: { title: item.title, summary, imageUrl, publishedAt, sourceName },
      create: {
        title: item.title,
        summary,
        imageUrl,
        publishedAt,
        sourceUrl: item.link,
        sourceName,
      },
    });
  }
}

async function pruneOldArticles(): Promise<void> {
  const keep = await prisma.newsArticle.findMany({
    select: { id: true },
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: env.newsFeed.maxArticles,
  });
  const keepIds = keep.map((a) => a.id);
  await prisma.newsArticle.deleteMany({ where: { id: { notIn: keepIds } } });
}

export async function refreshNewsFeeds(): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const url of env.newsFeed.urls) {
    try {
      await fetchFeed(url);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`[news-feed] Échec de récupération du flux ${url} :`, err instanceof Error ? err.message : err);
    }
  }
  try {
    await pruneOldArticles();
  } catch (err) {
    console.error("[news-feed] Échec du nettoyage des anciens articles :", err instanceof Error ? err.message : err);
  }
  return { ok, failed };
}

export function startNewsFeed(): void {
  if (env.newsFeed.urls.length === 0) {
    console.log("[news-feed] Aucun flux configuré (NEWS_FEED_URLS) : actualités IT désactivées");
    return;
  }
  console.log(`[news-feed] Démarrage de la synchronisation des actualités IT (toutes les ${env.newsFeed.intervalMs}ms)`);
  void refreshNewsFeeds()
    .then(({ ok, failed }) => console.log(`[news-feed] Synchronisation initiale : ${ok} flux OK, ${failed} en échec`))
    .catch((err) => console.error("[news-feed] Erreur inattendue :", err));
  setInterval(() => {
    void refreshNewsFeeds()
      .then(({ ok, failed }) => console.log(`[news-feed] Synchronisation : ${ok} flux OK, ${failed} en échec`))
      .catch((err) => console.error("[news-feed] Erreur inattendue :", err));
  }, env.newsFeed.intervalMs);
}
