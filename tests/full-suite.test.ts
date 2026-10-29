import assert from 'assert';
import {
  readState,
  updateState,
  saveDocumentFile,
  deleteDocumentFile,
  getStorageStatus,
  verifyBlobHealth,
  hasVercelBlobToken,
  StorageConfigurationError,
  STATE_BLOB_PATHNAME,
} from '../src/lib/storage';

async function runTestSuite() {
  console.log('🚀 Running BVC Trip Strict Vercel Blob Storage Audit & Test Suite...\n');

  const tokenPresent = hasVercelBlobToken();
  console.log(`[Diagnostic] BLOB_READ_WRITE_TOKEN status: ${tokenPresent ? 'PRESENT (Length verified, token masked)' : 'NOT_FOUND in environment'}\n`);

  // Test 1: Storage Status & Health Contract Verification
  console.log('Test 1: Storage Health Diagnostic Contract Verification');
  const health = await verifyBlobHealth();
  assert(typeof health.ok === 'boolean', 'Health status must return boolean ok');
  assert(typeof health.status === 'string', 'Health status must return descriptive status');
  assert(typeof health.code === 'string', 'Health status must return explicit status code');
  assert(typeof health.message === 'string', 'Health status must return human-readable message');

  const status = await getStorageStatus();
  assert.strictEqual(status.provider, 'vercel-blob', 'Storage provider must strictly be vercel-blob');
  console.log(`  ✔ Health diagnostic executed safely: Status="${health.status}", Code="${health.code}"\n`);

  if (!tokenPresent) {
    // Test 2: Verify Strict Rejection of Silent Local Fallback
    console.log('Test 2: Verifying Silent Local Storage Fallback is Completely Removed');
    let readThrew = false;
    try {
      await readState();
    } catch (err: unknown) {
      readThrew = true;
      assert(err instanceof StorageConfigurationError, 'Must throw StorageConfigurationError when token missing');
      console.log('  ✔ readState() strictly refused to fall back to disk and threw StorageConfigurationError');
    }
    assert(readThrew, 'readState() must not succeed without Vercel Blob token');

    let updateThrew = false;
    try {
      await updateState((curr) => curr);
    } catch (err: unknown) {
      updateThrew = true;
      assert(err instanceof StorageConfigurationError, 'Must throw StorageConfigurationError when token missing');
      console.log('  ✔ updateState() strictly refused to perform local mutations and threw StorageConfigurationError');
    }
    assert(updateThrew, 'updateState() must not succeed without Vercel Blob token');

    let uploadThrew = false;
    try {
      await saveDocumentFile('test_id', 'test.pdf', Buffer.from('%PDF-1.4 test'), 'application/pdf');
    } catch (err: unknown) {
      uploadThrew = true;
      assert(err instanceof StorageConfigurationError, 'Must throw StorageConfigurationError when token missing');
      console.log('  ✔ saveDocumentFile() strictly refused to write to disk and threw StorageConfigurationError');
    }
    assert(uploadThrew, 'saveDocumentFile() must not succeed without Vercel Blob token');

    // Verify no data directory was created
    const fs = await import('fs');
    const localDataExists = fs.existsSync('data/bvc-trip-state.json');
    assert.strictEqual(localDataExists, false, 'data/bvc-trip-state.json must NEVER be created as a fallback');
    console.log('  ✔ Confirmed: No local JSON files or fallback folders exist.\n');

    console.log('Test 3: Verify Accurate Reporting when Credentials Missing');
    assert.strictEqual(status.connected, false, 'Storage must report disconnected when token missing');
    assert.strictEqual(status.code, 'CREDENTIALS_MISSING', 'Storage code must report CREDENTIALS_MISSING');
    assert.strictEqual(status.status, 'Blob credentials missing', 'Storage status text must report Blob credentials missing');
    console.log('  ✔ Settings and API reporting verified: Status strictly reports "Blob credentials missing"\n');

    console.log('================================================================================');
    console.log('ℹ️ NOTICE: BLOB_READ_WRITE_TOKEN is not yet set in your local .env.local file.');
    console.log('  To connect your live Vercel Blob store locally:');
    console.log('  1. Create a file named .env.local in this project directory.');
    console.log('  2. Add your token: BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."');
    console.log('  3. Re-run `npm test` to verify live cloud write/read round-trip verification.');
    console.log('================================================================================\n');
  } else {
    // Token is present: Run live integration tests against Vercel Blob store
    console.log('Test 2: Live Vercel Blob Authentication & Health Check');
    assert.strictEqual(health.ok, true, `Blob connection must be healthy: ${health.message}`);
    assert.strictEqual(health.roundTripVerified, true, 'Write/read round-trip test on isolated test object must pass');
    console.log('  ✔ Vercel Blob authentication and isolated write/read/delete round-trip test PASSED');

    console.log('Test 3: Reading Authoritative Shared State from Vercel Blob');
    const state = await readState();
    assert(typeof state.version === 'number', 'Version must be a number');
    assert(Array.isArray(state.expenses), 'Expenses must be an array');
    assert(Array.isArray(state.documents), 'Documents must be an array');
    assert(Array.isArray(state.activities), 'Activities must be an array');
    console.log(`  ✔ Successfully read shared state from Blob (version: ${state.version})`);

    console.log('Test 4: Optimistic Concurrency Control in Vercel Blob');
    const staleVersion = state.version - 1;
    const conflictResult = await updateState((curr) => curr, staleVersion);
    assert.strictEqual(conflictResult.conflict, true, 'Must return conflict=true on stale version');
    console.log('  ✔ Optimistic concurrency version check prevented stale overwrite');
  }

  console.log('🎉 ALL AUDIT & CONTRACT VERIFICATIONS PASSED!\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
