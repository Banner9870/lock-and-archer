import { Kysely, Migration, Migrator } from "kysely";
import { getDb } from ".";

const migrations: Record<string, Migration> = {
  "001": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("auth_state")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("auth_session")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("auth_session").execute();
      await db.schema.dropTable("auth_state").execute();
    },
  },
  "002": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("account")
        .addColumn("did", "text", (col) => col.primaryKey())
        .addColumn("handle", "text", (col) => col.notNull())
        .addColumn("active", "integer", (col) => col.notNull().defaultTo(1))
        .execute();

      await db.schema
        .createTable("status")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .addColumn("current", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createIndex("status_current_idx")
        .on("status")
        .columns(["current", "indexedAt"])
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("status").execute();
      await db.schema.dropTable("account").execute();
    },
  },
  "003": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("guide")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("description", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("slug", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("forkedFrom", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("updatedAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("guide_item")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("guideUri", "text", (col) => col.notNull())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("type", "text", (col) => col.notNull())
        .addColumn("sourceId", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("sourceUrl", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("sourceLabel", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("title", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("description", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("snapshotAt", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createIndex("guide_indexed_at_idx")
        .on("guide")
        .column("indexedAt")
        .execute();
      await db.schema
        .createIndex("guide_author_did_idx")
        .on("guide")
        .column("authorDid")
        .execute();
      await db.schema
        .createIndex("guide_slug_idx")
        .on("guide")
        .column("slug")
        .execute();
      await db.schema
        .createIndex("guide_item_guide_uri_idx")
        .on("guide_item")
        .column("guideUri")
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("guide_item").execute();
      await db.schema.dropTable("guide").execute();
    },
  },
  "004": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .alterTable("guide_item")
        .addColumn("latitude", "real", (col) => col)
        .execute();
      await db.schema
        .alterTable("guide_item")
        .addColumn("longitude", "real", (col) => col)
        .execute();
      await db.schema
        .alterTable("guide_item")
        .addColumn("neighborhoodId", "text", (col) => col)
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.alterTable("guide_item").dropColumn("latitude").execute();
      await db.schema.alterTable("guide_item").dropColumn("longitude").execute();
      await db.schema.alterTable("guide_item").dropColumn("neighborhoodId").execute();
    },
  },
  "005": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("feed_article")
        .addColumn("url", "text", (col) => col.primaryKey())
        .addColumn("sourceId", "text", (col) => col.notNull())
        .addColumn("sourceLabel", "text", (col) => col.notNull())
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("description", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("publishedAt", "text", (col) => col.notNull())
        .addColumn("fetchedAt", "text", (col) => col.notNull())
        .addColumn("neighborhoodId", "text", (col) => col)
        .execute();
      await db.schema
        .createIndex("feed_article_published_at_idx")
        .on("feed_article")
        .column("publishedAt")
        .execute();
      await db.schema
        .createIndex("feed_article_source_id_idx")
        .on("feed_article")
        .column("sourceId")
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("feed_article").execute();
    },
  },
};

export function getMigrator() {
  const db = getDb();
  return new Migrator({
    db,
    provider: {
      getMigrations: async () => migrations,
    },
  });
}
