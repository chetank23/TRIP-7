/**
 * BVC Trip — Supabase PostgreSQL Authoritative Data Store
 * Handles all shared financial data, BYTEA PDF document storage, version concurrency,
 * soft-deletes & coordinated audit history.
 */

import { PoolClient } from 'pg';
import { getSupabaseServerClient, hasSupabaseServerConfig } from './server';
import { getPostgresPool } from './db';
import { TripState, Expense, TripDocument, ActivityEvent, ExpenseCategory, DocumentCategory } from '@/types';
import { DEFAULT_MEMBERS, INITIAL_STATE, getLocalBlobFile } from '@/lib/storage';

export class DatabaseOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseOperationError';
  }
}

export class ConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * Maximum PDF upload size limit: 10 MB per PDF.
 * Ensures database capacity is preserved while supporting real trip passes and receipts.
 */
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Health check verifying Supabase PostgreSQL connectivity and tables.
 */
export async function verifySupabaseHealth(): Promise<{
  ok: boolean;
  status: string;
  code: string;
  message: string;
}> {
  if (!hasSupabaseServerConfig()) {
    return {
      ok: false,
      status: 'Supabase credentials missing',
      code: 'CREDENTIALS_MISSING',
      message: 'BVC_SUPABASE_URL or BVC_SUPABASE_SECRET_KEY is not configured.',
    };
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error: configErr } = await supabase
      .from('trip_config')
      .select('id, version, updated_at')
      .eq('id', 'default')
      .maybeSingle();

    if (configErr) {
      return {
        ok: false,
        status: 'Supabase table error',
        code: configErr.code || 'TABLE_NOT_FOUND',
        message: `Database query error: ${configErr.message}`,
      };
    }

    return {
      ok: true,
      status: 'Connected to Supabase PostgreSQL',
      code: 'CONNECTED',
      message: 'Supabase PostgreSQL database is connected, verified, and authoritative.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 'Supabase connection failed',
      code: 'CONNECTION_FAILED',
      message: `Failed to connect to Supabase: ${msg}`,
    };
  }
}

/**
 * Reads authoritative shared trip state from Supabase PostgreSQL.
 */
