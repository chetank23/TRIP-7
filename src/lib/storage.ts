import { promises as fs } from 'fs';
import path from 'path';
import { put as cloudPut, list as cloudList, del as cloudDel } from '@vercel/blob';
import { TripState, StorageStatus, StorageStatusCode, StorageStatusText } from '@/types';

export const STATE_BLOB_PATHNAME = 'state/bvc-trip-state.json';
const LOCAL_BLOB_DIR = path.join(process.cwd(), '.local-blob');

const DEFAULT_MEMBERS = [
  'Chetan',
  'Rahul',
  'Priya',
  'Aakash',
  'Rohan',
  'Neha',
  'Sneha',
];

export const INITIAL_STATE: TripState = {
  version: 1,
  budget: {
    total: 20000,
    isConfigured: true,
    currency: 'INR',
    lastUpdatedBy: 'Chetan',
    lastUpdatedAt: new Date().toISOString(),
  },
  expenses: [
    {
      id: 'exp_1',
      amount: 450,
      purpose: 'Dinner at Cafe',
      category: 'Food',
      paidBy: 'Chetan',
      recordedBy: 'Chetan',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'exp_2',
      amount: 1200,
      purpose: 'Bus Tickets',
      category: 'Transport',
      paidBy: 'Rahul',
      recordedBy: 'Rahul',
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'exp_3',
      amount: 2500,
      purpose: 'Villa Advance',
      category: 'Stay',
      paidBy: 'Priya',
      recordedBy: 'Priya',
      date: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'exp_4',
      amount: 350,
      purpose: 'Snacks & Drinks',
      category: 'Shopping',
      paidBy: 'Aakash',
      recordedBy: 'Aakash',
      date: new Date(Date.now() - 3600000 * 28).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    },
    {
      id: 'exp_5',
      amount: 300,
      purpose: 'Auto Fare',
      category: 'Transport',
      paidBy: 'Rohan',
      recordedBy: 'Rohan',
      date: new Date(Date.now() - 3600000 * 30).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    },
    {
      id: 'exp_6',
      amount: 900,
      purpose: 'Beach Activities',
      category: 'Activities',
      paidBy: 'Neha',
      recordedBy: 'Neha',
      date: new Date(Date.now() - 3600000 * 48).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ],
  documents: [],
  activities: [
    {
      id: 'act_1',
      action: 'expense_created',
      actor: 'Chetan',
      targetId: 'exp_1',
      targetTitle: 'Dinner at Cafe',
      category: 'Food',
      amount: 450,
      timestamp: new Date().toISOString(),
      details: { description: 'Dinner at Cafe · ₹ 450' },
    },
    {
      id: 'act_2',
      action: 'expense_updated',
      actor: 'Rahul',
      targetId: 'exp_2',
      targetTitle: 'Bus Tickets',
      category: 'Transport',
      amount: 1200,
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      details: { description: 'Bus Tickets · ₹ 1,200' },
    },
    {
      id: 'act_3',
      action: 'expense_created',
      actor: 'Priya',
      targetId: 'exp_3',
      targetTitle: 'Villa Advance',
      category: 'Stay',
      amount: 2500,
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      details: { description: 'Villa Advance · ₹ 2,500' },
    },
    {
      id: 'act_4',
      action: 'budget_configured',
      actor: 'Chetan',
      targetId: 'budget',
      targetTitle: 'Trip Budget ₹ 20,000',
      amount: 20000,
      timestamp: new Date(Date.now() - 3600000 * 50).toISOString(),
      details: { description: 'Configured shared trip budget' },
    },
  ],
  members: DEFAULT_MEMBERS,
  lastSyncedAt: new Date().toISOString(),
};

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

export class StorageOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageOperationError';
  }
}

// In-process lock to serialize concurrent server requests
let writeQueue: Promise<unknown> = Promise.resolve();

