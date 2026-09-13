import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentProfile } from './useAgentProfile';

export interface RoundsStats {
  active: number;   // rondas em curso do agente logado
  today: number;    // rondas com início previsto hoje para o agente logado
  loading: boolean;
}

/**
 * Consulta contadores reais de rondas do agente logado, a partir do mesmo
 * schema (`patrol_slots`) usado pelo Gestor de Rondas em /rondas — antes
 * este contador lia a tabela legada `round_sessions`, que não tem nenhuma
 * relação com o Gestor de Rondas real, então os números na home nunca
 * batiam com o que o agente via ao abrir o Gestor de Rondas de verdade.
 */
export function useRoundsStats(): RoundsStats {
  const { agent } = useAgentProfile();
  const [state, setState] = useState<RoundsStats>({ active: 0, today: 0, loading: false });

  useEffect(() => {
    if (!agent?.id) {
      setState({ active: 0, today: 0, loading: false });
      return;
    }

    let alive = true;
    let debounce: number | null = null;

    const load = async () => {
      try {
        setState((s) => ({ ...s, loading: true }));

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [{ count: activeCount }, { count: todayCount }] = await Promise.all([
          supabase
            .from('patrol_slots')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .in('status', ['in_progress', 'paused']),
          supabase
            .from('patrol_slots')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .gte('scheduled_start', startOfDay.toISOString())
            .lte('scheduled_start', endOfDay.toISOString()),
        ]);

        if (!alive) return;
        setState({
          active: activeCount ?? 0,
          today: todayCount ?? 0,
          loading: false,
        });
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    };

    const scheduleLoad = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(load, 250);
    };

    load();

    // Realtime: reagir a mudanças nas próprias rondas
    const channel = supabase
      .channel(`patrol-slots-${agent.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patrol_slots', filter: `agent_id=eq.${agent.id}` },
        () => scheduleLoad(),
      )
      .subscribe();

    const onFocus = () => scheduleLoad();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    return () => {
      alive = false;
      if (debounce) window.clearTimeout(debounce);
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [agent?.id]);

  return state;
}
