import { promises as fs } from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';
import { TripState, StorageStatus } from '@/types';

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'bvc-trip-state.json');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const STATE_BLOB_PATHNAME = 'state/bvc-trip-state.json';

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

// Global in-process lock to prevent race conditions during write operations
let writeLock: Promise<unknown> = Promise.resolve();

export function hasVercelBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const isVercel = hasVercelBlobToken();
  if (isVercel) {
    try {
      await list({ limit: 1 });
      return {
        connected: true,
        provider: 'vercel-blob',
        message: 'Connected to Vercel Blob shared storage',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        provider: 'vercel-blob',
        message: `Vercel Blob connection error: ${msg}`,
      };
    }
  }

  // Local persistent storage
  try {
    await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    return {
      connected: true,
      provider: 'local-persistent',
      message: 'Connected to server persistent storage (ready for Vercel Blob in cloud)',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      provider: 'local-persistent',
      message: `Local storage initialization error: ${msg}`,
    };
  }
}

/**
 * Reads the latest persistent state from Vercel Blob or local storage.
 */
export async function readState(): Promise<TripState> {
  if (hasVercelBlobToken()) {
    try {
      const { blobs } = await list({ prefix: STATE_BLOB_PATHNAME, limit: 1 });
      if (blobs.length > 0 && blobs[0].downloadUrl) {
        const response = await fetch(blobs[0].downloadUrl, { cache: 'no-store' });
        if (response.ok) {
          const data = (await response.json()) as TripState;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to read state from Vercel Blob, falling back to local/default:', err);
    }
  }

  // Fallback to local filesystem persistence
  try {
    await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
    const content = await fs.readFile(STATE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(content) as TripState;
    return parsed;
  } catch (err: unknown) {
    // If file doesn't exist, initialize and write initial state
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeLocalState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    console.error('Error reading local state:', err);
    return INITIAL_STATE;
  }
}

async function writeLocalState(state: TripState): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
  // Write atomically using temporary file
  const tempPath = `${STATE_FILE_PATH}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  await fs.rename(tempPath, STATE_FILE_PATH);
}

/**
 * Saves state with mutex locking and optimistic concurrency checks.
 */
export async function updateState(
  mutator: (current: TripState) => TripState | Promise<TripState>,
  expectedVersion?: number
): Promise<{ state: TripState; conflict?: boolean }> {
  // Chain through the write lock to serialize updates
  let resolveCurrent: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveCurrent = resolve;
  });
  const prevLock = writeLock;
  writeLock = (async () => {
    await prevLock;
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

    // Save to Vercel Blob if available
    if (hasVercelBlobToken()) {
      try {
        await put(STATE_BLOB_PATHNAME, JSON.stringify(nextState), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
          cacheControlMaxAge: 0,
        });
      } catch (blobErr) {
        console.error('Failed to write state to Vercel Blob:', blobErr);
      }
    }

    // Always mirror to local file for resiliency
    await writeLocalState(nextState);

    return { state: nextState, conflict: false };
  } finally {
    resolveCurrent!();
  }
}

/**
 * Stores an uploaded file to Vercel Blob or local uploads directory.
 */
export async function saveDocumentFile(
  fileId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileUrl: string }> {
  if (hasVercelBlobToken()) {
    const blob = await put(`documents/${fileId}-${fileName}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });
    return { fileUrl: blob.url };
  }

  // Local storage
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const localFileName = `${fileId}-${fileName}`;
  const filePath = path.join(UPLOADS_DIR, localFileName);
  await fs.writeFile(filePath, buffer);
  return { fileUrl: `/api/documents/file?id=${fileId}` };
}

/**
 * Retrieves a locally saved document by ID.
 */
export async function getLocalDocumentFile(fileId: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const files = await fs.readdir(UPLOADS_DIR);
    const targetFile = files.find((f) => f.startsWith(`${fileId}-`));
    if (!targetFile) return null;

    const filePath = path.join(UPLOADS_DIR, targetFile);
    const buffer = await fs.readFile(filePath);
    const originalName = targetFile.replace(`${fileId}-`, '');
    return { buffer, fileName: originalName };
  } catch (err) {
    console.error('Error fetching local document file:', err);
    return null;
  }
}

/**
 * Deletes a document file from storage.
 */
export async function deleteDocumentFile(fileUrl: string, fileId: string): Promise<void> {
  if (hasVercelBlobToken() && fileUrl.startsWith('http')) {
    try {
      await del(fileUrl);
    } catch (err) {
      console.warn('Error deleting blob from Vercel Blob:', err);
    }
  }

  // Also clean up local file if exists
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    const targetFile = files.find((f) => f.startsWith(`${fileId}-`));
    if (targetFile) {
      await fs.unlink(path.join(UPLOADS_DIR, targetFile));
    }
  } catch {
    // Ignore error if file doesn't exist locally
  }
}
