ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS president_name TEXT,
  ADD COLUMN IF NOT EXISTS security_coordinator_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS home_card_order JSONB,
  ADD COLUMN IF NOT EXISTS reminder_settings JSONB;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

ALTER TABLE public.agent_shifts
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC DEFAULT 0;

ALTER TABLE public.round_sessions
  ADD COLUMN IF NOT EXISTS auto_started BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_confirmation_to_stop BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stop_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS stop_confirmed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.ad_views
  ADD COLUMN IF NOT EXISTS converted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE TABLE IF NOT EXISTS public.agent_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_presence_user_id_key ON public.agent_presence(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_presence TO authenticated;
GRANT ALL ON public.agent_presence TO service_role;
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view presence" ON public.agent_presence;
CREATE POLICY "Authenticated can view presence"
  ON public.agent_presence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own presence" ON public.agent_presence;
CREATE POLICY "Users manage own presence"
  ON public.agent_presence FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_messages_participants_idx ON public.agent_messages(sender_id, recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.agent_messages;
CREATE POLICY "Participants can view messages"
  ON public.agent_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Senders can create messages" ON public.agent_messages;
CREATE POLICY "Senders can create messages"
  ON public.agent_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can mark as read" ON public.agent_messages;
CREATE POLICY "Recipients can mark as read"
  ON public.agent_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);