-- Add an edit timestamp to existing BVC chat messages.
-- Safe to apply more than once; existing messages remain unchanged.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
