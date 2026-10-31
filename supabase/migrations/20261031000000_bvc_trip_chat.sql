-- BVC Trip group chat
-- Messages are accessed through the server API using the server-only Supabase key.
-- Do not grant anonymous table access: clients receive realtime Broadcast signals only.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  content TEXT NOT NULL
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON public.chat_messages (created_at DESC, id DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Ensure no browser role can read or write message records directly.
REVOKE ALL ON TABLE public.chat_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;
