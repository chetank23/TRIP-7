-- BVC Trip daily web-push notifications
-- Stores device push subscriptions privately; only server-side service_role may access them.
-- A single run record per India-local date prevents duplicate daily roasts on cron retries.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  member TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled
  ON public.push_subscriptions (enabled, member);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.push_notification_runs (
  run_date DATE PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_error TEXT
);

ALTER TABLE public.push_notification_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_notification_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.push_notification_runs TO service_role;
