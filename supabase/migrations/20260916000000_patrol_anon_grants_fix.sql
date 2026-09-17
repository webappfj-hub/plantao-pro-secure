-- Corrige a criação de rondas avulsas (visitante sem login): as migrations
-- 20260909000000/20260909000001 já haviam criado as RLS POLICY "TO anon"
-- para leitura/escrita em patrol_shifts, patrol_slots, patrol_agents,
-- patrol_sectors e patrol_incidents — mas uma RLS POLICY só entra em vigor
-- se o role já tiver o GRANT de tabela correspondente. A criação original
-- destas tabelas (20260908000004) só concedeu GRANT para "authenticated" e
-- "service_role", nunca para "anon". Resultado: todo INSERT/UPDATE feito por
-- um visitante sem login falhava com "permission denied for table ...",
-- silenciosamente engolido pelos try/catch do formulário — a ronda avulsa
-- nunca chegava a ser criada de fato, embora a tela parecesse funcionar.
GRANT SELECT, INSERT, UPDATE ON public.patrol_shifts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.patrol_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_agents TO anon;
GRANT SELECT ON public.patrol_sectors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.patrol_incidents TO anon;
GRANT INSERT ON public.patrol_events TO anon;

-- A etapa de "Programar turno" também atribui a equipe inteira automatica-
-- mente (listUnitTeamAgents/assignAgentsToShift), o que exige ler nome e
-- vínculo (unit_id/team) da tabela agents. Sem nenhuma policy de leitura
-- para anon, essa consulta falhava (silenciosa, mesmo try/catch) e o turno
-- nascia sem ninguém escalado. Concede só as colunas não sensíveis — nunca
-- cpf, telefone, endereço, etc. — para não expor dado pessoal a visitante.
GRANT SELECT (id, name, team, unit_id) ON public.agents TO anon;
CREATE POLICY "Anon can view basic active agent roster" ON public.agents
  FOR SELECT TO anon USING (is_active = true);