export function getCleanToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  return token.trim().replace(/^["']|["']$/g, '');
}

export function isCloudBlob(): boolean {
  const mode = process.env.BLOB_STORAGE_MODE || process.env.BLOB_MODE;
  if (mode === 'local') return false;

  const token = getCleanToken();
  if (!token || !token.startsWith('vercel_blob_rw_') || token.includes('local_test')) {
    return false;
  }

  // Deployed on Vercel always uses cloud blob
  if (process.env.VERCEL === '1') return true;

  // Explicit cloud mode requested
  if (mode === 'cloud') return true;

  return true;
}

export function isLocalBlob(): boolean {
  return !isCloudBlob();
}

export function hasVercelBlobToken(): boolean {
  // If cloud mode is active, verify clean token
  if (isCloudBlob()) return true;

  // If deployed in production on Vercel without cloud token, fail gracefully
  if (process.env.VERCEL === '1') return false;

  // In local development / testing, Local Blob Environment is fully available
  return true;
}

export function isCloudBlobToken(): boolean {
  return isCloudBlob();
}

function requireBlobConfigured(): void {
  if (!hasVercelBlobToken()) {
    throw new StorageConfigurationError(
      'BLOB_READ_WRITE_TOKEN is missing on Vercel deployment. Please link a Vercel Blob store in project settings.'
    );
  }
}

// Helper for local blob file paths
function getLocalBlobPath(pathname: string): string {
  return path.join(LOCAL_BLOB_DIR, pathname.replace(/\//g, path.sep));
}

async function ensureLocalBlobDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function sanitizeState(raw: unknown): TripState {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_STATE };
  }
  const obj = raw as Partial<TripState>;
  return {
    version: typeof obj.version === 'number' ? obj.version : 1,
    budget: {
      total: typeof obj.budget?.total === 'number' ? obj.budget.total : INITIAL_STATE.budget.total,
      isConfigured: typeof obj.budget?.isConfigured === 'boolean' ? obj.budget.isConfigured : true,
      currency: obj.budget?.currency || 'INR',
      lastUpdatedBy: obj.budget?.lastUpdatedBy || 'Chetan',
      lastUpdatedAt: obj.budget?.lastUpdatedAt || new Date().toISOString(),
    },
    expenses: Array.isArray(obj.expenses) ? obj.expenses : [...INITIAL_STATE.expenses],
    documents: Array.isArray(obj.documents) ? obj.documents : [...INITIAL_STATE.documents],
    activities: Array.isArray(obj.activities) ? obj.activities : [...INITIAL_STATE.activities],
    members: Array.isArray(obj.members) && obj.members.length > 0 ? obj.members : [...INITIAL_STATE.members],
    lastSyncedAt: obj.lastSyncedAt || new Date().toISOString(),
  };
}

/**
 * Diagnostic health check verifying Blob integration.
 * Performs a safe write/read/delete round-trip on a separate temporary test object.
 */
export async function verifyBlobHealth(): Promise<{
  ok: boolean;
  status: StorageStatusText;
  code: StorageStatusCode;
  message: string;
  hasToken: boolean;
  stateInitialized: boolean;
  roundTripVerified: boolean;
  isCloud: boolean;
}> {
  if (!hasVercelBlobToken()) {
    return {
      ok: false,
      status: 'Blob credentials missing',
      code: 'CREDENTIALS_MISSING',
      message: 'BLOB_READ_WRITE_TOKEN is missing. Please configure it in .env.local or your Vercel project.',
      hasToken: false,
      stateInitialized: false,
      roundTripVerified: false,
      isCloud: false,
    };
  }

  const isCloud = isCloudBlob();

  if (isCloud) {
    const cleanToken = getCleanToken();
    // Cloud Vercel Blob Verification
    try {
      await cloudList({ limit: 1, token: cleanToken });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isAuth =
        errorMsg.includes('401') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('forbidden') ||
        errorMsg.includes('Invalid token');

      return {
        ok: false,
        status: isAuth ? 'Blob authentication failed' : 'Blob read failed',
        code: isAuth ? 'AUTH_FAILED' : 'READ_FAILED',
        message: `Vercel Cloud Blob connection failed: ${errorMsg}`,
        hasToken: true,
        stateInitialized: false,
        roundTripVerified: false,
        isCloud: true,
      };
    }

    // Isolated write/read/delete test on cloud
    const testPath = `test/health-check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.json`;
    let roundTripVerified = false;

    try {
      const putRes = await cloudPut(testPath, JSON.stringify({ ping: 'pong' }), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: cleanToken,
      });
      if (putRes.url) {
        const fetchRes = await fetch(putRes.url, { cache: 'no-store' });
        if (fetchRes.ok) {
          const json = await fetchRes.json();
          if (json.ping === 'pong') roundTripVerified = true;
        }
        await cloudDel(putRes.url, { token: cleanToken });
      }
    } catch (writeErr: unknown) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return {
        ok: false,
        status: 'Blob write failed',
        code: 'WRITE_FAILED',
        message: `Vercel Cloud Blob write test failed: ${msg}`,
        hasToken: true,
        stateInitialized: false,
        roundTripVerified: false,
        isCloud: true,
      };
    }

    return {
      ok: true,
      status: 'Connected to Vercel Blob',
      code: 'CONNECTED',
      message: 'Successfully connected and verified with Vercel Cloud Blob storage',
      hasToken: true,
      stateInitialized: true,
      roundTripVerified,
      isCloud: true,
    };
  }

  // Local Vercel Blob Environment Verification
  try {
    const testFile = getLocalBlobPath(`test/health-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.json`);
    await ensureLocalBlobDir(testFile);
    await fs.writeFile(testFile, JSON.stringify({ ping: 'pong' }), 'utf-8');
    const readBack = await fs.readFile(testFile, 'utf-8');
    const parsed = JSON.parse(readBack);
    const roundTripVerified = parsed.ping === 'pong';
    await fs.unlink(testFile);

    return {
      ok: true,
      status: 'Connected to Vercel Blob',
      code: 'CONNECTED',
      message: 'Connected to Vercel Blob Local Environment (.local-blob/ directory)',
      hasToken: true,
      stateInitialized: true,
      roundTripVerified,
      isCloud: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 'Blob write failed',
      code: 'WRITE_FAILED',
      message: `Local blob verification error: ${msg}`,
      hasToken: true,
      stateInitialized: false,
      roundTripVerified: false,
      isCloud: false,
    };
  }
}

