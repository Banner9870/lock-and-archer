/**
 * PDS-based guide seeding.
 *
 * Prerequisites:
 * 1. PDS_APP_URL set (e.g. in .env.local): https://lock-and-archer-pds-production.up.railway.app
 * 2. App env has PUBLIC_URL, PRIVATE_KEY, and same DB as the running app (or run against local app.db).
 * 3. Sign in once via the app as the account you want to seed (so OAuth session exists for that DID).
 *
 * Run from project root (loads .env.local automatically):
 *   pnpm seed-guides
 *   # or with handle: SEED_HANDLE=alice.lock-and-archer-pds-production.up.railway.app pnpm seed-guides
 *
 * Or with DID: SEED_DID=did:plc:... pnpm seed-guides
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Client, l } from "@atproto/lex";
import { getOAuthClient } from "@/lib/auth/client";
import { getPdsAppUrlOrNull } from "@/lib/config";
import * as com from "@/src/lexicons/com";
import { insertGuide, insertGuideItem, getGuideByAuthorAndSlug } from "@/lib/db/queries";

// Load .env.local so PDS_APP_URL etc. are set when running from terminal
async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const content = await fs.readFile(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && !process.env[key]) process.env[key] = value;
      }
    }
  } catch {
    // .env.local optional
  }
}

type SeedItem = {
  type: "article" | "event" | "business";
  title?: string;
  description?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  latitude?: number;
  longitude?: number;
  neighborhoodId?: string;
};

type SeedGuide = {
  title: string;
  description?: string;
  slug?: string;
  items?: SeedItem[];
};

/** Resolve handle to DID via PDS resolveHandle (uses PDS host, so no subdomain cert issues). */
async function resolveHandleToDid(handle: string): Promise<string | null> {
  const pdsUrl = getPdsAppUrlOrNull();
  if (!pdsUrl) {
    console.error("PDS_APP_URL is not set; cannot resolve handle.");
    return null;
  }
  const url = new URL("/xrpc/com.atproto.identity.resolveHandle", pdsUrl);
  url.searchParams.set("handle", handle);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as { did?: string };
  return data.did ?? null;
}

async function main() {
  await loadEnvLocal();

  let seedDid = process.env.SEED_DID?.trim();
  const seedHandle = process.env.SEED_HANDLE?.trim();

  if (seedDid && seedHandle) {
    console.error("Set only one of SEED_DID or SEED_HANDLE, not both.");
    process.exit(1);
  }
  if (!seedDid && !seedHandle) {
    console.error(
      "Set SEED_HANDLE (e.g. alice.lock-and-archer-pds-production.up.railway.app) or SEED_DID."
    );
    process.exit(1);
  }

  if (seedHandle) {
    console.log(`Resolving handle ${seedHandle} to DID...`);
    const did = await resolveHandleToDid(seedHandle);
    if (!did) {
      console.error(
        `Could not resolve handle "${seedHandle}". Is PDS_APP_URL correct and is the account created?`
      );
      process.exit(1);
    }
    seedDid = did;
    console.log(`Resolved to DID: ${seedDid}`);
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(seedDid!);
  if (!oauthSession) {
    console.error(
      "No OAuth session for this account. Sign in once via the app as that user, then re-run seed-guides."
    );
    process.exit(1);
  }

  const lexClient = new Client(oauthSession);

  const filePath = path.join(process.cwd(), "seed", "guides.json");
  const raw = await fs.readFile(filePath, "utf8");
  const guides: SeedGuide[] = JSON.parse(raw);

  let created = 0;
  let skipped = 0;

  for (const g of guides) {
    const slug = g.slug ?? "";
    const existing = await getGuideByAuthorAndSlug(seedDid!, slug);
    if (existing) {
      console.log(`Skipping guide (already exists): ${slug || g.title}`);
      skipped++;
      continue;
    }

    const now = new Date();
    const createdAt = l.toDatetimeString(now);
    const record = {
      title: g.title,
      description: g.description ?? undefined,
      slug: g.slug ?? undefined,
      createdAt,
      updatedAt: createdAt,
    };

    const createResult = await lexClient.create(com.cpm.guides.guide.main, record);
    const guideUri = createResult.uri;
    const indexedAt = new Date().toISOString();

    await insertGuide({
      uri: guideUri,
      authorDid: seedDid!,
      title: g.title,
      description: g.description ?? "",
      slug: g.slug ?? "",
      forkedFrom: "",
      createdAt,
      updatedAt: createdAt,
      indexedAt,
    });

    if (!g.items?.length) continue;

    for (const item of g.items) {
      const itemCreatedAt = l.toDatetimeString(new Date());
      const lat = item.latitude;
      const lng = item.longitude;
      const itemRecord = {
        guideRef: guideUri,
        type: item.type,
        sourceId: item.sourceId ?? undefined,
        sourceUrl: item.sourceUrl ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        title: item.title ?? undefined,
        description: item.description ?? undefined,
        snapshotAt: itemCreatedAt,
        createdAt: itemCreatedAt,
        updatedAt: itemCreatedAt,
        ...(lat != null && lng != null && { latitude: String(lat), longitude: String(lng) }),
        ...(item.neighborhoodId != null && { neighborhoodId: item.neighborhoodId }),
      };

      const itemCreated = await lexClient.create(
        com.cpm.guides.guideItem.main,
        itemRecord
      );

      await insertGuideItem({
        uri: itemCreated.uri,
        guideUri,
        authorDid: seedDid!,
        type: item.type,
        sourceId: item.sourceId ?? "",
        sourceUrl: item.sourceUrl ?? "",
        sourceLabel: item.sourceLabel ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        snapshotAt: itemCreatedAt,
        indexedAt: new Date().toISOString(),
        latitude: lat ?? null,
        longitude: lng ?? null,
        neighborhoodId: item.neighborhoodId ?? null,
      });
    }
    created++;
  }

  console.log(
    `Seeded ${created} new guide(s), skipped ${skipped} existing (by slug) for ${seedHandle ?? seedDid}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
