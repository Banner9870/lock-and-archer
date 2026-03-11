import {
  JoseKey,
  Keyset,
  NodeOAuthClient,
  buildAtprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import type {
  NodeSavedSession,
  NodeSavedState,
  OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
import type { HandleResolver } from "@atproto-labs/handle-resolver";
import { XrpcHandleResolver } from "@atproto-labs/handle-resolver";
import { AtprotoHandleResolverNode } from "@atproto-labs/handle-resolver-node";

import { getDb } from "@/lib/db";

export const SCOPE = "atproto repo:xyz.statusphere.status";

let client: NodeOAuthClient | null = null;

const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** PUBLIC_URL must be a full origin (e.g. https://your-app.up.railway.app) with no trailing slash. */
function getPublicUrl(): string | undefined {
  const raw = process.env.PUBLIC_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

const PUBLIC_URL = getPublicUrl();

/** Optional. When set, handles under this PDS host (e.g. alice.lock-and-archer-pds-production.up.railway.app) are resolved via the PDS XRPC instead of .well-known, so login works without wildcard DNS. */
function getPdsAppUrl(): URL | undefined {
  const raw = process.env.PDS_APP_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url;
  } catch {
    return undefined;
  }
}

const PDS_APP_URL = getPdsAppUrl();

/** Handle resolver that uses the configured PDS XRPC for handles on that host, and default (.well-known) for others. */
function createHandleResolver(): HandleResolver | undefined {
  if (!PDS_APP_URL) return undefined;
  const pdsHostname = PDS_APP_URL.hostname.toLowerCase();
  const xrpcResolver = new XrpcHandleResolver(PDS_APP_URL);
  const defaultResolver = new AtprotoHandleResolverNode({});

  return {
    async resolve(handle, options) {
      const domain =
        handle.includes(".") ? handle.slice(handle.indexOf(".") + 1) : handle;
      const usePds = domain === pdsHostname || handle.toLowerCase() === pdsHostname;
      if (usePds) {
        return xrpcResolver.resolve(handle, options);
      }
      return defaultResolver.resolve(handle, options);
    },
  };
}

function getClientMetadata(): OAuthClientMetadataInput {
  if (PUBLIC_URL) {
    return {
      client_id: `${PUBLIC_URL}/oauth-client-metadata.json`,
      client_name: "Lock and Archer",
      client_uri: PUBLIC_URL,
      redirect_uris: [`${PUBLIC_URL}/oauth/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: SCOPE,
      token_endpoint_auth_method: "private_key_jwt" as const,
      token_endpoint_auth_signing_alg: "ES256" as const,
      jwks_uri: `${PUBLIC_URL}/.well-known/jwks.json`,
      dpop_bound_access_tokens: true,
    };
  }
  return buildAtprotoLoopbackClientMetadata({
    scope: SCOPE,
    redirect_uris: ["http://127.0.0.1:3000/oauth/callback"],
  });
}

async function getKeyset(): Promise<Keyset | undefined> {
  if (PUBLIC_URL && PRIVATE_KEY) {
    return new Keyset([await JoseKey.fromJWK(JSON.parse(PRIVATE_KEY))]);
  }
  return undefined;
}

export async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (client) return client;

  const handleResolver = createHandleResolver();

  client = new NodeOAuthClient({
    clientMetadata: getClientMetadata(),
    keyset: await getKeyset(),
    ...(handleResolver && { handleResolver }),

    stateStore: {
      async get(key: string) {
        const db = getDb();
        const row = await db
          .selectFrom("auth_state")
          .select("value")
          .where("key", "=", key)
          .executeTakeFirst();
        return row ? JSON.parse(row.value) : undefined;
      },
      async set(key: string, value: NodeSavedState) {
        const db = getDb();
        const valueJson = JSON.stringify(value);
        await db
          .insertInto("auth_state")
          .values({ key, value: valueJson })
          .onConflict((oc) => oc.column("key").doUpdateSet({ value: valueJson }))
          .execute();
      },
      async del(key: string) {
        const db = getDb();
        await db.deleteFrom("auth_state").where("key", "=", key).execute();
      },
    },

    sessionStore: {
      async get(key: string) {        const db = getDb();
        const row = await db
          .selectFrom("auth_session")
          .select("value")
          .where("key", "=", key)
          .executeTakeFirst();
        return row ? JSON.parse(row.value) : undefined;
      },
      async set(key: string, value: NodeSavedSession) {
        const db = getDb();
        const valueJson = JSON.stringify(value);
        await db
          .insertInto("auth_session")
          .values({ key, value: valueJson })
          .onConflict((oc) => oc.column("key").doUpdateSet({ value: valueJson }))
          .execute();
      },
      async del(key: string) {
        const db = getDb();
        await db.deleteFrom("auth_session").where("key", "=", key).execute();
      },
    },
  });

  return client;
}