/**
 * Returns storage status for API and UI reporting.
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const health = await verifyBlobHealth();

  return {
    connected: health.ok,
    status: health.status,
    code: health.code,
    message: health.message,
    provider: 'vercel-blob',
    stateExists: health.stateInitialized,
  };
}

/**
 * Reads shared state from Vercel Blob (Cloud or Local Environment).
 */
export async function readState(): Promise<TripState> {
  requireBlobConfigured();

  if (isCloudBlob()) {
    const cleanToken = getCleanToken();
    try {
      const { blobs } = await cloudList({ prefix: STATE_BLOB_PATHNAME, limit: 1, token: cleanToken });
      if (blobs.length > 0 && blobs[0].downloadUrl) {
        const fetchUrl = `${blobs[0].downloadUrl}?t=${Date.now()}`;
        const response = await fetch(fetchUrl, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        });
        if (response.ok) {
          const raw = await response.json();
          const cleanState = sanitizeState(raw);
          if (!Array.isArray(raw?.expenses) || !raw?.budget) {
            await cloudPut(STATE_BLOB_PATHNAME, JSON.stringify(cleanState, null, 2), {
              access: 'public',
              addRandomSuffix: false,
              allowOverwrite: true,
              contentType: 'application/json',
              token: cleanToken,
            });
          }
          return cleanState;
        }
      }

      // Initialize on cloud if not exists
      await cloudPut(STATE_BLOB_PATHNAME, JSON.stringify(INITIAL_STATE, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: cleanToken,
      });
      return INITIAL_STATE;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new StorageOperationError(`Cloud Blob read error: ${msg}`);
    }
  }

  // Local Blob Environment
  const stateFilePath = getLocalBlobPath(STATE_BLOB_PATHNAME);
  try {
    await ensureLocalBlobDir(stateFilePath);
    const content = await fs.readFile(stateFilePath, 'utf-8');
    const parsed = JSON.parse(content);
    return sanitizeState(parsed);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT' || err instanceof SyntaxError) {
      await ensureLocalBlobDir(stateFilePath);
      await fs.writeFile(stateFilePath, JSON.stringify(INITIAL_STATE, null, 2), 'utf-8');
      return INITIAL_STATE;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new StorageOperationError(`Local Blob read error: ${msg}`);
  }
}

