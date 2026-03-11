/**
 * Chicago Sun-Times RSS ingest.
 * Feed: https://chicago.suntimes.com/rss/index.xml
 * Articles are stored in feed_article and attributed to Chicago Sun-Times.
 */

import { upsertFeedArticle } from "@/lib/db/queries";
import type { FeedArticleTable } from "@/lib/db";

const SUN_TIMES_RSS_URL = "https://chicago.suntimes.com/rss/index.xml";
const SOURCE_ID = "chicago-suntimes";
const SOURCE_LABEL = "Chicago Sun-Times";

/** Minimal RSS item shape we extract. */
type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

/** Strip CDATA and trim. */
function stripCdata(text: string): string {
  const s = String(text ?? "").trim();
  if (s.startsWith("<![CDATA[") && s.endsWith("]]>")) {
    return s.slice(9, -3).trim();
  }
  return s;
}

/** Parse RSS XML into items (lightweight extraction). */
function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const description = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1];
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1];
    const linkStr = stripCdata(link ?? "").trim();
    const titleStr = stripCdata(title ?? "").trim();
    if (linkStr && titleStr) {
      items.push({
        title: titleStr,
        link: linkStr,
        description: stripCdata(description ?? "").trim().slice(0, 2000),
        pubDate: stripCdata(pubDate ?? "").trim(),
      });
    }
  }
  return items;
}

/** Fetch RSS and return parsed items. */
async function fetchSunTimesRss(): Promise<RssItem[]> {
  const res = await fetch(SUN_TIMES_RSS_URL, {
    headers: { Accept: "application/xml, text/xml, */*" },
  });
  if (!res.ok) {
    throw new Error(`Sun-Times RSS fetch failed: ${res.status}`);
  }
  const xml = await res.text();
  return parseRssItems(xml);
}

/** Normalize pubDate to ISO string for storage. */
function toIsoDate(pubDate: string): string {
  if (!pubDate) return new Date().toISOString();
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Ingest Chicago Sun-Times RSS: fetch, parse, upsert into feed_article.
 * Call from API route or cron. Returns count of items processed.
 */
export async function ingestSunTimesRss(): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const items = await fetchSunTimesRss();
    const now = new Date().toISOString();
    for (const it of items) {
      const row: FeedArticleTable = {
        url: it.link,
        sourceId: SOURCE_ID,
        sourceLabel: SOURCE_LABEL,
        title: it.title,
        description: it.description,
        publishedAt: toIsoDate(it.pubDate),
        fetchedAt: now,
        neighborhoodId: null,
      };
      await upsertFeedArticle(row);
    }
    return { ok: true, count: items.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, count: 0, error: message };
  }
}
