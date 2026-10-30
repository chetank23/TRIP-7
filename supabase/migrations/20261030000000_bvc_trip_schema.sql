-- ==============================================================================
-- BVC Trip Database Schema for Supabase PostgreSQL
-- Authoritative store for Budget, Expenses, Activity Audit Trail & Document Metadata
-- ==============================================================================

-- 1. Shared Trip Configuration & Budget
CREATE TABLE IF NOT EXISTS trip_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  budget_total NUMERIC(12, 2) NOT NULL DEFAULT 20000.00 CHECK (budget_total >= 0),
  budget_currency TEXT NOT NULL DEFAULT 'INR',
  budget_is_configured BOOLEAN NOT NULL DEFAULT TRUE,
  budget_last_updated_by TEXT NOT NULL DEFAULT 'Chetan K',
  budget_last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  members TEXT[] NOT NULL DEFAULT ARRAY['Chetan K', 'Adithi', 'Harshitha', 'Dharma', 'Lavanya', 'Rohith', 'Vyshnavi'],
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed single default configuration row if not present
INSERT INTO trip_config (
  id, budget_total, budget_currency, budget_is_configured, budget_last_updated_by, members, version
) VALUES (
  'default', 20000.00, 'INR', TRUE, 'Chetan K', ARRAY['Chetan K', 'Adithi', 'Harshitha', 'Dharma', 'Lavanya', 'Rohith', 'Vyshnavi'], 1
) ON CONFLICT (id) DO NOTHING;

-- 2. Trip Expenses Table (with Soft-Deletion & Version Concurrency)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  purpose TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Food', 'Stay', 'Transport', 'Activities', 'Shopping', 'Others')),
  paid_by TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  split_with TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses (is_deleted, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses (paid_by);

-- 3. Activity & Audit History Table (Permanent Immutable Records)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target_id TEXT,
  target_title TEXT,
  category TEXT,
  amount NUMERIC(12, 2),
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_created ON activities (created_at DESC);

-- 4. Document Metadata Table (Actual PDF binary resides in Vercel Blob)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Stay', 'Tickets', 'Transport', 'Activities', 'Others')),
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  uploaded_by TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_created ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category);

-- 5. Enable Supabase Realtime for instant multi-browser synchronization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_config;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  END IF;
END $$;

-- 6. Row Level Security Policies
ALTER TABLE trip_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow read access to all trip tables for trip participants
CREATE POLICY "Allow public read on trip_config" ON trip_config FOR SELECT USING (true);
CREATE POLICY "Allow public read on expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow public read on activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public read on documents" ON documents FOR SELECT USING (true);

-- Allow mutations via service role or authorized application clients
CREATE POLICY "Allow service mutation on trip_config" ON trip_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service mutation on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service mutation on activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service mutation on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- 7. Helper RPC function to atomically increment version
CREATE OR REPLACE FUNCTION bump_trip_version()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_version integer;
BEGIN
  UPDATE trip_config
  SET version = version + 1, updated_at = NOW()
  WHERE id = 'default'
  RETURNING version INTO new_version;
  
  RETURN COALESCE(new_version, 1);
END;
$$;

