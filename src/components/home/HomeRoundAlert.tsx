import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import * as api from '@/features/rondas/api';
import { quickRoundStatus, readQuickSession } from '@/features/rondas/quickSession';

const DEFAULT_GUEST_UNIT = 'dd77c458-92fb-49e2-819d-7a32288cc390';
const ls = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const hm = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

interface View {
  tone: 'live' | 'scheduled';
  label: string;
  agent: string;
  window: string;
  timer: string;
  extra?: string;
}

/**
 * Aviso discreto na home quando há ronda programada ou em andamento na equipe
 * de plantão — agente atual, horário e tempo dele, sincronizado com o Gestor
 * de Rondas (mesmos dados: turno estruturado no banco ou rodízio do Modo
 * Rápido salvo neste aparelho). Troca sozinho quando muda o agente. Some
 * quando não há nada programado.
 */
export function HomeRoundAlert({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const now = useServerTime(1000).getTime();
  const team = getDutyTeam(new Date(now)).team;
  const unitId = agent?.unit_id ?? ls('plantaopro_guest_unit_v1') ?? DEFAULT_GUEST_UNIT;
  const guestDeviceId = user ? null : ls('plantaopro_guest_device_id_v1');

  const shiftQ = useQuery({
    queryKey: ['patrol-shift', unitId, team, guestDeviceId],
    queryFn: () => api.getActiveShift(unitId, team, guestDeviceId),
    refetchInterval: 30_000,
    enabled: !!unitId && (!!user || !!guestDeviceId),
  });
  const shiftId = shiftQ.data?.id;
  const slotsQ = useQuery({
    queryKey: ['patrol-slots', shiftId],
    queryFn: () => api.listShiftSlots(shiftId!),
    refetchInterval: 15_000,
    enabled: !!shiftId,
  });

  let view: View | null = null;
  const slots = slotsQ.data ?? [];
  const active = slots.find((s) => s.status === 'active');
  const quick = quickRoundStatus(readQuickSession(unitId, team), now);

  if (active) {
    const end = new Date(active.scheduled_end).getTime();
    view = {
      tone: 'live', label: 'Em ronda',
      agent: active.agent?.name ?? 'Agente',
      window: `${hm(new Date(active.scheduled_start).getTime())}–${hm(end)}`,
      timer: end > now ? `restam ${clock(end - now)}` : `+${clock(now - end)}`,
      extra: active.sector?.name ?? undefined,
    };
  } else if (quick?.kind === 'running') {
    view = {
      tone: 'live', label: 'Em ronda',
      agent: quick.agent,
      window: `${hm(quick.sliceStart)}–${hm(quick.sliceEnd)}`,
      timer: `restam ${clock(quick.msLeft)}`,
      extra: `${quick.index + 1}/${quick.count}${quick.next ? ` · próximo ${quick.next}` : ''}`,
    };
  } else if (quick?.kind === 'waiting') {
    view = {
      tone: 'scheduled', label: 'Ronda programada',
      agent: quick.first,
      window: `início ${hm(quick.startsAt)}`,
      timer: `em ${clock(quick.msToStart)}`,
      extra: `${quick.count} agente${quick.count !== 1 ? 's' : ''}`,
    };
  } else {
    const next = slots.find((s) => s.status === 'pending' && new Date(s.scheduled_start).getTime() > now);
    if (next) {
      const start = new Date(next.scheduled_start).getTime();
      view = {
        tone: 'scheduled', label: 'Próxima ronda',
        agent: next.agent?.name ?? 'A definir',
        window: `${hm(start)}–${hm(new Date(next.scheduled_end).getTime())}`,
        timer: `em ${clock(start - now)}`,
        extra: next.sector?.name ?? undefined,
      };
    }
  }

  if (!view) return null;
  const live = view.tone === 'live';

  return (
    <button
      type="button"
      onClick={() => navigate('/rondas')}
      aria-label={`${view.label}: ${view.agent}, ${view.window}, ${view.timer}. Abrir Gestor de Rondas`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors animate-fade-in',
        live ? 'border-emerald-500/30 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]' : 'border-amber-500/30 bg-amber-500/[0.07] hover:bg-amber-500/[0.12]',
        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping', live ? 'bg-emerald-400' : 'bg-amber-400')} />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-emerald-500' : 'bg-amber-500')} />
      </span>
      <span className={cn('shrink-0 text-[11px] font-bold uppercase tracking-[0.14em]', live ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
        {view.label}
      </span>
      {/* key no agente: a troca de agente aparece com transição e é anunciada */}
      <span key={view.agent} className="min-w-0 truncate font-semibold text-foreground animate-fade-in" aria-live="polite">{view.agent}</span>
      <span className="hidden shrink-0 font-mono tabular-nums text-muted-foreground sm:inline">{view.window}</span>
      <span className="shrink-0 font-mono tabular-nums text-foreground">{view.timer}</span>
      {view.extra && <span className="hidden min-w-0 truncate text-muted-foreground md:inline">· {view.extra}</span>}
      <span className="ml-auto hidden shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground sm:inline-flex">
        Gestor de Rondas <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>
  );
}
