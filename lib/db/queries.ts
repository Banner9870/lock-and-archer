import type { Transaction } from "kysely";
import { getTap } from "@/lib/tap";
import type { DatabaseSchema, AccountTable, StatusTable } from "@/lib/db";
import { getDb } from "@/lib/db";
import { getHandle } from "@atproto/common-web";
import { AtUri } from "@atproto/syntax";

export async function getAccountStatus(did: string) {
  const db = getDb();
  const status = await db
    .selectFrom("status")
    .selectAll()
    .where("authorDid", "=", did)
    .where("current", "=", 1)
    .orderBy("createdAt", "desc")
    .limit(1)
    .executeTakeFirst();
  return status ?? null;
}

export async function insertStatus(data: StatusTable) {
  await getDb().transaction().execute(async (tx) => {
    await tx
      .insertInto("status")
      .values(data)
      .onConflict((oc) =>
        oc.column("uri").doUpdateSet({
          status: data.status,
          createdAt: data.createdAt,
          indexedAt: data.indexedAt,
          current: data.current,
        })
      )
      .execute();
    await setCurrStatus(tx, data.authorDid);
  });
}

export async function deleteStatus(uri: AtUri) {
  await getDb().transaction().execute(async (tx) => {
    await tx.deleteFrom("status").where("uri", "=", uri.toString()).execute();
    await setCurrStatus(tx, uri.hostname);
  });
}

export async function upsertAccount(data: AccountTable) {
  await getDb()
    .insertInto("account")
    .values(data)
    .onConflict((oc) =>
      oc.column("did").doUpdateSet({
        handle: data.handle,
        active: data.active,
      })
    )
    .execute();
}

export async function deleteAccount(did: string) {
  const db = getDb();
  await db.deleteFrom("account").where("did", "=", did).execute();
  await db.deleteFrom("status").where("authorDid", "=", did).execute();
}

async function setCurrStatus(tx: Transaction<DatabaseSchema>, did: string) {
  await tx
    .updateTable("status")
    .set({ current: 0 })
    .where("authorDid", "=", did)
    .where("current", "=", 1)
    .execute();
  const latest = await tx
    .selectFrom("status")
    .select("uri")
    .where("authorDid", "=", did)
    .orderBy("createdAt", "desc")
    .limit(1)
    .executeTakeFirst();
  if (latest) {
    await tx
      .updateTable("status")
      .set({ current: 1 })
      .where("uri", "=", latest.uri)
      .execute();
  }
}

export async function getAccountHandle(did: string): Promise<string | null> {
  const db = getDb();
  const account = await db
    .selectFrom("account")
    .select("handle")
    .where("did", "=", did)
    .executeTakeFirst();
  if (account) return account.handle;
  try {
    const didDoc = await getTap().resolveDid(did);
    if (!didDoc) return null;
    return getHandle(didDoc) ?? null;
  } catch {
    return null;
  }
}

export async function getRecentStatuses(limit = 5) {
  const db = getDb();
  return db
    .selectFrom("status")
    .innerJoin("account", "status.authorDid", "account.did")
    .select([
      "status.uri",
      "status.authorDid",
      "status.status",
      "status.createdAt",
      "status.indexedAt",
      "status.current",
      "account.handle",
    ])
    .where("status.current", "=", 1)
    .orderBy("status.createdAt", "desc")
    .limit(limit)
    .execute();
}

export async function getTopStatuses(limit = 10) {
  const db = getDb();
  const rows = await db
    .selectFrom("status")
    .select(["status.status", db.fn.count("status.uri").as("count")])
    .where("status.current", "=", 1)
    .groupBy("status.status")
    .orderBy("count", "desc")
    .limit(limit)
    .execute();
  return rows as { status: string; count: string }[];
}
