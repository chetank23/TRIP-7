-- ==============================================================================
-- BVC Trip — Persistent Shared Budget Sources
-- Existing budget totals are retained; source details start as an empty array.
-- Updating source rows automatically recalculates the authoritative budget_total.
-- ==============================================================================

ALTER TABLE public.trip_config
  ADD COLUMN IF NOT EXISTS budget_sources JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.sync_trip_budget_total_from_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  source_item JSONB;
  calculated_total NUMERIC(12, 2) := 0;
  source_amount NUMERIC;
  source_quantity NUMERIC;
BEGIN
  IF NEW.budget_sources IS NULL OR jsonb_typeof(NEW.budget_sources) <> 'array' THEN
    RAISE EXCEPTION 'budget_sources must be a JSON array';
  END IF;

  IF jsonb_array_length(NEW.budget_sources) > 30 THEN
    RAISE EXCEPTION 'A maximum of 30 budget sources is allowed';
  END IF;

  FOR source_item IN
    SELECT value FROM jsonb_array_elements(NEW.budget_sources) AS source_rows(value)
  LOOP
    IF jsonb_typeof(source_item) <> 'object'
      OR COALESCE(NULLIF(BTRIM(source_item->>'name'), ''), '') = ''
      OR source_item->>'unitAmount' IS NULL
      OR source_item->>'quantity' IS NULL THEN
      RAISE EXCEPTION 'Each budget source requires a name, unitAmount and quantity';
    END IF;

    source_amount := (source_item->>'unitAmount')::NUMERIC;
    source_quantity := (source_item->>'quantity')::NUMERIC;

    IF source_amount <= 0 OR source_quantity < 1 OR source_quantity <> TRUNC(source_quantity) THEN
      RAISE EXCEPTION 'Budget source amounts must be positive and quantities must be positive whole numbers';
    END IF;

    calculated_total := calculated_total + (source_amount * source_quantity);
  END LOOP;

  NEW.budget_total := ROUND(calculated_total, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trip_budget_total_from_sources ON public.trip_config;

CREATE TRIGGER trg_sync_trip_budget_total_from_sources
BEFORE UPDATE OF budget_sources ON public.trip_config
FOR EACH ROW
EXECUTE FUNCTION public.sync_trip_budget_total_from_sources();
