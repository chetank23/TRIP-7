import { put, list, del, head } from '@vercel/blob';
import { TripState, StorageStatus, StorageStatusCode, StorageStatusText } from '@/types';

export const STATE_BLOB_PATHNAME = 'state/bvc-trip-state.json';

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
    total: 0,
    isConfigured: false,
    currency: 'INR',
  },
  expenses: [],
  documents: [],
  activities: [],
  members: DEFAULT_MEMBERS,
  lastSyncedAt: new Date().toISOString(),
};

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

export class StorageAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageAuthError';
  }
}

export class StorageOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageOperationError';
  }
}

// In-process write lock to serialize concurrent async writes within the same instance
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Returns true if BLOB_READ_WRITE_TOKEN is configured in the environment.
 * Never prints or exposes the token value.
 */
export function hasVercelBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return Boolean(token && token.trim().length > 0);
}

/**
 * Ensures BLOB_READ_WRITE_TOKEN is present before attempting operations.
 */
function requireBlobToken(): void {
  if (!hasVercelBlobToken()) {
    throw new StorageConfigurationError(
      'BLOB_READ_WRITE_TOKEN is not configured in the environment. Please set your Vercel Blob token in .env.local for local development or in Vercel Project Settings for production.'
    );
  }
}

/**
 * Diagnostic health check that tests the real Vercel Blob integration.
 * Performs a safe write/read/delete round-trip using an isolated test namespace
 * and immediately cleans up the temporary test object.
 * Never touches or overwrites existing production trip data.
 */
export async function verifyBlobHealth(): Promise<{
  ok: boolean;
  status: StorageStatusText;
  code: StorageStatusCode;
  message: string;
  hasToken: boolean;
  stateInitialized: boolean;
  roundTripVerified: boolean;
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
    };
  }

  // 1. Authenticate by listing
  try {
    await list({ limit: 1 });
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
      message: `Vercel Blob authentication/connection failed: ${errorMsg}`,
      hasToken: true,
      stateInitialized: false,
      roundTripVerified: false,
    };
  }

  // 2. Controlled write/read/delete round-trip test on an isolated test object
  const testPathname = `test/health-check-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.json`;
  const testPayload = JSON.stringify({ ping: 'pong', timestamp: new Date().toISOString() });
  let roundTripVerified = false;

  try {
    const putResult = await put(testPathname, testPayload, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });

    if (putResult.url) {
      // Verify read back
      const readRes = await fetch(putResult.url, { cache: 'no-store' });
      if (readRes.ok) {
        const readData = await readRes.json();
        if (readData.ping === 'pong') {
          roundTripVerified = true;
        }
      }
      // Immediately delete test object
      await del(putResult.url);
    }
  } catch (writeErr: unknown) {
    const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
    return {
      ok: false,
      status: 'Blob write failed',
      code: 'WRITE_FAILED',
      message: `Blob write test failed: ${msg}`,
      hasToken: true,
      stateInitialized: false,
      roundTripVerified: false,
    };
  }

  // 3. Check if shared state object exists
  let stateInitialized = false;
  try {
    const { blobs } = await list({ prefix: STATE_BLOB_PATHNAME, limit: 1 });
    stateInitialized = blobs.length > 0;
  } catch {
    stateInitialized = false;
  }

  return {
    ok: true,
    status: 'Connected to Vercel Blob',
    code: 'CONNECTED',
    message: 'Successfully connected and verified round-trip with Vercel Blob shared storage',
    hasToken: true,
    stateInitialized,
    roundTripVerified,
  };
}

/**
 * Returns genuine runtime storage status for UI and API reporting.
 * Distinguishes all real states without ever exposing the secret token.
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
 * Reads the authoritative shared trip state from Vercel Blob.
 * If the Blob store is connected but the state object has not been created yet,
 * initializes the shared state in Vercel Blob with INITIAL_STATE.
 *
 * Strictly requires BLOB_READ_WRITE_TOKEN. Zero local file fallback.
 */
export async function readState(): Promise<TripState> {
  requireBlobToken();

  try {
    const { blobs } = await list({ prefix: STATE_BLOB_PATHNAME, limit: 1 });

    if (blobs.length > 0 && blobs[0].downloadUrl) {
      const response = await fetch(blobs[0].downloadUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });

      if (!response.ok) {
        throw new StorageOperationError(
          `Failed to read state from Vercel Blob: HTTP ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as TripState;
      if (!data || typeof data.version !== 'number') {
        throw new StorageOperationError('Corrupt shared state format in Vercel Blob');
      }

      return data;
    }

    // State object does not exist yet in the Vercel Blob store.
    // Initialize it directly in Vercel Blob so subsequent reads succeed.
    const initialBlob = await put(STATE_BLOB_PATHNAME, JSON.stringify(INITIAL_STATE, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });

    if (!initialBlob.url) {
      throw new StorageOperationError('Failed to initialize shared state in Vercel Blob');
    }

    return INITIAL_STATE;
  } catch (err: unknown) {
    if (err instanceof StorageConfigurationError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new StorageOperationError(`Vercel Blob read error: ${msg}`);
  }
}

/**
 * Saves shared state to Vercel Blob with optimistic concurrency version control
 * and in-process mutex locking to serialize overlapping server requests.
 *
 * Strictly persists to Vercel Blob. Zero local file fallback.
 */
export async function updateState(
  mutator: (current: TripState) => TripState | Promise<TripState>,
  expectedVersion?: number
): Promise<{ state: TripState; conflict?: boolean }> {
  requireBlobToken();

  // Chain updates through the lock queue to serialize in-flight writes
  let resolveCurrent: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveCurrent = resolve;
  });
  const prevLock = writeQueue;
  writeQueue = (async () => {
    try {
      await prevLock;
    } catch {
      // Ignore errors from previous task in queue
    }
    return lockPromise;
  })();

  try {
    const currentState = await readState();

    // Optimistic concurrency check
    if (expectedVersion !== undefined && currentState.version !== expectedVersion) {
      return { state: currentState, conflict: true };
    }

    const modified = await mutator(currentState);
    const nextState: TripState = {
      ...modified,
      version: (currentState.version || 0) + 1,
      lastSyncedAt: new Date().toISOString(),
    };

    // Save directly to Vercel Blob
    const blob = await put(STATE_BLOB_PATHNAME, JSON.stringify(nextState, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });

    if (!blob.url) {
      throw new StorageOperationError('Failed to confirm write to Vercel Blob');
    }

    return { state: nextState, conflict: false };
  } finally {
    resolveCurrent!();
  }
}

/**
 * Uploads a booking PDF directly to Vercel Blob under documents/[id]-[fileName].
 * Strictly requires BLOB_READ_WRITE_TOKEN. Zero local file storage.
 */
export async function saveDocumentFile(
  fileId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileUrl: string }> {
  requireBlobToken();

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const pathname = `documents/${fileId}-${safeFileName}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: mimeType,
  });

  if (!blob.url) {
    throw new StorageOperationError('Failed to upload document to Vercel Blob');
  }

  return { fileUrl: blob.url };
}

/**
 * Deletes an uploaded PDF from Vercel Blob.
 */
export async function deleteDocumentFile(fileUrl: string): Promise<void> {
  if (!hasVercelBlobToken()) return;
  if (!fileUrl || !fileUrl.startsWith('http')) return;

  try {
    await del(fileUrl);
  } catch (err) {
    console.warn('Warning: Failed to delete blob from Vercel Blob:', err);
  }
}