/**
 * Updates shared state with optimistic concurrency control and mutex locking.
 */
export async function updateState(
  mutator: (current: TripState) => TripState | Promise<TripState>,
  expectedVersion?: number
): Promise<{ state: TripState; conflict?: boolean }> {
  requireBlobConfigured();

  let resolveCurrent: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveCurrent = resolve;
  });
  const prevLock = writeQueue;
  writeQueue = (async () => {
    try {
      await prevLock;
    } catch {}
    return lockPromise;
  })();

  try {
    const currentState = await readState();

    if (expectedVersion !== undefined && currentState.version !== expectedVersion) {
      return { state: currentState, conflict: true };
    }

    const modified = await mutator(currentState);
    const nextState: TripState = {
      ...modified,
      version: (currentState.version || 0) + 1,
      lastSyncedAt: new Date().toISOString(),
    };

    if (isCloudBlob()) {
      const cleanToken = getCleanToken();
      await cloudPut(STATE_BLOB_PATHNAME, JSON.stringify(nextState, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: cleanToken,
      });
      return { state: nextState, conflict: false };
    }

    // Local Blob Environment
    const stateFilePath = getLocalBlobPath(STATE_BLOB_PATHNAME);
    await ensureLocalBlobDir(stateFilePath);
    const tempFile = `${stateFilePath}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(nextState, null, 2), 'utf-8');
    await fs.rename(tempFile, stateFilePath);

    return { state: nextState, conflict: false };
  } finally {
    resolveCurrent!();
  }
}

/**
 * Saves a document file to Blob storage.
 */
export async function saveDocumentFile(
  fileId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileUrl: string }> {
  requireBlobConfigured();

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const pathname = `documents/${fileId}-${safeFileName}`;

  if (isCloudBlob()) {
    const cleanToken = getCleanToken();
    const blob = await cloudPut(pathname, buffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: mimeType,
      token: cleanToken,
    });
    return { fileUrl: blob.url };
  }

  // Local Blob Environment
  const filePath = getLocalBlobPath(pathname);
  await ensureLocalBlobDir(filePath);
  await fs.writeFile(filePath, buffer);
  return { fileUrl: `/api/documents/file?id=${fileId}` };
}

/**
 * Retrieves the binary buffer of a local blob document.
 */
export async function getLocalBlobFile(fileId: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  const docsDir = path.join(LOCAL_BLOB_DIR, 'documents');
  try {
    await fs.mkdir(docsDir, { recursive: true });
    const files = await fs.readdir(docsDir);
    const match = files.find((f) => f.startsWith(`${fileId}-`));
    if (!match) return null;

    const filePath = path.join(docsDir, match);
    const buffer = await fs.readFile(filePath);
    const originalName = match.replace(`${fileId}-`, '');
    return { buffer, fileName: originalName };
  } catch {
    return null;
  }
}

/**
 * Deletes a document file from Blob storage.
 */
export async function deleteDocumentFile(fileUrl: string): Promise<void> {
  if (!hasVercelBlobToken()) return;

  if (isCloudBlob() && fileUrl.startsWith('http')) {
    try {
      const cleanToken = getCleanToken();
      await cloudDel(fileUrl, { token: cleanToken });
    } catch (err) {
      console.warn('Failed to delete cloud blob:', err);
    }
    return;
  }

  // Local Blob Environment deletion
  const docsDir = path.join(LOCAL_BLOB_DIR, 'documents');
  try {
    const files = await fs.readdir(docsDir);
    const match = files.find((f) => fileUrl.includes(f));
    if (match) {
      await fs.unlink(path.join(docsDir, match));
    }
  } catch {}
}
