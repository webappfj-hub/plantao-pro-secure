-- Tracks a fix that was already applied directly to the live database
-- (outside the normal migration flow) on 2026-09-13. Recorded here so the
-- migration history and a fresh database build match what's actually live.
--
-- Root cause: 22 "manage my own row" RLS policies across 10 tables
-- compared agents.cpf against the authenticated session's email
-- local-part, but login switched from CPF-based to matrícula-based auth
-- (auth.users.email is "<matricula>@agent.plantaopro.com") and
-- agents.cpf is NULL for every agent. Every one of these policies was
-- silently failing: agents could not log/edit/delete their own overtime,
-- send/edit/delete chat messages, mark notifications read, request a
-- swap, save login credentials, request a password reset, or view their
-- own activity log or BH monthly cycles. Fixed by pointing all of them at
-- agents.matricula instead — same ownership semantics, matching the
-- column auth actually uses now.

-- activity_logs
DROP POLICY IF EXISTS "Agents view own activity, admins view all" ON public.activity_logs;
CREATE POLICY "Agents view own activity, admins view all" ON public.activity_logs FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = activity_logs.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- bh_monthly_cycles
DROP POLICY IF EXISTS "Agents view own bh cycles" ON public.bh_monthly_cycles;
CREATE POLICY "Agents view own bh cycles" ON public.bh_monthly_cycles FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents delete own bh cycles" ON public.bh_monthly_cycles;
CREATE POLICY "Agents delete own bh cycles" ON public.bh_monthly_cycles FOR DELETE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- chat_messages
DROP POLICY IF EXISTS "Room members can insert messages" ON public.chat_messages;
CREATE POLICY "Room members can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Room members can view messages" ON public.chat_messages;
CREATE POLICY "Room members can view messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_room_members crm JOIN agents a ON a.id = crm.agent_id
    WHERE crm.room_id = chat_messages.room_id AND a.matricula = split_part(auth.email(), '@', 1)
  ) OR is_admin_or_master(auth.uid())
);
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- deleted_messages
DROP POLICY IF EXISTS "Agents can view own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can view own deleted marks" ON public.deleted_messages FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can insert own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can insert own deleted marks" ON public.deleted_messages FOR INSERT WITH CHECK (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can delete own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can delete own deleted marks" ON public.deleted_messages FOR DELETE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- notifications
DROP POLICY IF EXISTS "Agents view own notifications" ON public.notifications;
CREATE POLICY "Agents view own notifications" ON public.notifications FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents update own notifications" ON public.notifications;
CREATE POLICY "Agents update own notifications" ON public.notifications FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- overtime_bank
DROP POLICY IF EXISTS "Agents can insert their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can insert their own overtime" ON public.overtime_bank FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can update their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can update their own overtime" ON public.overtime_bank FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can delete their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can delete their own overtime" ON public.overtime_bank FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- password_change_requests
DROP POLICY IF EXISTS "Agents view own password requests" ON public.password_change_requests;
CREATE POLICY "Agents view own password requests" ON public.password_change_requests FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents create own password requests" ON public.password_change_requests;
CREATE POLICY "Agents create own password requests" ON public.password_change_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- payments
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = payments.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
  OR is_admin_or_master(auth.uid())
);

-- saved_credentials
DROP POLICY IF EXISTS "Agents manage own saved credentials" ON public.saved_credentials;
CREATE POLICY "Agents manage own saved credentials" ON public.saved_credentials FOR ALL USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = saved_credentials.agent_id AND a.matricula = split_part(auth.email(), '@', 1))
);

-- shift_swaps
DROP POLICY IF EXISTS "Involved agents view swap requests" ON public.shift_swaps;
CREATE POLICY "Involved agents view swap requests" ON public.shift_swaps FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.matricula = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);
DROP POLICY IF EXISTS "Requester creates swap request" ON public.shift_swaps;
CREATE POLICY "Requester creates swap request" ON public.shift_swaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = shift_swaps.requester_id AND a.matricula = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Involved agents or admin update swap" ON public.shift_swaps;
CREATE POLICY "Involved agents or admin update swap" ON public.shift_swaps FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.matricula = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);