export async function readStateFromSupabase(): Promise<TripState> {
  const supabase = getSupabaseServerClient();

  // 1. Fetch trip config
  let { data: configData, error: configError } = await supabase
    .from('trip_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (configError) {
    throw new DatabaseOperationError(`Failed to fetch trip config: ${configError.message}`);
  }

  if (!configData) {
    // Seed default trip_config if not present
    await supabase.from('trip_config').upsert({
      id: 'default',
      budget_total: INITIAL_STATE.budget.total,
      budget_is_configured: true,
      budget_currency: 'INR',
      budget_last_updated_by: 'Chetan K',
      members: DEFAULT_MEMBERS,
      version: 1,
      updated_at: new Date().toISOString(),
    });

    const { data: seeded } = await supabase
      .from('trip_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    configData = seeded;
  }

  // 2. Fetch active expenses (exclude soft-deleted)
  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (expensesError) {
    throw new DatabaseOperationError(`Failed to fetch expenses: ${expensesError.message}`);
  }

  // 3. Fetch recent activities
  const { data: activitiesData, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (activitiesError) {
    throw new DatabaseOperationError(`Failed to fetch activities: ${activitiesError.message}`);
  }

  // 4. Fetch active documents
  const { data: documentsData, error: documentsError } = await supabase
    .from('documents')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (documentsError) {
    throw new DatabaseOperationError(`Failed to fetch documents: ${documentsError.message}`);
  }

  const budgetTotal = configData?.budget_total != null ? Number(configData.budget_total) : INITIAL_STATE.budget.total;
  const members = Array.isArray(configData?.members) && configData.members.length > 0 ? configData.members : DEFAULT_MEMBERS;
  const version = configData?.version || 1;

  const expenses: Expense[] = (expensesData || []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    purpose: row.purpose,
    category: row.category as ExpenseCategory,
    paidBy: row.paid_by,
    recordedBy: row.recorded_by,
    date: row.expense_date,
    splitWith: row.split_with || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const activities: ActivityEvent[] = (activitiesData || []).map((row) => ({
    id: row.id,
    action: row.action,
    actor: row.actor,
    targetId: row.target_id || undefined,
    targetTitle: row.target_title || undefined,
    category: row.category || undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    timestamp: row.created_at,
    details: row.details || {},
  }));

  const documents: TripDocument[] = (documentsData || []).map((row) => ({
    id: row.id,
    title: row.title,
    fileName: row.file_name,
    category: row.category as DocumentCategory,
    fileUrl: `/api/documents/file?id=${encodeURIComponent(row.id)}`,
    fileSize: Number(row.file_size),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    version,
    budget: {
      total: budgetTotal,
      isConfigured: configData?.budget_is_configured ?? true,
      currency: configData?.budget_currency || 'INR',
      lastUpdatedBy: configData?.budget_last_updated_by || 'Chetan K',
      lastUpdatedAt: configData?.budget_last_updated_at || new Date().toISOString(),
    },
    expenses,
    documents,
    activities,
    members,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Increment config version and return new version number.
 */
async function bumpConfigVersion(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('bump_trip_version');

  if (error || typeof data !== 'number') {
    const { data: current } = await supabase.from('trip_config').select('version').eq('id', 'default').single();
    const nextVer = (current?.version || 1) + 1;
    await supabase.from('trip_config').update({ version: nextVer, updated_at: new Date().toISOString() }).eq('id', 'default');
    return nextVer;
  }
  return data;
}

/**
 * Adds an expense to Supabase PostgreSQL and coordinates atomic audit creation.
 */
export async function addExpenseInSupabase(
  expenseData: {
    id: string;
    amount: number;
    purpose: string;
    category: ExpenseCategory;
    paidBy: string;
    recordedBy: string;
    date: string;
    splitWith?: string;
    notes?: string;
  },
  actor: string
): Promise<TripState> {
  const now = new Date().toISOString();
  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Direct PostgreSQL Transaction if available
  const pool = getPostgresPool();
  if (pool) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO expenses (id, amount, purpose, category, paid_by, recorded_by, expense_date, split_with, notes, version, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, FALSE, $10, $10)`,
        [
          expenseData.id,
          expenseData.amount,
          expenseData.purpose,
          expenseData.category,
          expenseData.paidBy,
          expenseData.recordedBy,
          expenseData.date || now,
          expenseData.splitWith || null,
          expenseData.notes || null,
          now,
        ]
      );

      await client.query(
        `INSERT INTO activities (id, action, actor, target_id, target_title, category, amount, details, created_at)
         VALUES ($1, 'expense_created', $2, $3, $4, $5, $6, $7, $8)`,
        [
          actId,
          actor,
          expenseData.id,
          expenseData.purpose,
          expenseData.category,
          expenseData.amount,
          JSON.stringify({
            description: `Added ${expenseData.purpose} (₹${expenseData.amount.toLocaleString('en-IN')}) paid by ${expenseData.paidBy}`,
            splitWith: expenseData.splitWith || 'Equal split (6 members)',
          }),
          now,
        ]
      );

      await client.query(
        `UPDATE trip_config
         SET members = ARRAY(SELECT DISTINCT unnest(array_append(members, $1))),
             version = version + 1,
             updated_at = $2
         WHERE id = 'default'`,
        [expenseData.paidBy, now]
      );

      await client.query('COMMIT');
      return readStateFromSupabase();
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      console.warn('Postgres pool addExpense transaction failed, trying Supabase client:', err);
    } finally {
      if (client) client.release();
    }
  }

  // 2. Supabase Client with RPC
  const supabase = getSupabaseServerClient();
  const { error: rpcErr } = await supabase.rpc('create_expense_with_audit', {
    p_id: expenseData.id,
    p_amount: expenseData.amount,
    p_purpose: expenseData.purpose,
    p_category: expenseData.category,
    p_paid_by: expenseData.paidBy,
    p_recorded_by: expenseData.recordedBy,
    p_expense_date: expenseData.date || now,
    p_split_with: expenseData.splitWith || null,
    p_notes: expenseData.notes || null,
    p_actor: actor,
    p_act_id: actId,
    p_now: now,
  });

  if (!rpcErr) {
    return readStateFromSupabase();
  }

  // 3. Coordinated Fallback with Atomic Rollback Protection
  const { error: expErr } = await supabase.from('expenses').insert({
    id: expenseData.id,
    amount: expenseData.amount,
    purpose: expenseData.purpose,
    category: expenseData.category,
    paid_by: expenseData.paidBy,
    recorded_by: expenseData.recordedBy,
    expense_date: expenseData.date || now,
    split_with: expenseData.splitWith || null,
    notes: expenseData.notes || null,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    version: 1,
  });

  if (expErr) {
    throw new DatabaseOperationError(`Failed to insert expense into Supabase: ${expErr.message}`);
  }

  const { error: actErr } = await supabase.from('activities').insert({
    id: actId,
    action: 'expense_created',
    actor,
    target_id: expenseData.id,
    target_title: expenseData.purpose,
    category: expenseData.category,
    amount: expenseData.amount,
    details: {
      description: `Added ${expenseData.purpose} (₹${expenseData.amount.toLocaleString('en-IN')}) paid by ${expenseData.paidBy}`,
      splitWith: expenseData.splitWith || 'Equal split (6 members)',
    },
    created_at: now,
  });

  if (actErr) {
    // Coordinated rollback: remove expense if audit log insertion fails
    await supabase.from('expenses').delete().eq('id', expenseData.id);
    throw new DatabaseOperationError(`Failed to save audit record, expense rollback triggered: ${actErr.message}`);
  }

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Edits an existing expense in Supabase PostgreSQL with optimistic concurrency check.
 */
export async function editExpenseInSupabase(
  expenseId: string,
  updates: {
    amount?: number;
    purpose?: string;
    category?: ExpenseCategory;
    paidBy?: string;
    date?: string;
    splitWith?: string;
    notes?: string;
  },
  actor: string,
  expectedVersion?: number
): Promise<{ state: TripState; conflict: boolean }> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // 1. Fetch current record
  const { data: existing, error: fetchErr } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (fetchErr || !existing) {
    throw new DatabaseOperationError(`Expense ${expenseId} not found`);
  }

  // Concurrency check
  if (expectedVersion !== undefined && existing.version !== expectedVersion) {
    const currentState = await readStateFromSupabase();
    return { state: currentState, conflict: true };
  }

  const newAmount = updates.amount !== undefined ? updates.amount : Number(existing.amount);
  const newPurpose = updates.purpose !== undefined ? updates.purpose : existing.purpose;
  const newCategory = updates.category !== undefined ? updates.category : existing.category;
  const newPaidBy = updates.paidBy !== undefined ? updates.paidBy : existing.paid_by;

  // 2. Direct PostgreSQL Transaction if available
  const pool = getPostgresPool();
  if (pool) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `UPDATE expenses
         SET amount = $1, purpose = $2, category = $3, paid_by = $4, expense_date = $5,
             split_with = $6, notes = $7, version = version + 1, updated_at = $8
         WHERE id = $9`,
        [
          newAmount,
          newPurpose,
          newCategory,
          newPaidBy,
          updates.date || existing.expense_date,
          updates.splitWith !== undefined ? updates.splitWith : existing.split_with,
          updates.notes !== undefined ? updates.notes : existing.notes,
          now,
          expenseId,
        ]
      );

      await client.query(
        `INSERT INTO activities (id, action, actor, target_id, target_title, category, amount, details, created_at)
         VALUES ($1, 'expense_updated', $2, $3, $4, $5, $6, $7, $8)`,
        [
          actId,
          actor,
          expenseId,
          newPurpose,
          newCategory,
          newAmount,
          JSON.stringify({
            oldValue: `₹${Number(existing.amount).toLocaleString('en-IN')}`,
            newValue: `₹${newAmount.toLocaleString('en-IN')}`,
            description: `Edited ${newPurpose} (₹${newAmount.toLocaleString('en-IN')})`,
          }),
          now,
        ]
      );

      await client.query(`UPDATE trip_config SET version = version + 1, updated_at = $1 WHERE id = 'default'`, [now]);
      await client.query('COMMIT');

      const newState = await readStateFromSupabase();
      return { state: newState, conflict: false };
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      console.warn('Postgres pool editExpense failed, trying Supabase client:', err);
    } finally {
      if (client) client.release();
    }
  }

  // 3. Fallback via Supabase Client
  const { error: updateErr } = await supabase
    .from('expenses')
    .update({
      amount: newAmount,
      purpose: newPurpose,
      category: newCategory,
      paid_by: newPaidBy,
      expense_date: updates.date || existing.expense_date,
      split_with: updates.splitWith !== undefined ? updates.splitWith : existing.split_with,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      version: existing.version + 1,
      updated_at: now,
    })
    .eq('id', expenseId);

  if (updateErr) {
    throw new DatabaseOperationError(`Failed to update expense in Supabase: ${updateErr.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'expense_updated',
    actor,
    target_id: expenseId,
    target_title: newPurpose,
    category: newCategory,
    amount: newAmount,
    details: {
      oldValue: `₹${Number(existing.amount).toLocaleString('en-IN')}`,
      newValue: `₹${newAmount.toLocaleString('en-IN')}`,
      description: `Edited ${newPurpose} (₹${newAmount.toLocaleString('en-IN')})`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  const newState = await readStateFromSupabase();
  return { state: newState, conflict: false };
}

/**
 * Soft-deletes an expense in Supabase PostgreSQL (preserving immutable audit trail).
 */
export async function deleteExpenseInSupabase(
  expenseId: string,
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // 1. Fetch current record
  const { data: existing } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (!existing) {
    throw new DatabaseOperationError(`Expense ${expenseId} not found`);
  }

  // 2. Direct PostgreSQL Transaction if available
  const pool = getPostgresPool();
  if (pool) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      await client.query(
        `UPDATE expenses SET is_deleted = TRUE, deleted_at = $1, updated_at = $1 WHERE id = $2`,
        [now, expenseId]
      );

      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO activities (id, action, actor, target_id, target_title, category, amount, details, created_at)
         VALUES ($1, 'expense_deleted', $2, $3, $4, $5, $6, $7, $8)`,
        [
          actId,
          actor,
          expenseId,
          existing.purpose,
          existing.category,
          Number(existing.amount),
          JSON.stringify({
            oldValue: `₹${Number(existing.amount).toLocaleString('en-IN')}`,
            description: `Deleted ${existing.purpose} (₹${Number(existing.amount).toLocaleString('en-IN')}) originally paid by ${existing.paid_by}`,
          }),
          now,
        ]
      );

      await client.query(`UPDATE trip_config SET version = version + 1, updated_at = $1 WHERE id = 'default'`, [now]);
      await client.query('COMMIT');
      return readStateFromSupabase();
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      console.warn('Postgres pool deleteExpense failed, trying Supabase client:', err);
    } finally {
      if (client) client.release();
    }
  }

  // 3. Fallback via Supabase Client
  const { error: delErr } = await supabase
    .from('expenses')
    .update({
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
    })
    .eq('id', expenseId);

  if (delErr) {
    throw new DatabaseOperationError(`Failed to delete expense in Supabase: ${delErr.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'expense_deleted',
    actor,
    target_id: expenseId,
    target_title: existing.purpose,
    category: existing.category,
    amount: Number(existing.amount),
    details: {
      oldValue: `₹${Number(existing.amount).toLocaleString('en-IN')}`,
      description: `Deleted ${existing.purpose} (₹${Number(existing.amount).toLocaleString('en-IN')}) originally paid by ${existing.paid_by}`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Updates shared budget in Supabase PostgreSQL.
 */
export async function updateBudgetInSupabase(
  newTotal: number,
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from('trip_config')
    .select('*')
    .eq('id', 'default')
    .single();

  const wasConfigured = current?.budget_is_configured ?? false;
  const oldTotal = current?.budget_total != null ? Number(current.budget_total) : 0;

  const { error } = await supabase
    .from('trip_config')
    .update({
      budget_total: newTotal,
      budget_is_configured: true,
      budget_last_updated_by: actor,
      budget_last_updated_at: now,
      version: (current?.version || 1) + 1,
      updated_at: now,
    })
    .eq('id', 'default');

  if (error) {
    throw new DatabaseOperationError(`Failed to update budget in Supabase: ${error.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: wasConfigured ? 'budget_updated' : 'budget_configured',
    actor,
    target_id: 'budget',
    target_title: `Trip Budget ₹${newTotal.toLocaleString('en-IN')}`,
    amount: newTotal,
    details: {
      oldValue: wasConfigured ? `₹${oldTotal.toLocaleString('en-IN')}` : 'Not set',
      newValue: `₹${newTotal.toLocaleString('en-IN')}`,
      description: wasConfigured
        ? `Changed budget to ₹${newTotal.toLocaleString('en-IN')}`
        : `Configured initial budget to ₹${newTotal.toLocaleString('en-IN')}`,
    },
    created_at: now,
  });

  return readStateFromSupabase();
}

/**
 * Saves a document's metadata to `documents` and binary bytes to `document_contents` (BYTEA).
 * Completely eliminates any dependency on Vercel Blob!
 */
export async function saveDocumentToDatabase(
  doc: {
    id: string;
    title: string;
    fileName: string;
    category: DocumentCategory;
    fileSize: number;
    mimeType?: string;
    uploadedBy: string;
  },
  buffer: Buffer,
  actor: string
): Promise<TripState> {
  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    throw new DatabaseOperationError('PDF file exceeds maximum allowed size of 10 MB');
  }

  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-') && !doc.fileName.toLowerCase().endsWith('.pdf')) {
    throw new DatabaseOperationError('Invalid file format: must be a valid PDF document');
  }

  const now = new Date().toISOString();
  const fileUrl = `/api/documents/file?id=${encodeURIComponent(doc.id)}`;

  // 1. Direct PostgreSQL Connection (native binary Buffer support)
  const pool = getPostgresPool();
  if (pool) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO documents (id, title, file_name, category, file_url, mime_type, file_size, uploaded_by, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           file_name = EXCLUDED.file_name,
           category = EXCLUDED.category,
           file_url = EXCLUDED.file_url,
           file_size = EXCLUDED.file_size,
           updated_at = EXCLUDED.updated_at`,
        [doc.id, doc.title, doc.fileName, doc.category, fileUrl, doc.mimeType || 'application/pdf', doc.fileSize, doc.uploadedBy, now]
      );

      await client.query(
        `INSERT INTO document_contents (id, pdf_data, file_size, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (id) DO UPDATE SET
           pdf_data = EXCLUDED.pdf_data,
           file_size = EXCLUDED.file_size,
           updated_at = EXCLUDED.updated_at`,
        [doc.id, buffer, doc.fileSize, now]
      );

      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO activities (id, action, actor, target_id, target_title, category, details, created_at)
         VALUES ($1, 'document_uploaded', $2, $3, $4, $5, $6, $7)`,
        [
          actId,
          actor,
          doc.id,
          doc.title,
          doc.category,
          JSON.stringify({
            description: `Uploaded document "${doc.title}" (${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB)`,
          }),
          now,
        ]
      );

      await client.query(`UPDATE trip_config SET version = version + 1, updated_at = $1 WHERE id = 'default'`, [now]);
      await client.query('COMMIT');
      return readStateFromSupabase();
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      console.warn('Postgres pool saveDocument failed, falling back to Supabase REST:', err);
    } finally {
      if (client) client.release();
    }
  }

  // 2. Supabase REST Client
  const supabase = getSupabaseServerClient();

  const { error: metaErr } = await supabase.from('documents').upsert({
    id: doc.id,
    title: doc.title,
    file_name: doc.fileName,
    category: doc.category,
    file_url: fileUrl,
    mime_type: doc.mimeType || 'application/pdf',
    file_size: doc.fileSize,
    uploaded_by: doc.uploadedBy,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  });

  if (metaErr) {
    throw new DatabaseOperationError(`Failed to save document metadata in Supabase: ${metaErr.message}`);
  }

  const hexData = '\\x' + buffer.toString('hex');
  const { error: contentErr } = await supabase.from('document_contents').upsert({
    id: doc.id,
    pdf_data: hexData,
    file_size: doc.fileSize,
    created_at: now,
    updated_at: now,
  });

  if (contentErr) {
    throw new DatabaseOperationError(`Failed to save document binary in Supabase: ${contentErr.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'document_uploaded',
    actor,
    target_id: doc.id,
    target_title: doc.title,
    category: doc.category,
    details: {
      description: `Uploaded document "${doc.title}" (${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB)`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Retrieves the binary buffer and metadata of a PDF stored in PostgreSQL BYTEA.
 * Completely independent of Vercel Blob!
 */
export async function getDocumentFromDatabase(docId: string): Promise<{
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
} | null> {
  // 1. Direct PostgreSQL Connection
  const pool = getPostgresPool();
  if (pool) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      const res = await client.query(
        `SELECT d.id, d.title, d.file_name, d.mime_type, d.file_size, c.pdf_data
         FROM documents d
         JOIN document_contents c ON d.id = c.id
         WHERE d.id = $1 AND d.is_deleted = FALSE`,
        [docId]
      );
      if (res.rows.length > 0 && res.rows[0].pdf_data) {
        const row = res.rows[0];
        let buf = row.pdf_data;
        if (typeof buf === 'string' && buf.startsWith('\\x')) {
          buf = Buffer.from(buf.slice(2), 'hex');
        } else if (!Buffer.isBuffer(buf)) {
          buf = Buffer.from(buf);
        }
        return {
          id: row.id,
          title: row.title,
          fileName: row.file_name,
          mimeType: row.mime_type || 'application/pdf',
          fileSize: Number(row.file_size),
          buffer: buf,
        };
      }
    } catch (e) {
      console.warn('Postgres pool getDocument failed, trying Supabase REST:', e);
    } finally {
      if (client) client.release();
    }
  }

  // 2. Supabase REST Client
  try {
    const supabase = getSupabaseServerClient();
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (doc) {
      const { data: content } = await supabase
        .from('document_contents')
        .select('pdf_data')
        .eq('id', docId)
        .maybeSingle();

      if (content?.pdf_data) {
        let buf: Buffer;
        if (typeof content.pdf_data === 'string' && content.pdf_data.startsWith('\\x')) {
          buf = Buffer.from(content.pdf_data.slice(2), 'hex');
        } else if (Buffer.isBuffer(content.pdf_data)) {
          buf = content.pdf_data;
        } else {
          buf = Buffer.from(content.pdf_data, 'base64');
        }

        return {
          id: doc.id,
          title: doc.title,
          fileName: doc.file_name,
          mimeType: doc.mime_type || 'application/pdf',
          fileSize: Number(doc.file_size),
          buffer: buf,
        };
      }
    }
  } catch (err) {
    console.warn('Supabase REST getDocument failed:', err);
  }

  // 3. Fallback to local disk storage if document exists locally
  const local = await getLocalBlobFile(docId);
  if (local) {
    return {
      id: docId,
      title: local.fileName.replace(/\.pdf$/i, ''),
      fileName: local.fileName,
      mimeType: 'application/pdf',
      fileSize: local.buffer.length,
      buffer: local.buffer,
    };
  }

  return null;
}

/**
 * Updates document metadata (e.g. title, category) in Supabase PostgreSQL.
 */
export async function updateDocumentInSupabase(
  docId: string,
  updates: { title?: string; category?: DocumentCategory },
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: existing, error: fetchErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (fetchErr || !existing) {
    throw new DatabaseOperationError(`Document ${docId} not found`);
  }

  const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
  const newCategory = updates.category || existing.category;

  const { error: updateErr } = await supabase
    .from('documents')
    .update({
      title: newTitle,
      category: newCategory,
      updated_at: now,
    })
    .eq('id', docId);

  if (updateErr) {
    throw new DatabaseOperationError(`Failed to update document metadata: ${updateErr.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'document_updated',
    actor,
    target_id: docId,
    target_title: newTitle,
    category: newCategory,
    details: {
      description: `Updated document metadata for "${newTitle}"`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Soft-deletes a document in Supabase PostgreSQL (preserving immutable audit trail).
 */
export async function deleteDocumentMetadataInSupabase(
  docId: string,
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase.from('documents').select('*').eq('id', docId).single();
  if (!existing) {
    throw new DatabaseOperationError(`Document ${docId} not found`);
  }

  const { error } = await supabase
    .from('documents')
    .update({ is_deleted: true, updated_at: now })
    .eq('id', docId);

  if (error) {
    throw new DatabaseOperationError(`Failed to delete document in Supabase: ${error.message}`);
  }

  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'document_deleted',
    actor,
    target_id: docId,
    target_title: existing.title,
    details: {
      description: `Deleted document "${existing.title}"`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Updates group members roster in Supabase PostgreSQL.
 */
export async function updateMembersInSupabase(
  members: string[],
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('trip_config')
    .update({
      members,
      updated_at: now,
    })
    .eq('id', 'default');

  if (error) {
    throw new DatabaseOperationError(`Failed to update members in Supabase: ${error.message}`);
  }

  await bumpConfigVersion();
  return readStateFromSupabase();
}

/**
 * Organizer privilege: Clear all data in Supabase PostgreSQL.
 */
export async function clearAllDataInSupabase(
  options: { resetBudget?: boolean; clearActivities?: boolean; wipeEverything?: boolean } = {},
  actor: string
): Promise<TripState> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // Soft-delete all expenses
  await supabase.from('expenses').update({ is_deleted: true, deleted_at: now, updated_at: now }).eq('is_deleted', false);

  // Soft-delete all documents
  await supabase.from('documents').update({ is_deleted: true, updated_at: now }).eq('is_deleted', false);

  if (options.resetBudget) {
    await supabase.from('trip_config').update({
      budget_total: 0,
      budget_is_configured: false,
      budget_last_updated_by: actor,
      budget_last_updated_at: now,
    }).eq('id', 'default');
  }

  if (options.wipeEverything && options.clearActivities) {
    await supabase.from('activities').delete().neq('id', 'permanent_root');
  }

  // Record permanent audit record of wipe
  const actId = `act_${Date.now()}_clear_all`;
  await supabase.from('activities').insert({
    id: actId,
    action: 'data_cleared',
    actor,
    target_id: 'trip_data',
    target_title: 'All Trip Expenses & Documents Cleared',
    details: {
      description: `Cleared all expenses and documents${options.resetBudget ? ' (Budget reset to ₹0)' : ''}`,
    },
    created_at: now,
  });

  await bumpConfigVersion();
  return readStateFromSupabase();
}
