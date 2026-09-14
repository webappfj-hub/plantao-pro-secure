-- Enables Postgres logical replication for agent_leaves so the client can
-- subscribe via supabase.channel(...).on('postgres_changes', ...). Without
-- this, a realtime subscription on the table receives no events at all,
-- even though RLS already allows any authenticated agent to read it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_leaves;
