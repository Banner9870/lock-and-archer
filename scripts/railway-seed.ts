/**
 * Railway deploy-time seed: reseed three dummy accounts (alice, bob, carol) on the PDS
 * with profiles, fallback avatars, mutual follows, and guides. Inserts guides into app DB.
 *
 * Prerequisites:
 * - PDS_APP_URL (e.g. https://lock-and-archer-pds-production.up.railway.app)
 * - SEED_PASSWORD: password for alice/bob/carol (default: testpass123)
 * - DATABASE_PATH: app SQLite path (default: app.db)
 *
 * Optional: SEED_HANDLES comma-separated to override the three handles.
 *
 * Run: pnpm railway-seed
 * Deploy: run after migrate, e.g. pnpm migrate && pnpm railway-seed && next start
 */

import fs from "node:fs/promises";
import path from "node:path";
import { l } from "@atproto/lex";
import { getPdsAppUrlOrNull } from "@/lib/config";
import { insertGuide, insertGuideItem, getGuideByAuthorAndSlug, upsertAccount } from "@/lib/db/queries";

const DEFAULT_SEED_PASSWORD = "testpass123";
const DEFAULT_HANDLES = [
  "alice.lock-and-archer-pds-production.up.railway.app",
  "bob.lock-and-archer-pds-production.up.railway.app",
  "carol.lock-and-archer-pds-production.up.railway.app",
];

// Minimal 1x1 transparent PNG (fallback if seed/default-avatar.png missing)
const FALLBACK_AVATAR_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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

type Session = { did: string; handle: string; accessJwt: string };

async function pdsPost(
  pdsUrl: URL,
  pathname: string,
  body: unknown,
  accessJwt?: string
): Promise<unknown> {
  const url = new URL(pathname, pdsUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessJwt) headers["Authorization"] = `Bearer ${accessJwt}`;
  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDS ${pathname}: ${res.status} ${text}`);
  }
  return res.json();
}

async function pdsPostBlob(
  pdsUrl: URL,
  pathname: string,
  body: Buffer,
  mimeType: string,
  accessJwt: string
): Promise<unknown> {
  const url = new URL(pathname, pdsUrl);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDS ${pathname}: ${res.status} ${text}`);
  }
  return res.json();
}

async function createSession(
  pdsUrl: URL,
  handle: string,
  password: string
): Promise<Session> {
  const out = (await pdsPost(pdsUrl, "/xrpc/com.atproto.server.createSession", {
    identifier: handle,
    password,
  })) as { did?: string; handle?: string; accessJwt?: string };
  if (!out.did || !out.accessJwt) throw new Error("createSession missing did or accessJwt");
  return { did: out.did, handle: out.handle ?? handle, accessJwt: out.accessJwt };
}

async function uploadBlob(
  pdsUrl: URL,
  accessJwt: string,
  imageBytes: Buffer,
  mimeType: string
): Promise<{ $link: string; mimeType: string; size: number }> {
  const out = (await pdsPostBlob(
    pdsUrl,
    "/xrpc/com.atproto.repo.uploadBlob",
    imageBytes,
    mimeType,
    accessJwt
  )) as { blob?: { $link?: string; mimeType?: string; size?: number } };
  const blob = out.blob;
  if (!blob || !blob.$link) throw new Error("uploadBlob missing blob ref");
  return {
    $link: blob.$link,
    mimeType: blob.mimeType ?? mimeType,
    size: blob.size ?? imageBytes.length,
  };
}

async function putProfile(
  pdsUrl: URL,
  accessJwt: string,
  did: string,
  displayName: string,
  avatarRef: { $link: string; mimeType: string; size: number } | null
) {
  const record: Record<string, unknown> = {
    displayName,
    createdAt: new Date().toISOString(),
  };
  if (avatarRef) record.avatar = avatarRef;
  await pdsPost(pdsUrl, "/xrpc/com.atproto.repo.putRecord", {
    repo: did,
    collection: "app.bsky.actor.profile",
    rkey: "self",
    record,
  }, accessJwt);
}

async function createFollow(
  pdsUrl: URL,
  accessJwt: string,
  repoDid: string,
  subjectDid: string
) {
  await pdsPost(pdsUrl, "/xrpc/com.atproto.repo.createRecord", {
    repo: repoDid,
    collection: "app.bsky.graph.follow",
    record: {
      $type: "app.bsky.graph.follow",
      subject: subjectDid,
      createdAt: new Date().toISOString(),
    },
  }, accessJwt);
}

async function createGuideRecord(
  pdsUrl: URL,
  accessJwt: string,
  did: string,
  record: { title: string; description?: string; slug?: string; createdAt: string; updatedAt: string }
) {
  const out = (await pdsPost(pdsUrl, "/xrpc/com.atproto.repo.createRecord", {
    repo: did,
    collection: "com.cpm.guides.guide",
    record: {
      ...record,
      $type: "com.cpm.guides.guide",
    },
  }, accessJwt)) as { uri: string };
  return out.uri;
}

