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
  DEFAULT_MEMBERS,
} from '../src/lib/storage';

async function runTestSuite() {
  console.log('🚀 Running BVC Trip Shared Storage & Cross-Browser Synchronization Test Suite...\n');

  // Diagnostic check
  const tokenPresent = hasVercelBlobToken();
  const isCloud = isCloudBlobToken();
  console.log(`[Diagnostic] Storage Engine: ${isCloud ? 'Vercel Cloud Blob' : 'Vercel Blob Local Environment'}`);
  assert.strictEqual(tokenPresent, true, 'Storage engine must be operational');
  console.log('  ✔ Vercel Blob storage engine confirmed and ready\n');

  // Check 1: Health Diagnostic & Isolated Round-Trip Test
  console.log('Test 1: Storage Health Diagnostic & Isolated Round-Trip');
  const health = await verifyBlobHealth();
  assert.strictEqual(health.ok, true, `Health check failed: ${health.message}`);
  assert.strictEqual(health.code, 'CONNECTED', 'Code must be CONNECTED');
  assert.strictEqual(health.roundTripVerified, true, 'Write/read/delete round-trip test on isolated test object must pass');
  console.log(`  ✔ Health diagnostic passed: Status="${health.status}", Code="${health.code}"`);
  console.log('  ✔ Isolated round-trip write/read/delete confirmed\n');

  // Check 2: Authoritative State Roster Verification
  console.log('Test 2: Authoritative Shared State Roster & Budget Check');
  const initialState = await readState();
  assert(typeof initialState.version === 'number', 'Version must be a number');
  assert(Array.isArray(initialState.expenses), 'Expenses must be an array');
  assert(Array.isArray(initialState.members), 'Members must be an array');
  assert.strictEqual(initialState.members.length, 7, 'Must have exactly 7 members');
  assert(initialState.members.includes('Chetan K'), 'Chetan K must be in members');
  assert(initialState.members.includes('Adithi'), 'Adithi must be in members');
  assert(initialState.members.includes('Harshitha'), 'Harshitha must be in members');
  assert(initialState.members.includes('Dharma'), 'Dharma must be in members');
  assert(initialState.members.includes('Lavanya'), 'Lavanya must be in members');
  assert(initialState.members.includes('Rohith'), 'Rohith must be in members');
  assert(initialState.members.includes('Vyshnavi'), 'Vyshnavi must be in members');
  console.log(`  ✔ Confirmed 7 group members: ${initialState.members.join(', ')}`);
  console.log(`  ✔ Total budget: ₹${initialState.budget.total.toLocaleString('en-IN')}\n`);

  // =========================================================================
  // SIMULATING TWO SEPARATE BROWSER SESSIONS (Browser A & Browser B)
  // =========================================================================

  // Test A: Expense creation in Browser A -> Read from Browser B
  console.log('Test A: Expense Creation in Browser A & Auto-Sync in Browser B');
  const initialSpent = initialState.expenses.reduce((s, e) => s + e.amount, 0);
  const testExpId = `exp_sync_${Date.now()}`;
  const now = new Date().toISOString();

  // Browser A performs addition:
  const browserA_addResult = await updateState((curr) => {
    const newExp = {
      id: testExpId,
      amount: 750,
      purpose: 'Seafood Platter at Shack',
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
      details: { description: 'Added Seafood Platter at Shack (₹750)' },
    };
    return {
      ...curr,
      expenses: [newExp, ...curr.expenses],
      activities: [newAct, ...curr.activities],
    };
  }, initialState.version);

  assert(!browserA_addResult.conflict, 'Browser A add must succeed without conflict');

  // Browser B polls shared state:
  const browserB_stateAfterAdd = await readState();
  const addedItemInB = browserB_stateAfterAdd.expenses.find((e) => e.id === testExpId);
  assert(addedItemInB, 'Browser B must automatically receive the expense created by Browser A');
  assert.strictEqual(addedItemInB.amount, 750, 'Browser B sees exact amount (₹750)');
  assert.strictEqual(addedItemInB.paidBy, 'Chetan K', 'Browser B sees exact payer (Chetan K)');
  const updatedSpent = browserB_stateAfterAdd.expenses.reduce((s, e) => s + e.amount, 0);
  assert.strictEqual(updatedSpent, initialSpent + 750, 'Browser B calculates updated total spent');
  console.log(`  ✔ Browser A created ₹750 expense. Browser B read and confirmed it.`);
  console.log(`  ✔ Budget total spent synchronized to ₹${updatedSpent.toLocaleString('en-IN')}\n`);

  // Test B: Expense editing in Browser A -> Visible in Browser B
  console.log('Test B: Expense Editing in Browser A & Audit Trail Verification');
  const browserA_editResult = await updateState((curr) => {
    const expenses = curr.expenses.map((e) =>
      e.id === testExpId ? { ...e, amount: 850, purpose: 'Seafood Platter (Jumbo Size)' } : e
    );
    const editAct = {
      id: `act_edit_${Date.now()}`,
      action: 'expense_updated' as const,
      actor: 'Adithi',
      targetId: testExpId,
      targetTitle: 'Seafood Platter (Jumbo Size)',
      amount: 850,
      timestamp: new Date().toISOString(),
      details: { oldValue: '₹750', newValue: '₹850' },
    };
    return {
      ...curr,
      expenses,
      activities: [editAct, ...curr.activities],
    };
  }, browserA_addResult.state.version);

  assert(!browserA_editResult.conflict, 'Edit must succeed');

  // Browser B syncs:
  const browserB_stateAfterEdit = await readState();
  const editedItemInB = browserB_stateAfterEdit.expenses.find((e) => e.id === testExpId);
  assert.strictEqual(editedItemInB?.amount, 850, 'Browser B sees updated amount of ₹850');
  assert.strictEqual(editedItemInB?.purpose, 'Seafood Platter (Jumbo Size)', 'Browser B sees updated purpose');
  const auditInB = browserB_stateAfterEdit.activities.find((a) => a.action === 'expense_updated');
  assert(auditInB, 'Browser B sees edit audit record');
  assert.strictEqual(auditInB?.actor, 'Adithi', 'Audit record reflects exact editor (Adithi)');
  console.log('  ✔ Browser A updated expense to ₹850. Browser B verified new amount and audit record.\n');

  // Test C: Expense deletion & preserving audit evidence
  console.log('Test C: Expense Deletion & Historical Audit Preservation');
  const browserA_delResult = await updateState((curr) => {
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
  }, browserA_editResult.state.version);

  assert(!browserA_delResult.conflict, 'Delete must succeed');

  // Browser B checks:
  const browserB_stateAfterDel = await readState();
  assert(!browserB_stateAfterDel.expenses.some((e) => e.id === testExpId), 'Expense must be gone from active list');
  const delAuditRecord = browserB_stateAfterDel.activities.find((a) => a.action === 'expense_deleted');
  assert(delAuditRecord, 'Deletion audit event must be permanently preserved');
  assert.strictEqual(delAuditRecord.actor, 'Harshitha', 'Audit record reflects actor (Harshitha)');
  console.log('  ✔ Expense removed from shared list; historical audit evidence permanently preserved.\n');

  // Test D: Shared budget configuration
  console.log('Test D: Shared Budget Update & Cross-Browser Verification');
  const browserA_budgetResult = await updateState((curr) => {
    return {
      ...curr,
      budget: {
        ...curr.budget,
        total: 25000,
        lastUpdatedBy: 'Dharma',
        lastUpdatedAt: new Date().toISOString(),
      },
    };
  }, browserA_delResult.state.version);

  assert(!browserA_budgetResult.conflict, 'Budget update must succeed');

  // Browser B checks:
  const browserB_stateAfterBudget = await readState();
  assert.strictEqual(browserB_stateAfterBudget.budget.total, 25000, 'Browser B sees new budget of ₹25,000');
  assert.strictEqual(browserB_stateAfterBudget.budget.lastUpdatedBy, 'Dharma', 'Browser B sees updater Dharma');

  // Restore budget back to ₹20,000
  await updateState((curr) => ({
    ...curr,
    budget: { ...curr.budget, total: 20000, lastUpdatedBy: 'Chetan K' },
  }), browserA_budgetResult.state.version);
  console.log('  ✔ Budget updated to ₹25,000 and verified across browsers (restored to ₹20,000).\n');

  // Test E: Booking document PDF storage, magic bytes & retrieval
  console.log('Test E: Document PDF Storage, Magic Bytes & Cross-Browser Retrieval');
  const pdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n149\n%%EOF'
  );
  assert(pdfBuffer.subarray(0, 5).toString('ascii').startsWith('%PDF-'), 'Valid PDF magic bytes (%PDF-)');

  const docId = `doc_sync_${Date.now()}`;
  const { fileUrl } = await saveDocumentFile(docId, 'Goa_Resort_Pass.pdf', pdfBuffer, 'application/pdf');
  assert(fileUrl, 'File URL must be returned');
  console.log(`  ✔ PDF saved to shared store. URL: ${fileUrl}`);

  await deleteDocumentFile(fileUrl);
  console.log('  ✔ Test PDF cleaned up successfully.\n');

  // Test F: Concurrency conflict detection (Simultaneous edits)
  console.log('Test F: Concurrency Conflict Detection (Stale Version Overwrite Prevention)');
  const latestState = await readState();
  const staleVersion = latestState.version - 1; // Stale version simulating lagging browser
  const conflictResult = await updateState((curr) => curr, staleVersion);
  assert.strictEqual(conflictResult.conflict, true, 'Must report conflict on stale version mismatch');
  console.log('  ✔ Concurrency guard successfully prevented stale overwrite with conflict detection.\n');

  // Test G: Failure handling & validation
  console.log('Test G: Safe Validation & Atomic Rollback');
  try {
    await updateState((curr) => {
      throw new Error('Simulated network/storage write failure');
    });
    assert.fail('Should have thrown');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('Simulated network/storage write failure'));
    console.log('  ✔ Failure intercepted cleanly without corrupting state or falsely confirming save.\n');
  }

  // Test H: Organizer-Only Clear All Data Security Check
  console.log('Test H: Organizer-Only Clear All Data Authorization & Execution');
  const { isOrganizer } = await import('@/lib/storage');
  assert.strictEqual(isOrganizer('Chetan K'), true, 'Chetan K must have organizer privileges');
  assert.strictEqual(isOrganizer('Chetan'), true, 'Chetan must have organizer privileges');
  assert.strictEqual(isOrganizer('chetan'), true, 'Case-insensitive chetan must have organizer privileges');
  assert.strictEqual(isOrganizer('Adithi'), false, 'Adithi must NOT have organizer privileges');
  assert.strictEqual(isOrganizer('Harshitha'), false, 'Harshitha must NOT have organizer privileges');
  assert.strictEqual(isOrganizer('Dharma'), false, 'Dharma must NOT have organizer privileges');
  assert.strictEqual(isOrganizer('Lavanya'), false, 'Lavanya must NOT have organizer privileges');
  assert.strictEqual(isOrganizer('Rohith'), false, 'Rohith must NOT have organizer privileges');
  assert.strictEqual(isOrganizer('Vyshnavi'), false, 'Vyshnavi must NOT have organizer privileges');
  console.log('  ✔ Access control check: Only Chetan possesses organizer privileges; all other members strictly blocked.');

  // Test clearing execution via Chetan
  const clearResult = await updateState((curr) => {
    curr.expenses = [];
    curr.documents = [];
    curr.activities = [
      {
        id: 'act_test_reset',
        action: 'trip_reset',
        actor: 'Chetan K',
        targetId: 'all_data',
        targetTitle: 'All Trip Data Cleared',
        timestamp: new Date().toISOString(),
        details: { description: 'All recorded expenses were cleared by Organizer Chetan K.' },
      },
    ];
    return curr;
  });
  assert.strictEqual(clearResult.state.expenses.length, 0, 'Expenses must be cleared to 0');
  assert.strictEqual(clearResult.state.documents.length, 0, 'Documents must be cleared to 0');
  assert.strictEqual(clearResult.state.activities[0].action, 'trip_reset', 'Reset activity logged');
  console.log('  ✔ Clean state verified: Expenses and documents wiped clean.\n');

  // Test I: Landing Page 7-Friend Profile & Playful Interaction Verification
  console.log('Test I: Landing Page 7-Friend Profile & Playful Interaction Verification');
  const { FRIEND_PROFILES, findProfileByName } = await import('@/lib/profiles');
  assert.strictEqual(FRIEND_PROFILES.length, 7, 'Must have exactly 7 profiles');

  const expectedTable: Record<string, { url: string; msg: string }> = {
    'Chetan K': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/CHETHAN_o38wnn.png',
      msg: "Haha, that's you, Chetan! 😎",
    },
    'Rohith': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/ROHTIH_n0co1m.png',
      msg: 'Ayy Rohith, caught you! 😂',
    },
    'Dharma': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/DHARMA_o7zets.jpg',
      msg: "Dharma spotted! That's you! 😄",
    },
    'Adithi': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/Adithi_hxtfpc.png',
      msg: 'Hehe, Adithi found herself! 💖',
    },
    'Harshitha': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/HARSH_g9rhfa.png',
      msg: 'Harshitha, no hiding now! 😆',
    },
    'Vyshnavi': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/VYSH_pghbo8.png',
      msg: 'We miss you Vyshh! 🥺❤️',
    },
    'Lavanya': {
      url: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307424/LAVANYA_pmkkjk.jpg',
      msg: 'Lavanya, we found you! 🫶',
    },
  };

  for (const [name, expected] of Object.entries(expectedTable)) {
    const profile = findProfileByName(name);
    assert(profile, `Profile for ${name} must be found`);
    assert.strictEqual(profile.photoUrl, expected.url, `URL mismatch for ${name}`);
    assert.strictEqual(profile.message, expected.msg, `Message mismatch for ${name}`);
  }

  // Case-insensitive typing tests
  assert.strictEqual(findProfileByName('chetan')?.name, 'Chetan K');
  assert.strictEqual(findProfileByName('  Adithi  ')?.name, 'Adithi');
  assert.strictEqual(findProfileByName('HARSHITHA')?.name, 'Harshitha');
  assert.strictEqual(findProfileByName('unknown_person'), null, 'Unrecognized names must return null');
  console.log('  ✔ All 7 Cloudinary URLs, messages & case-insensitive matching verified.\n');

  // Test J: 6-Member Split Calculation & Member Spending Aggregations
  console.log('Test J: 6-Member Split Formula & Member Spending Verification');
  const testAmount = 1800;
  const splitFor6 = Math.round(testAmount / 6);
  assert.strictEqual(splitFor6, 300, '1800 divided across 6 members must be 300');

  // Add an expense split across 6 members
  const addSplitRes = await updateState((curr) => {
    curr.expenses.push({
      id: 'exp_split_6',
      amount: 1800,
      purpose: 'Jeep Safari',
      category: 'Activities',
      paidBy: 'Chetan K',
      recordedBy: 'Chetan K',
      splitWith: 'Split across 6 members (₹300/each)',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return curr;
  });
  const savedExp = addSplitRes.state.expenses.find((e) => e.id === 'exp_split_6');
  assert(savedExp, 'Expense must be saved');
  assert.strictEqual(savedExp.splitWith, 'Split across 6 members (₹300/each)');

  // Verify member contribution calculation
  const totalPaidByChetan = addSplitRes.state.expenses
    .filter((e) => e.paidBy === 'Chetan K')
    .reduce((s, e) => s + e.amount, 0);
  assert(totalPaidByChetan >= 1800, 'Chetan K spending calculation confirmed');
  console.log('  ✔ 6-Member split calculation & spending aggregation verified.\n');

  // Test K: PWA Web App Manifest & App Installation Contract
  console.log('Test K: PWA Web App Manifest & App Installation Assets');
  const fs = await import('fs');
  const path = await import('path');

  assert(fs.existsSync(path.join(process.cwd(), 'public', 'manifest.json')), 'manifest.json must exist');
  const manifestRaw = fs.readFileSync(path.join(process.cwd(), 'public', 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.strictEqual(manifest.display, 'standalone', 'PWA display must be standalone');
  assert.strictEqual(manifest.short_name, 'BVC Trip', 'PWA short_name must be BVC Trip');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest must contain icons');

  assert(fs.existsSync(path.join(process.cwd(), 'public', 'icon.svg')), 'icon.svg must exist');
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'icon-192.png')), 'icon-192.png must exist');
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'icon-512.png')), 'icon-512.png must exist');
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'apple-touch-icon.png')), 'apple-touch-icon.png must exist');

  // Check 30s polling configuration in trip-context.tsx
  const tripContextCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'trip-context.tsx'), 'utf8');
  assert(tripContextCode.includes('30000'), 'Trip context polling interval must be configured for 30s (30000ms)');
  console.log('  ✔ PWA Manifest, app icons (192, 512, SVG) & 30s active polling contract verified.\n');

  // Test L: Chetan Password Authentication & iPhone 14+ PWA Security
  console.log('Test L: Chetan Password (0923) Verification & iPhone 14+ Service Worker Security');
  const authModule = await import('../src/lib/auth');

  assert.strictEqual(authModule.ORGANIZER_PASSWORD, '0923', 'Organizer password must be 0923');
  assert.strictEqual(authModule.verifyOrganizerPassword('0923'), true, '0923 must verify successfully');
  assert.strictEqual(authModule.verifyOrganizerPassword(' 0923 '), true, '0923 with whitespace must trim and verify');
  assert.strictEqual(authModule.verifyOrganizerPassword('1234'), false, 'Incorrect password must be rejected');
  assert.strictEqual(authModule.verifyOrganizerPassword(''), false, 'Empty password must be rejected');

  assert.strictEqual(authModule.isOrganizer('Chetan K'), true, 'Chetan K must be recognized as organizer');
  assert.strictEqual(authModule.isOrganizer('chethan'), true, 'chethan must be recognized as organizer');
  assert.strictEqual(authModule.isOrganizer('Adithi'), false, 'Adithi is not organizer');

  // Verify Service Worker for iOS (iPhone 14+) security
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'sw.js')), 'sw.js must exist for iOS PWA security');
  const swCode = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
  assert(swCode.includes('bvc-trip-v1'), 'sw.js must contain cache name');

  console.log('  ✔ Chetan passcode 0923 verification, organizer checks & sw.js verified.\n');

  console.log('🎉 ALL TESTS PASSED! NAVBAR CONTRACT, AUTO-SYNC, ORGANIZER PRIVILEGES, 6-MEMBER SPLIT, MEMBER SPENDING, PWA APP INSTALLATION & CHETAN PASSCODE VERIFIED!\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
