import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

const DATABASE_PATH = process.env.DATABASE_PATH || "app.db";

let _db: Kysely<DatabaseSchema> | null = null;

export const getDb = (): Kysely<DatabaseSchema> => {
  if (!_db) {
    const sqlite = new Database(DATABASE_PATH);
    sqlite.pragma("journal_mode = WAL");

    _db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
  }
  return _db;
};

export interface DatabaseSchema {
  auth_state: AuthStateTable;
  auth_session: AuthSessionTable;
  account: AccountTable;
  status: StatusTable;
  guide: GuideTable;
  guide_item: GuideItemTable;
}

interface AuthStateTable {
  key: string;
  value: string;
}

interface AuthSessionTable {
  key: string;
  value: string;
}

export interface AccountTable {
  did: string;
  handle: string;
  active: 0 | 1;
}

export interface StatusTable {
  uri: string;
  authorDid: string;
  status: string;
  createdAt: string;
  indexedAt: string;
  current: 0 | 1;
}

export interface GuideTable {
  uri: string;
  authorDid: string;
  title: string;
  description: string;
  slug: string;
  forkedFrom: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string;
}

export interface GuideItemTable {
  uri: string;
  guideUri: string;
  authorDid: string;
  type: string;
  sourceId: string;
  sourceUrl: string;
  sourceLabel: string;
  title: string;
  description: string;
  snapshotAt: string;
  indexedAt: string;
}
