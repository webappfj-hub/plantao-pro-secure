-- The previous fix (20260913134638_matricula_rls_ownership_fix.sql) compared
-- the FULL formatted agents.matricula (e.g. "910.809.09") against
-- split_part(auth.email(), '@', 1) — but login only ever sends the first 6
-- raw digits of the matrícula as the email local-part (see
-- lookup_agent_for_login in 20260909000000_matricula_login_and_fixes.sql:
-- `left(regexp_replace(matricula, '\D','','g'), 6) = _cpf`). An 8-digit
-- formatted string can never equal a 6-digit raw prefix, so every one of
-- those 22 "own row" policies still silently matched zero rows for every
-- agent — Postgres/RLS returns success with 0 rows affected, not an error,
-- so edits/deletes on overtime_bank, chat, swaps, etc. appeared to "just not
-- save" with no visible error. Recreate them using the same digit-prefix
-- comparison the login lookup itself uses.

-- activity_logs
DROP POLICY IF EXISTS "Agents view own activity, admins view all" ON public.activity_logs;
CREATE POLICY "Agents view own activity, admins view all" ON public.activity_logs FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = activity_logs.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- bh_monthly_cycles
DROP POLICY IF EXISTS "Agents view own bh cycles" ON public.bh_monthly_cycles;
CREATE POLICY "Agents view own bh cycles" ON public.bh_monthly_cycles FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents delete own bh cycles" ON public.bh_monthly_cycles;
CREATE POLICY "Agents delete own bh cycles" ON public.bh_monthly_cycles FOR DELETE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- chat_messages
DROP POLICY IF EXISTS "Room members can insert messages" ON public.chat_messages;
CREATE POLICY "Room members can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Room members can view messages" ON public.chat_messages;
CREATE POLICY "Room members can view messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_room_members crm JOIN agents a ON a.id = crm.agent_id
    WHERE crm.room_id = chat_messages.room_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1)
  ) OR is_admin_or_master(auth.uid())
);
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- deleted_messages
DROP POLICY IF EXISTS "Agents can view own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can view own deleted marks" ON public.deleted_messages FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can insert own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can insert own deleted marks" ON public.deleted_messages FOR INSERT WITH CHECK (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can delete own deleted marks" ON public.deleted_messages;
CREATE POLICY "Agents can delete own deleted marks" ON public.deleted_messages FOR DELETE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- notifications
DROP POLICY IF EXISTS "Agents view own notifications" ON public.notifications;
CREATE POLICY "Agents view own notifications" ON public.notifications FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents update own notifications" ON public.notifications;
CREATE POLICY "Agents update own notifications" ON public.notifications FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- overtime_bank (esta é a que corrige o BH não editando/salvando)
DROP POLICY IF EXISTS "Agents can insert their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can insert their own overtime" ON public.overtime_bank FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can update their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can update their own overtime" ON public.overtime_bank FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents can delete their own overtime" ON public.overtime_bank;
CREATE POLICY "Agents can delete their own overtime" ON public.overtime_bank FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- password_change_requests
DROP POLICY IF EXISTS "Agents view own password requests" ON public.password_change_requests;
CREATE POLICY "Agents view own password requests" ON public.password_change_requests FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Agents create own password requests" ON public.password_change_requests;
CREATE POLICY "Agents create own password requests" ON public.password_change_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- payments
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = payments.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
  OR is_admin_or_master(auth.uid())
);

-- saved_credentials
DROP POLICY IF EXISTS "Agents manage own saved credentials" ON public.saved_credentials;
CREATE POLICY "Agents manage own saved credentials" ON public.saved_credentials FOR ALL USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = saved_credentials.agent_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);

-- shift_swaps
DROP POLICY IF EXISTS "Involved agents view swap requests" ON public.shift_swaps;
CREATE POLICY "Involved agents view swap requests" ON public.shift_swaps FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);
DROP POLICY IF EXISTS "Requester creates swap request" ON public.shift_swaps;
CREATE POLICY "Requester creates swap request" ON public.shift_swaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = shift_swaps.requester_id AND left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1))
);
DROP POLICY IF EXISTS "Involved agents or admin update swap" ON public.shift_swaps;
CREATE POLICY "Involved agents or admin update swap" ON public.shift_swaps FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);