async function createGuideItemRecord(
  pdsUrl: URL,
  accessJwt: string,
  did: string,
  record: Record<string, unknown>
) {
  const out = (await pdsPost(pdsUrl, "/xrpc/com.atproto.repo.createRecord", {
    repo: did,
    collection: "com.cpm.guides.guideItem",
    record: {
      ...record,
      $type: "com.cpm.guides.guideItem",
    },
  }, accessJwt)) as { uri: string };
  return out.uri;
}

async function getDefaultAvatarBytes(): Promise<Buffer> {
  const p = path.join(process.cwd(), "seed", "default-avatar.png");
  try {
    return await fs.readFile(p);
  } catch {
    return Buffer.from(FALLBACK_AVATAR_BASE64, "base64");
  }
}

async function main() {
  const pdsUrl = getPdsAppUrlOrNull();
  if (!pdsUrl) {
    console.error("PDS_APP_URL is not set.");
    process.exit(1);
  }

  const password = process.env.SEED_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD;
  const handlesRaw = process.env.SEED_HANDLES?.trim();
  const handles = handlesRaw
    ? handlesRaw.split(",").map((h) => h.trim()).filter(Boolean)
    : DEFAULT_HANDLES;
  if (handles.length < 2) {
    console.error("Need at least 2 seed handles (or use default SEED_HANDLES).");
    process.exit(1);
  }

  console.log("Creating sessions for", handles.join(", "));
  const sessions: Session[] = [];
  for (const handle of handles) {
    try {
      const session = await createSession(pdsUrl, handle, password);
      sessions.push(session);
      console.log(`  ${handle} -> ${session.did}`);
    } catch (e) {
      console.error(`  Failed to create session for ${handle}:`, e);
      process.exit(1);
    }
  }

  const avatarBytes = await getDefaultAvatarBytes();
  console.log("Setting profiles and avatars...");
  for (const session of sessions) {
    const blobRef = await uploadBlob(pdsUrl, session.accessJwt, avatarBytes, "image/png");
    const displayName = session.handle.split(".")[0];
    await putProfile(pdsUrl, session.accessJwt, session.did, displayName, blobRef);
    await upsertAccount({
      did: session.did,
      handle: session.handle,
      active: 1,
    });
  }

  console.log("Creating mutual follows...");
  for (const session of sessions) {
    const otherDids = sessions.filter((s) => s.did !== session.did).map((s) => s.did);
    for (const otherDid of otherDids) {
      await createFollow(pdsUrl, session.accessJwt, session.did, otherDid);
    }
  }

  const filePath = path.join(process.cwd(), "seed", "guides.json");
  let guides: SeedGuide[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf8");
    guides = JSON.parse(raw);
  } catch (e) {
    console.warn("Could not load seed/guides.json:", e);
  }

  if (guides.length > 0) {
    console.log("Seeding guides (distributed across accounts)...");
    let created = 0;
    let skipped = 0;
    for (let i = 0; i < guides.length; i++) {
      const g = guides[i];
      const session = sessions[i % sessions.length];
      const slug = g.slug ?? "";
      const existing = await getGuideByAuthorAndSlug(session.did, slug);
      if (existing) {
        skipped++;
        continue;
      }

      const now = new Date();
      const createdAt = l.toDatetimeString(now);
      const guideRecord = {
        title: g.title,
        description: g.description ?? undefined,
        slug: g.slug ?? undefined,
        createdAt,
        updatedAt: createdAt,
      };

      const guideUri = await createGuideRecord(
        pdsUrl,
        session.accessJwt,
        session.did,
        guideRecord
      );
      const indexedAt = new Date().toISOString();

      await insertGuide({
        uri: guideUri,
        authorDid: session.did,
        title: g.title,
        description: g.description ?? "",
        slug: g.slug ?? "",
        forkedFrom: "",
        createdAt,
        updatedAt: createdAt,
        indexedAt,
      });

      if (g.items?.length) {
        for (const item of g.items) {
          const itemCreatedAt = l.toDatetimeString(new Date());
          const lat = item.latitude;
          const lng = item.longitude;
          const itemRecord: Record<string, unknown> = {
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
          };
          if (lat != null && lng != null) {
            itemRecord.latitude = String(lat);
            itemRecord.longitude = String(lng);
          }
          if (item.neighborhoodId != null) itemRecord.neighborhoodId = item.neighborhoodId;

          const itemUri = await createGuideItemRecord(
            pdsUrl,
            session.accessJwt,
            session.did,
            itemRecord
          );

          await insertGuideItem({
            uri: itemUri,
            guideUri,
            authorDid: session.did,
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
      }
      created++;
    }
    console.log(`  Created ${created} guides, skipped ${skipped} (existing slug).`);
  }

  console.log("Railway seed done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
