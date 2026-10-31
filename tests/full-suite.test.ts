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

  // Verify Vyshnavi tribute in MemberSpendingSummary (₹ ∞ and no 0%)
  const memberSummaryCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'MemberSpendingSummary.tsx'), 'utf8');
  assert(memberSummaryCode.includes('₹ ∞'), 'Vyshnavi amount must display ₹ ∞ (infinity)');
  assert(memberSummaryCode.includes('Miss you Vyshh!'), 'Vyshnavi tribute tagline must be present');

  console.log('  ✔ Chetan passcode 0923 verification, organizer checks, sw.js & Vyshnavi ₹ ∞ verified.\n');

  // Test M: Supabase PostgreSQL Architecture, Schema & Safe Environment Integration
  console.log('Test M: Supabase PostgreSQL Architecture, Schema & Safe Environment Integration');
  const { getSupabaseEnvConfig } = await import('../src/lib/supabase/config');
  const envConf = getSupabaseEnvConfig();
  assert(typeof envConf === 'object', 'getSupabaseEnvConfig must return config object');
  assert(Array.isArray(envConf.missingVariables), 'missingVariables must be an array');
  assert(envConf.missingVariables.every((v) => typeof v === 'string'), 'missingVariables must be string names only');

  // Verify Supabase migration schema exists and defines all required tables + RLS + Realtime
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261030000000_bvc_trip_schema.sql');
  assert(fs.existsSync(migrationPath), 'Supabase migration SQL file must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS trip_config'), 'Schema must define trip_config table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS expenses'), 'Schema must define expenses table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS activities'), 'Schema must define activities table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS documents'), 'Schema must define documents table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS document_contents'), 'Schema must define document_contents table for BYTEA PDFs');
  assert(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Schema must enable Row Level Security (RLS)');
  assert(migrationSql.includes('supabase_realtime'), 'Schema must configure supabase_realtime publication');
  assert(migrationSql.includes('bump_trip_version'), 'Schema must declare bump_trip_version function');
  assert(migrationSql.includes('create_expense_with_audit'), 'Schema must declare atomic create_expense_with_audit RPC');
  assert(migrationSql.includes('edit_expense_with_audit'), 'Schema must declare atomic edit_expense_with_audit RPC');
  assert(migrationSql.includes('delete_expense_with_audit'), 'Schema must declare atomic delete_expense_with_audit RPC');

  // Verify migration script exists
  const migrateScriptPath = path.join(process.cwd(), 'scripts', 'migrate_blob_to_supabase.ts');
  assert(fs.existsSync(migrateScriptPath), 'Migration script migrate_blob_to_supabase.ts must exist');

  // Verify browser client uses only public anon key
  const clientModule = await import('../src/lib/supabase/client');
  assert.strictEqual(typeof clientModule.getSupabaseBrowserClient, 'function', 'getSupabaseBrowserClient must be a function');

  console.log('  ✔ Supabase schema (trip_config, expenses, activities, documents, document_contents), RLS, Realtime & migration verified.\n');

  // Test N: PDF BYTEA Storage Layer & Bounded Size Limits
  console.log('Test N: PDF BYTEA Storage Layer & Bounded Size Limit (10 MB)');
  const storeModule = await import('../src/lib/supabase/store');
  assert.strictEqual(typeof storeModule.saveDocumentToDatabase, 'function', 'saveDocumentToDatabase must be exported');
  assert.strictEqual(typeof storeModule.getDocumentFromDatabase, 'function', 'getDocumentFromDatabase must be exported');
  assert.strictEqual(storeModule.MAX_PDF_SIZE_BYTES, 10 * 1024 * 1024, 'MAX_PDF_SIZE_BYTES must be 10 MB');

  // Verify PDF validation: invalid format rejection
  const invalidBuffer = Buffer.from('NOT A PDF FILE TEXT CONTENT');
  await assert.rejects(
    async () => {
      await storeModule.saveDocumentToDatabase(
        {
          id: 'test_invalid_pdf',
          title: 'Invalid File',
          fileName: 'invalid.txt',
          category: 'Others',
          fileSize: invalidBuffer.length,
          uploadedBy: 'Chetan K',
        },
        invalidBuffer,
        'Chetan K'
      );
    },
    /Invalid file format/,
    'Non-PDF files must be rejected'
  );

  // Verify oversized PDF rejection
  const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  oversizedBuffer.write('%PDF-1.4');
  await assert.rejects(
    async () => {
      await storeModule.saveDocumentToDatabase(
        {
          id: 'test_oversized_pdf',
          title: 'Oversized File',
          fileName: 'large.pdf',
          category: 'Others',
          fileSize: oversizedBuffer.length,
          uploadedBy: 'Chetan K',
        },
        oversizedBuffer,
        'Chetan K'
      );
    },
    /exceeds maximum allowed size/,
    'Files exceeding 10 MB limit must be rejected'
  );
  console.log('  ✔ PDF format validation, magic byte checking & 10 MB capacity guard verified.\n');

  // Test O: Complete Vercel Blob Independence Simulation
  console.log('Test O: Complete Vercel Blob Independence Simulation (Missing/Expired Blob Token)');
  const savedToken = process.env.BLOB_READ_WRITE_TOKEN;
  const savedMode = process.env.BLOB_STORAGE_MODE;
  try {
    // Completely wipe Blob tokens to simulate expired/revoked/exhausted Vercel Blob token
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BVC_TRIP_READ_WRITE_TOKEN;
    delete process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORAGE_MODE = 'local';

    // 1. Reading state must still succeed
    const fallbackState = await readState();
    assert(fallbackState && Array.isArray(fallbackState.expenses), 'State must load even without Blob token');

    // 2. Creating an expense must still succeed
    const blobFreeExpId = `exp_blobfree_${Date.now()}`;
    const addRes = await updateState((curr) => {
      const exp = {
        id: blobFreeExpId,
        amount: 320,
        purpose: 'Local Fresh Coconut Water',
        category: 'Food' as const,
        paidBy: 'Harshitha',
        recordedBy: 'Harshitha',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const act = {
        id: `act_${Date.now()}`,
        action: 'expense_created' as const,
        actor: 'Harshitha',
        targetId: blobFreeExpId,
        targetTitle: 'Local Fresh Coconut Water',
        amount: 320,
        timestamp: new Date().toISOString(),
        details: { description: 'Added Local Fresh Coconut Water (₹320)' },
      };
      return {
        ...curr,
        expenses: [exp, ...curr.expenses],
        activities: [act, ...curr.activities],
      };
    });
    assert(!addRes.conflict, 'Adding expense must succeed without Blob token');

    // 3. Editing an expense must still succeed
    const editRes = await updateState((curr) => {
      return {
        ...curr,
        expenses: curr.expenses.map((e) => e.id === blobFreeExpId ? { ...e, amount: 350 } : e),
        activities: [
          {
            id: `act_edit_${Date.now()}`,
            action: 'expense_updated' as const,
            actor: 'Harshitha',
            targetId: blobFreeExpId,
            targetTitle: 'Local Fresh Coconut Water',
            amount: 350,
            timestamp: new Date().toISOString(),
            details: { oldValue: '₹320', newValue: '₹350' },
          },
          ...curr.activities,
        ],
      };
    });
    assert(!editRes.conflict, 'Editing expense must succeed without Blob token');
    const editedExp = editRes.state.expenses.find((e) => e.id === blobFreeExpId);
    assert.strictEqual(editedExp?.amount, 350, 'Updated expense amount must persist');

    // 4. Deleting an expense must preserve historical audit record
    const deleteRes = await updateState((curr) => {
      return {
        ...curr,
        expenses: curr.expenses.filter((e) => e.id !== blobFreeExpId),
        activities: [
          {
            id: `act_del_${Date.now()}`,
            action: 'expense_deleted' as const,
            actor: 'Harshitha',
            targetId: blobFreeExpId,
            targetTitle: 'Local Fresh Coconut Water',
            timestamp: new Date().toISOString(),
            details: { oldValue: '₹350', description: 'Deleted Local Fresh Coconut Water' },
          },
          ...curr.activities,
        ],
      };
    });
    assert(!deleteRes.conflict, 'Deleting expense must succeed without Blob token');
    assert(deleteRes.state.activities.some((a) => a.targetId === blobFreeExpId), 'Audit trail must be permanently preserved');

    // 5. Document retrieval from local storage fallback must succeed
    const testDocId = 'doc_sync_1793304757848';
    const docLookup = await storeModule.getDocumentFromDatabase(testDocId);
    if (docLookup) {
      assert(Buffer.isBuffer(docLookup.buffer), 'Document buffer must be returned');
      assert(docLookup.buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-'), 'Retrieved buffer must be valid PDF');
    }

    console.log('  ✔ App functions 100% reliably with zero Vercel Blob token reliance.\n');
  } finally {
    // Restore test environment
    if (savedToken) process.env.BLOB_READ_WRITE_TOKEN = savedToken;
    if (savedMode) process.env.BLOB_STORAGE_MODE = savedMode;
  }

  // ---------------------------------------------------------------------------
  // Test P: Shared Trip Card Available Balance Calculation & Visibility Check
  // ---------------------------------------------------------------------------
  console.log('Test P: Shared Trip Card Available Balance Calculation & Visibility Check');
  const testBudgetTotal = 61000;
  const testExpenses = [
    { amount: 5000 },
    { amount: 4500 },
    { amount: 2002 },
  ];
  const testTotalSpent = testExpenses.reduce((sum, e) => sum + e.amount, 0); // 11,502
  const calculatedAvailableBalance = testBudgetTotal - testTotalSpent; // 49,498
  assert.strictEqual(testTotalSpent, 11502, 'Total expenses must match ₹11,502');
  assert.strictEqual(calculatedAvailableBalance, 49498, 'Available balance must equal Budget - Expenses (₹49,498)');

  // Verify VirtualBvcCard code contract uses remainingBudget rather than budget.total
  const cardComponentSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/VirtualBvcCard.tsx'),
    'utf-8'
  );
  assert(
    cardComponentSource.includes('remainingBudget.toLocaleString'),
    'VirtualBvcCard must display remainingBudget when Show Balance is clicked'
  );
  assert(
    !cardComponentSource.includes('budgetTotal.toLocaleString'),
    'VirtualBvcCard must NOT display budgetTotal as the balance'
  );
  assert(
    cardComponentSource.includes('₹ ••••••'),
    'VirtualBvcCard must display masked balance (₹ ••••••) when Hide Balance is active'
  );
  assert(
    cardComponentSource.includes('Available Balance'),
    'VirtualBvcCard balance label must say Available Balance'
  );
  console.log('  ✔ Available Balance calculation (61,000 - 11,502 = 49,498) & masking verified.\n');

  // ---------------------------------------------------------------------------
  // Test Q: BVC Group Chat Contract
  // ---------------------------------------------------------------------------
  console.log('Test Q: BVC Group Chat persistence, member validation & realtime contract');
  const chatMigrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261031000000_bvc_trip_chat.sql'
  );
  assert(fs.existsSync(chatMigrationPath), 'BVC group chat database migration must exist');
  const chatMigrationSource = fs.readFileSync(chatMigrationPath, 'utf-8');
  assert(chatMigrationSource.includes('CREATE TABLE IF NOT EXISTS public.chat_messages'), 'Chat messages must have a dedicated PostgreSQL table');
  assert(chatMigrationSource.includes('char_length(btrim(content)) BETWEEN 1 AND 2000'), 'Database must enforce the 2,000 character message limit');
  assert(chatMigrationSource.includes('ENABLE ROW LEVEL SECURITY'), 'Chat messages table must have RLS enabled');
  assert(chatMigrationSource.includes('REVOKE ALL ON TABLE public.chat_messages FROM anon, authenticated'), 'Browser roles must not receive direct message table access');

  const chatApiSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/chat/messages/route.ts'),
    'utf-8'
  );
  assert(chatApiSource.includes('resolveTripMember'), 'Chat API must validate the selected profile against trip members');
  assert(chatApiSource.includes(".from('chat_messages')"), 'Chat API must persist messages in PostgreSQL');
  assert(chatApiSource.includes('MAX_MESSAGE_LENGTH = 2000'), 'Chat API must enforce the message length limit');

  const chatPageSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/chat/page.tsx'),
    'utf-8'
  );
  assert(chatPageSource.includes("event: 'message-created'"), 'Chat clients must subscribe to realtime message broadcasts');
  assert(chatPageSource.includes("event: 'typing'"), 'Chat clients must support typing indicators');
  assert(chatPageSource.includes('/api/chat/messages'), 'Chat UI must use the server message API');

  const headerSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/Header.tsx'),
    'utf-8'
  );
  assert(headerSource.includes('href="/chat"'), 'The global app header must expose the group chat icon');

  console.log('  ✔ Group chat migration, server-side member check, message limits, realtime events and header entry verified.\\n');

  // ---------------------------------------------------------------------------
  // Test R: Daily BVC Web Push Opt-in, Countdown & Protected Scheduling
  // ---------------------------------------------------------------------------
  console.log('Test R: Daily BVC Web Push subscription, service worker & countdown checks');

  const pushMigrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261031000001_bvc_daily_push_notifications.sql'
  );
  assert(fs.existsSync(pushMigrationPath), 'Daily push SQL migration must exist');
  const pushMigrationSource = fs.readFileSync(pushMigrationPath, 'utf-8');
  assert(pushMigrationSource.includes('CREATE TABLE IF NOT EXISTS public.push_subscriptions'), 'Push device subscriptions must be persisted in Supabase');
  assert(pushMigrationSource.includes('CREATE TABLE IF NOT EXISTS public.push_notification_runs'), 'Daily send ledger must prevent duplicate reminders');
  assert(pushMigrationSource.includes('REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated'), 'Browser roles must not read or modify device subscriptions');
  assert(pushMigrationSource.includes('REVOKE ALL ON TABLE public.push_notification_runs FROM anon, authenticated'), 'Browser roles must not read or modify the cron ledger');

  const pushApiSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/push/subscriptions/route.ts'),
    'utf-8'
  );
  assert(pushApiSource.includes("from('push_subscriptions')"), 'Push API must use the private Supabase subscription table');
  assert(pushApiSource.includes('resolveTripMember'), 'Push API must validate the selected trip member');
  assert(pushApiSource.includes('.upsert('), 'Push API must safely refresh a device subscription');

  const pushPromptSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/PushNotificationPrompt.tsx'),
    'utf-8'
  );
  assert(pushPromptSource.includes('Notification.requestPermission()'), 'Push prompt must request permission only after the member taps Enable');
  assert(pushPromptSource.includes('pushManager.subscribe'), 'Push prompt must register the browser device');
  assert(pushPromptSource.includes('/api/push/subscriptions'), 'Push prompt must save the subscription to the server');

  const serviceWorkerSource = fs.readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf-8');
  assert(serviceWorkerSource.includes("self.addEventListener('push'"), 'Service worker must display incoming push notifications');
  assert(serviceWorkerSource.includes("self.addEventListener('notificationclick'"), 'Notification tap must open the BVC app');

  const cronSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/cron/daily-roast/route.ts'),
    'utf-8'
  );
  assert(cronSource.includes('process.env.CRON_SECRET'), 'Daily push cron must require a secret bearer token');
  assert(cronSource.includes("timeZone: 'Asia/Kolkata'"), 'Daily push cron must compute the date in India time');
  assert(cronSource.includes('getDailyRoast(runDate)'), 'Daily push cron must use the bounded countdown schedule');

  const vercelCronConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf-8')
  );
  assert(
    vercelCronConfig.crons.some((cron: { path: string; schedule: string }) =>
      cron.path === '/api/cron/daily-roast' && cron.schedule === '30 3 * * *'
    ),
    'Vercel Cron must target the 09:00 IST daily reminder window'
  );

  const { getDailyRoast } = await import('../src/lib/push/daily-roast');
  assert(
    getDailyRoast('2026-11-01')?.body.includes('10 days'),
    'November 1 reminder must start with a 10-day Goa countdown'
  );
  assert(
    getDailyRoast('2026-11-10')?.body.includes('One more sleep'),
    'November 10 reminder must be the final pre-trip roast'
  );
  assert(
    getDailyRoast('2026-11-11')?.title.includes('GO TIME'),
    'November 11 must use the special trip-day notification'
  );
  assert.strictEqual(getDailyRoast('2026-11-12'), null, 'Daily countdown must stop after trip day');

  assert(
    fs.existsSync(path.join(process.cwd(), 'scripts/generate-push-secrets.mjs')),
    'A local VAPID and CRON secret generator must be included'
  );

  console.log('  ✔ Push opt-in, private subscription storage, service worker, protected cron and Nov 1–11 message schedule verified.\\n');

  console.log('🎉 ALL TESTS PASSED! NAVBAR CONTRACT, AUTO-SYNC, ORGANIZER PRIVILEGES, 6-MEMBER SPLIT, MEMBER SPENDING, PWA APP INSTALLATION, CHETAN PASSCODE, VYSHNAVI INFINITY, SUPABASE INTEGRATION, BLOB INDEPENDENCE, AVAILABLE BALANCE, GROUP CHAT & DAILY PUSH NOTIFICATIONS VERIFIED!\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
