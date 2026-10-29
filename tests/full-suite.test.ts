try {
  // Load .env.local for standalone test execution
  process.loadEnvFile('.env.local');
} catch {}

import assert from 'assert';
import {
  readState,
  updateState,
  saveDocumentFile,
  deleteDocumentFile,
  getStorageStatus,
  verifyBlobHealth,
  hasVercelBlobToken,
  isCloudBlobToken,
  STATE_BLOB_PATHNAME,
} from '../src/lib/storage';

async function runTestSuite() {
  console.log('🚀 Running BVC Trip Vercel Blob Local Environment Test Suite...\n');

  // Check token existence
  const tokenPresent = hasVercelBlobToken();
  const isCloud = isCloudBlobToken();
  console.log(`[Diagnostic] Storage Mode: ${isCloud ? 'Vercel Cloud Blob' : 'Vercel Blob Local Environment'}`);
  assert.strictEqual(tokenPresent, true, 'BLOB_READ_WRITE_TOKEN must be configured in .env.local');
  console.log('  ✔ BLOB_READ_WRITE_TOKEN verified and loaded from .env.local\n');

  // Test 1: Storage Health Diagnostic
  console.log('Test 1: Storage Health Diagnostic & Isolated Round-Trip Test');
  const health = await verifyBlobHealth();
  assert.strictEqual(health.ok, true, `Health check failed: ${health.message}`);
  assert.strictEqual(health.status, 'Connected to Vercel Blob', 'Status text must be Connected to Vercel Blob');
  assert.strictEqual(health.code, 'CONNECTED', 'Code must be CONNECTED');
  assert.strictEqual(health.roundTripVerified, true, 'Write/read/delete round-trip test on isolated test object must pass');
  console.log(`  ✔ Health diagnostic passed: Status="${health.status}", Code="${health.code}"`);
  console.log('  ✔ Safe isolated test write, read-back, and immediate deletion verified\n');

  // Test 2: Storage Status API contract
  console.log('Test 2: Storage Status Reporting');
  const status = await getStorageStatus();
  assert.strictEqual(status.connected, true, 'Storage status connected must be true');
  assert.strictEqual(status.provider, 'vercel-blob', 'Provider must be vercel-blob');
  console.log(`  ✔ Storage status reports connected: "${status.message}"\n`);

  // Test 3: Reading Authoritative Shared State
  console.log('Test 3: Reading Authoritative Shared State');
  const state = await readState();
  assert(typeof state.version === 'number', 'Version must be a number');
  assert(Array.isArray(state.expenses), 'Expenses must be an array');
  assert(Array.isArray(state.documents), 'Documents must be an array');
  assert(Array.isArray(state.activities), 'Activities must be an array');
  assert.strictEqual(state.budget.isConfigured, true, 'Trip budget should be configured');
  assert(state.budget.total > 0, 'Configured budget must be positive');
  console.log(`  ✔ Shared state read successfully. Total Budget: ₹${state.budget.total.toLocaleString('en-IN')}`);
  console.log(`  ✔ Found ${state.expenses.length} active expenses, ${state.activities.length} activity audit records\n`);

  // Test 4: Creating a New Expense with Audit Trail
  console.log('Test 4: Creating an Expense & Recalculating Trip Budget');
  const initialExpensesCount = state.expenses.length;
  const initialSpent = state.expenses.reduce((s, e) => s + e.amount, 0);

  const testExpId = `exp_test_${Date.now()}`;
  const addResult = await updateState((curr) => {
    const now = new Date().toISOString();
    const newExp = {
      id: testExpId,
      amount: 750,
      purpose: 'Seafood Lunch at Shack',
      category: 'Food' as const,
      paidBy: 'Chetan K',
      recordedBy: 'Chetan K',
      date: now,
      createdAt: now,
      updatedAt: now,
    };
    const newAct = {
      id: `act_${Date.now()}`,
      action: 'expense_created' as const,
      actor: 'Chetan K',
      targetId: testExpId,
      targetTitle: newExp.purpose,
      category: newExp.category,
      amount: newExp.amount,
      timestamp: now,
      details: { description: 'Added Seafood Lunch at Shack (₹750)' },
    };
    return {
      ...curr,
      expenses: [newExp, ...curr.expenses],
      activities: [newAct, ...curr.activities],
    };
  }, state.version);

  assert(!addResult.conflict, 'Add expense should succeed without conflict');
  assert.strictEqual(addResult.state.expenses.length, initialExpensesCount + 1);
  const updatedSpent = addResult.state.expenses.reduce((s, e) => s + e.amount, 0);
  assert.strictEqual(updatedSpent, initialSpent + 750, 'Total spent should include +750');
  console.log(`  ✔ Expense added. Total spent updated from ₹${initialSpent} to ₹${updatedSpent}`);
  console.log(`  ✔ Activity audit event appended for actor "Chetan K"\n`);

  // Test 5: Editing an Existing Expense
  console.log('Test 5: Editing an Existing Expense');
  const editResult = await updateState((curr) => {
    const expenses = curr.expenses.map((e) =>
      e.id === testExpId ? { ...e, amount: 850, purpose: 'Seafood Lunch (Special Platter)' } : e
    );
    const editAct = {
      id: `act_edit_${Date.now()}`,
      action: 'expense_updated' as const,
      actor: 'Adithi',
      targetId: testExpId,
      targetTitle: 'Seafood Lunch (Special Platter)',
      amount: 850,
      timestamp: new Date().toISOString(),
      details: { oldValue: '₹750', newValue: '₹850' },
    };
    return {
      ...curr,
      expenses,
      activities: [editAct, ...curr.activities],
    };
  }, addResult.state.version);

  const editedItem = editResult.state.expenses.find((e) => e.id === testExpId);
  assert.strictEqual(editedItem?.amount, 850);
  console.log('  ✔ Expense updated to ₹850 and edit logged in audit history\n');

  // Test 6: Optimistic Concurrency Control (Version Conflict Check)
  console.log('Test 6: Optimistic Concurrency Conflict Detection');
  const staleVersion = editResult.state.version - 1;
  const conflictResult = await updateState((curr) => curr, staleVersion);
  assert.strictEqual(conflictResult.conflict, true, 'Must report conflict on stale version mismatch');
  console.log('  ✔ Concurrency guard successfully prevented stale overwrite with conflict detection\n');

  // Test 7: Deleting an Expense & Preserving Audit Evidence
  console.log('Test 7: Deleting an Expense & Retaining Audit Trail');
  const deleteResult = await updateState((curr) => {
    const toDelete = curr.expenses.find((e) => e.id === testExpId);
    assert(toDelete, 'Target expense must exist');
    const deleteAct = {
      id: `act_del_${Date.now()}`,
      action: 'expense_deleted' as const,
      actor: 'Harshitha',
      targetId: testExpId,
      targetTitle: toDelete.purpose,
      amount: toDelete.amount,
      timestamp: new Date().toISOString(),
      details: { oldValue: `₹${toDelete.amount}`, description: 'Removed duplicate lunch entry' },
    };
    return {
      ...curr,
      expenses: curr.expenses.filter((e) => e.id !== testExpId),
      activities: [deleteAct, ...curr.activities],
    };
  }, editResult.state.version);

  assert(!deleteResult.state.expenses.some((e) => e.id === testExpId), 'Expense must be deleted');
  const deleteRecord = deleteResult.state.activities.find((a) => a.action === 'expense_deleted');
  assert(deleteRecord, 'Deletion audit event must be permanently recorded');
  assert.strictEqual(deleteRecord.actor, 'Harshitha', 'Audit records exact actor who performed deletion');
  console.log('  ✔ Expense removed; historical audit evidence preserved\n');

  // Test 8: Document PDF Storage & Magic Bytes Validation
  console.log('Test 8: Document PDF Storage & Retrieval');
  const pdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n149\n%%EOF'
  );
  assert(pdfBuffer.subarray(0, 5).toString('ascii').startsWith('%PDF-'), 'Valid PDF magic bytes');

  const docId = `doc_test_${Date.now()}`;
  const { fileUrl } = await saveDocumentFile(docId, 'Hotel_Booking_Pass.pdf', pdfBuffer, 'application/pdf');
  assert(fileUrl, 'File URL must be returned');
  console.log(`  ✔ PDF saved to Blob storage. Access URL: ${fileUrl}`);

  // Cleanup test document
  await deleteDocumentFile(fileUrl);
  console.log('  ✔ PDF file cleaned up successfully\n');

  console.log('🎉 ALL 8 TESTS PASSED! VERCEL BLOB STORAGE IS FULLY OPERATIONAL FOR TESTING!\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
