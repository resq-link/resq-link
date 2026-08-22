import * as fs from 'fs';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';

export type CountFilterOp = '==' | '>=' | '>';
export type CountFilterValue = string | boolean | number | Date;
export type CountFilter = { field: string; op: CountFilterOp; value: CountFilterValue };

type CountableQuery = FirebaseFirestore.Query & {
  count?: () => { get: () => Promise<{ data: () => { count: number } }> };
};

const REST_OP: Record<CountFilterOp, string> = {
  '==': 'EQUAL',
  '>=': 'GREATER_THAN_OR_EQUAL',
  '>': 'GREATER_THAN',
};

function requireAdminApp(): admin.app.App {
  getAdminFirestore();
  const app = admin.apps[0];
  if (!app) {
    throw new Error('Firebase Admin is not initialized');
  }
  return app;
}

function readProjectId(app: admin.app.App): string {
  const db = getAdminFirestore() as unknown as { projectId?: string };
  if (typeof db.projectId === 'string' && db.projectId) return db.projectId;

  if (app.options.projectId) return app.options.projectId;

  const fromEnv =
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (fromEnv) return fromEnv;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = json.trim().startsWith('{')
        ? JSON.parse(json)
        : JSON.parse(Buffer.from(json, 'base64').toString('utf8'));
      if (typeof parsed?.project_id === 'string' && parsed.project_id) {
        return parsed.project_id;
      }
    } catch {
      // Fall through.
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credentialsPath, 'utf8')) as { project_id?: string };
      if (typeof parsed.project_id === 'string' && parsed.project_id) {
        return parsed.project_id;
      }
    } catch {
      // Fall through to the explicit error below.
    }
  }

  throw new Error('Unable to resolve Firebase project id for count aggregations');
}

function toRestValue(value: CountFilterValue): Record<string, unknown> {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(Math.trunc(value)) };
  if (typeof value === 'string') return { stringValue: value };
  return { timestampValue: value.toISOString() };
}

function toRestFilter(filter: CountFilter) {
  return {
    fieldFilter: {
      field: { fieldPath: filter.field },
      op: REST_OP[filter.op],
      value: toRestValue(filter.value),
    },
  };
}

function parseAggregateCount(payload: unknown): number | null {
  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
  for (const row of rows) {
    const record = row as {
      result?: { aggregateFields?: Record<string, { integerValue?: string; doubleValue?: number }> };
      aggregateFields?: Record<string, { integerValue?: string; doubleValue?: number }>;
    };
    const fields = record.result?.aggregateFields || record.aggregateFields;
    const countField = fields?.count;
    if (!countField) continue;
    if (typeof countField.integerValue === 'string') {
      const parsed = Number.parseInt(countField.integerValue, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof countField.doubleValue === 'number') {
      return Math.trunc(countField.doubleValue);
    }
  }
  return null;
}

type CachedAccess = { token: string; projectId: string; expiresAt: number };

let cachedAccess: CachedAccess | null = null;
let inflightAccess: Promise<CachedAccess> | null = null;
let sdkCountSupported: boolean | null = null;

async function getRestAccess(): Promise<{ token: string; projectId: string }> {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 30_000) {
    return cachedAccess;
  }
  if (inflightAccess) return inflightAccess;

  inflightAccess = (async () => {
    const app = requireAdminApp();
    const credential = app.options.credential;
    if (!credential) {
      throw new Error('Missing Firebase Admin credentials');
    }
    const token = await credential.getAccessToken();
    const expiresInMs = typeof token.expires_in === 'number' ? token.expires_in * 1000 : 50 * 60 * 1000;
    cachedAccess = {
      token: token.access_token,
      projectId: readProjectId(app),
      expiresAt: Date.now() + expiresInMs,
    };
    return cachedAccess;
  })();

  try {
    return await inflightAccess;
  } finally {
    inflightAccess = null;
  }
}

async function countViaRest(collectionPath: string, filters: CountFilter[]): Promise<number> {
  const { token: accessToken, projectId } = await getRestAccess();
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: collectionPath }],
  };
  if (filters.length === 1) {
    structuredQuery.where = toRestFilter(filters[0]);
  } else if (filters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(toRestFilter),
      },
    };
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runAggregationQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery,
          aggregations: [{ alias: 'count', count: {} }],
        },
      }),
    }
  );

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? JSON.stringify((payload as { error?: unknown }).error)
        : raw || `HTTP ${response.status}`;
    throw new Error(`Firestore count aggregation failed for ${collectionPath}: ${message}`);
  }

  const count = parseAggregateCount(payload);
  if (count == null) {
    throw new Error(`Firestore count aggregation returned no result for ${collectionPath}`);
  }
  return count;
}

/**
 * Count matching documents without downloading them.
 * Uses Admin SDK `.count()` when available; otherwise the Firestore
 * aggregation REST API (firebase-admin 10 does not expose `.count()`).
 */
export async function countDocuments(
  collectionPath: string,
  filters: CountFilter[] = []
): Promise<number> {
  if (sdkCountSupported === false) {
    return countViaRest(collectionPath, filters);
  }

  const db = getAdminFirestore();
  let query: FirebaseFirestore.Query = db.collection(collectionPath);
  for (const filter of filters) {
    query = query.where(filter.field, filter.op, filter.value);
  }

  const countable = query as CountableQuery;
  if (sdkCountSupported == null) {
    sdkCountSupported = typeof countable.count === 'function';
  }
  if (sdkCountSupported && typeof countable.count === 'function') {
    const snapshot = await countable.count().get();
    return snapshot.data().count;
  }

  return countViaRest(collectionPath, filters);
}