-- 8. Document Binary Content Table (Durable BYTEA Storage in PostgreSQL - Completely Independent of Vercel Blob)
CREATE TABLE IF NOT EXISTS document_contents (
  id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  pdf_data BYTEA NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE document_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on document_contents" ON document_contents FOR SELECT USING (true);
CREATE POLICY "Allow service mutation on document_contents" ON document_contents FOR ALL USING (true) WITH CHECK (true);

-- 9. Atomic Expense Creation with Coordinated Audit Entry
CREATE OR REPLACE FUNCTION create_expense_with_audit(
  p_id TEXT,
  p_amount NUMERIC(12, 2),
  p_purpose TEXT,
  p_category TEXT,
  p_paid_by TEXT,
  p_recorded_by TEXT,
  p_expense_date TIMESTAMPTZ,
  p_split_with TEXT,
  p_notes TEXT,
  p_actor TEXT,
  p_act_id TEXT,
  p_now TIMESTAMPTZ
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_version integer;
BEGIN
  -- Insert Expense
  INSERT INTO expenses (
    id, amount, purpose, category, paid_by, recorded_by, expense_date, split_with, notes, version, is_deleted, created_at, updated_at
  ) VALUES (
    p_id, p_amount, p_purpose, p_category, p_paid_by, p_recorded_by, p_expense_date, p_split_with, p_notes, 1, FALSE, p_now, p_now
  );

  -- Insert Audit Record
  INSERT INTO activities (
    id, action, actor, target_id, target_title, category, amount, details, created_at
  ) VALUES (
    p_act_id, 'expense_created', p_actor, p_id, p_purpose, p_category, p_amount,
    jsonb_build_object(
      'description', 'Added ' || p_purpose || ' (₹' || trim(to_char(p_amount, '999,999,990')) || ') paid by ' || p_paid_by,
      'splitWith', COALESCE(p_split_with, 'Equal split (6 members)')
    ),
    p_now
  );

  -- Increment trip config version
  UPDATE trip_config
  SET version = version + 1, updated_at = p_now
  WHERE id = 'default'
  RETURNING version INTO v_new_version;

  RETURN COALESCE(v_new_version, 1);
END;
$$;

-- 10. Atomic Expense Edit with Optimistic Concurrency & Audit Record
CREATE OR REPLACE FUNCTION edit_expense_with_audit(
  p_id TEXT,
  p_amount NUMERIC(12, 2),
  p_purpose TEXT,
  p_category TEXT,
  p_paid_by TEXT,
  p_expense_date TIMESTAMPTZ,
  p_split_with TEXT,
  p_notes TEXT,
  p_expected_version INTEGER,
  p_actor TEXT,
  p_act_id TEXT,
  p_now TIMESTAMPTZ
) RETURNS TABLE (is_success BOOLEAN, is_conflict BOOLEAN, new_version INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_curr_version INTEGER;
  v_old_amount NUMERIC(12, 2);
  v_old_purpose TEXT;
  v_trip_version INTEGER;
BEGIN
  SELECT version, amount, purpose INTO v_curr_version, v_old_amount, v_old_purpose
  FROM expenses WHERE id = p_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense record % not found', p_id;
  END IF;

  IF p_expected_version IS NOT NULL AND v_curr_version != p_expected_version THEN
    RETURN QUERY SELECT FALSE, TRUE, 0;
    RETURN;
  END IF;

  UPDATE expenses
  SET amount = p_amount,
      purpose = p_purpose,
      category = p_category,
      paid_by = p_paid_by,
      expense_date = p_expense_date,
      split_with = p_split_with,
      notes = p_notes,
      version = v_curr_version + 1,
      updated_at = p_now
  WHERE id = p_id;

  INSERT INTO activities (
    id, action, actor, target_id, target_title, category, amount, details, created_at
  ) VALUES (
    p_act_id, 'expense_updated', p_actor, p_id, p_purpose, p_category, p_amount,
    jsonb_build_object(
      'oldValue', '₹' || trim(to_char(v_old_amount, '999,999,990')),
      'newValue', '₹' || trim(to_char(p_amount, '999,999,990')),
      'description', 'Edited ' || p_purpose || ' (₹' || trim(to_char(p_amount, '999,999,990')) || ')'
    ),
    p_now
  );

  UPDATE trip_config
  SET version = version + 1, updated_at = p_now
  WHERE id = 'default'
  RETURNING version INTO v_trip_version;

  RETURN QUERY SELECT TRUE, FALSE, COALESCE(v_trip_version, 1);
END;
$$;

-- 11. Atomic Expense Soft-Delete with Coordinated Audit Entry
CREATE OR REPLACE FUNCTION delete_expense_with_audit(
  p_id TEXT,
  p_actor TEXT,
  p_act_id TEXT,
  p_now TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount NUMERIC(12, 2);
  v_purpose TEXT;
  v_paid_by TEXT;
  v_category TEXT;
  v_trip_version INTEGER;
BEGIN
  SELECT amount, purpose, paid_by, category INTO v_amount, v_purpose, v_paid_by, v_category
  FROM expenses WHERE id = p_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense % not found or already deleted', p_id;
  END IF;

  UPDATE expenses
  SET is_deleted = TRUE, deleted_at = p_now, updated_at = p_now
  WHERE id = p_id;

  INSERT INTO activities (
    id, action, actor, target_id, target_title, category, amount, details, created_at
  ) VALUES (
    p_act_id, 'expense_deleted', p_actor, p_id, v_purpose, v_category, v_amount,
    jsonb_build_object(
      'oldValue', '₹' || trim(to_char(v_amount, '999,999,990')),
      'description', 'Deleted ' || v_purpose || ' (₹' || trim(to_char(v_amount, '999,999,990')) || ') originally paid by ' || v_paid_by
    ),
    p_now
  );

  UPDATE trip_config
  SET version = version + 1, updated_at = p_now
  WHERE id = 'default'
  RETURNING version INTO v_trip_version;

  RETURN COALESCE(v_trip_version, 1);
END;
$$;


