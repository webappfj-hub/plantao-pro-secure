-- Adds columns that src/components/agent-panel/LeaveRequestCard.tsx has always
-- written/read (period, start_time, end_time, hours_count) but that were
-- never part of the agent_leaves table. Every INSERT from the app was failing
-- silently against RLS/schema mismatch, so folgas never actually saved.

ALTER TABLE public.agent_leaves
  ADD COLUMN IF NOT EXISTS period TEXT,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS hours_count NUMERIC;
