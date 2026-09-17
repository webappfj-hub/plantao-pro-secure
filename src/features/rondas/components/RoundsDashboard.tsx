import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { WifiOff, Clock3, Sun, Moon, Users, Building2, MapPin, UserCheck, SplitSquareHorizontal, ShieldOff, CalendarPlus, CalendarClock, CalendarDays, Hourglass, UserPlus, Search, Loader2, ShieldCheck, RadioTower, Square, ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RoundCompletionCelebration, type RoundCompletionStats } from './RoundCompletionCelebration';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { getServerDate, useServerClockParts, parseAcreDateTimeLocal, formatAcreDateTimeLocal } from '@/hooks/useServerTime';
import { teamPosters, getTeamColors, getTeamEmblem } from '@/lib/teamAssets';
import { useLowMotion } from '@/hooks/useLowMotion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QuickRoundsMode } from './QuickRoundsMode';
import * as api from '../api';
import { useRoundTimer } from '../useRoundTimer';
import { RoundTimer } from './RoundTimer';
import { RoundControls } from './RoundControls';
import { RoundMetrics } from './RoundMetrics';
import { RoundTimeline } from './RoundTimeline';
import { AgentScheduleTimeline, buildAgentWindows } from './AgentScheduleTimeline';
import { ShareScheduleButton } from './ShareScheduleButton';
import { NextRounds } from './NextRounds';
import { RoundAgentList } from './RoundAgentList';
import { IncidentDialog } from './IncidentDialog';
import { ShiftDivider } from './ShiftDivider';
import { RoundHistory } from './RoundHistory';
import { enqueuePatrolAction, flushPatrolQueue, getQueueLength } from '../offlineQueue';
import type { PatrolSlot } from '../types';

/**
 * Radar de operação — varredura realista de PPI (plan position indicator):
 * feixe cônico com rastro que decai, anéis de alcance com marcações de
 * azimute, ecos que acendem no instante em que o feixe passa por eles e
 * anel de retorno expandindo. Tudo em SVG/CSS (zero imagem, GPU); em
 * `lowMotion` o radar continua desenhado, apenas parado.
 */
function RadarSweep({ color, lowMotion }: { color: string; lowMotion: boolean }) {
  // Ecos posicionados em azimutes conhecidos: o atraso da animação é
  // calculado a partir do ângulo, então cada eco acende exatamente quando
  // o feixe cruza sua posição (ciclo de 6s = 360°).
  const echoes = [
    { angle: 38, dist: 0.72 },
    { angle: 145, dist: 0.46 },
    { angle: 252, dist: 0.83 },
  ];
  const cycle = 6;

  return (
    <div className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 opacity-80 sm:-right-4 sm:-top-20 sm:h-96 sm:w-96 xl:right-[5%] xl:h-[28rem] xl:w-[28rem]">
      {/* Feixe cônico com rastro — camada CSS, mais suave que wedge em SVG */}
      <div
        className={cn('absolute inset-[6%] rounded-full', !lowMotion && 'radar-sweep')}
        style={{
          background: `conic-gradient(from 0deg, ${color}00 0deg, ${color}00 250deg, ${color}0f 300deg, ${color}2e 340deg, ${color}7a 356deg, ${color}e6 359.5deg, ${color}00 360deg)`,
          maskImage: 'radial-gradient(circle at center, #000 62%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, #000 62%, transparent 100%)',
        }}
      />
      <svg viewBox="0 0 200 200" className="relative h-full w-full">
        <defs>
          <radialGradient id="radar-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="70%" stopColor={color} stopOpacity="0.05" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="88" fill="url(#radar-core)" />

        {/* Anéis de alcance */}
        {[88, 66, 44, 22].map((r, i) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={i === 0 ? 0.42 : 0.2}
            strokeWidth={i === 0 ? 1.2 : 0.8}
          />
        ))}

        {/* Eixos e diagonais discretas */}
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1="100"
            y1="12"
            x2="100"
            y2="188"
            stroke={color}
            strokeOpacity={a % 90 === 0 ? 0.16 : 0.08}
            strokeWidth="0.8"
            transform={`rotate(${a} 100 100)`}
          />
        ))}

        {/* Marcações de azimute a cada 15° — detalhe de instrumento */}
        {Array.from({ length: 24 }, (_, i) => i * 15).map((a) => {
          const major = a % 45 === 0;
          return (
            <line
              key={a}
              x1="100"
              y1={major ? 78 : 83}
              x2="100"
              y2="88"
              stroke={color}
              strokeOpacity={major ? 0.5 : 0.26}
              strokeWidth={major ? 1.1 : 0.7}
              transform={`rotate(${a} 100 100)`}
              style={{ transformBox: 'view-box' }}
            />
          );
        })}

        {/* Ecos detectados + anel de retorno, sincronizados com o feixe */}
        {echoes.map(({ angle, dist }) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const cx = 100 + Math.cos(rad) * 82 * dist;
          const cy = 100 + Math.sin(rad) * 82 * dist;
          const delay = `-${((360 - angle) / 360) * cycle}s`;
          return (
            <g key={angle}>
              <circle
                cx={cx}
                cy={cy}
                r="3"
                fill="none"
                stroke={color}
                strokeWidth="1"
                className={lowMotion ? undefined : 'radar-echo-ring'}
                style={lowMotion ? { opacity: 0.35 } : { animationDelay: delay }}
              />
              <circle
                cx={cx}
                cy={cy}
                r="2.4"
                fill={color}
                className={lowMotion ? undefined : 'radar-echo'}
                style={lowMotion ? { opacity: 0.5 } : { animationDelay: delay }}
              />
            </g>
          );
        })}

        <circle cx="100" cy="100" r="1.8" fill={color} fillOpacity="0.8" />
      </svg>
    </div>
  );
}

/**
 * Cabeçalho do Gestor de Rondas — visual tático (radar + grade de pontos +
 * linha de varredura), sem nenhuma foto: mais leve (zero download de
 * imagem) e mais alinhado ao tema de segurança/vigilância do que um pôster
 * de equipe. A cor de destaque muda por equipe (mesma fonte usada no resto
 * do app), então a identidade continua ali, só que via luz, não retrato.
 * Quando há turno ativo, a faixa de operação (turno, equipe, unidade,
 * relógio e ações) fica embutida aqui mesmo, economizando uma seção inteira.
 */
function RondasHero({ team, children }: { team?: string | null; children?: ReactNode }) {
  const colors = getTeamColors(team ?? null);
  const { lowMotion } = useLowMotion();
  return (
    <section
      className="rounds-ops-header relative overflow-hidden rounded-xl border"
      style={{ borderColor: `${colors.primary}30` }}
    >
      {/* Grade tática de pontos — mesma textura usada no resto do painel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: `radial-gradient(${colors.primary}33 1px, transparent 1px)`, backgroundSize: '16px 16px' }}
      />
      {/* Linha de varredura vertical — reforça o "modo operação" sem pesar */}
      {!lowMotion && (
        <div
          aria-hidden
          className="scan-line-y pointer-events-none absolute inset-x-0 h-16"
          style={{ background: `linear-gradient(180deg, transparent 0%, ${colors.primary}30 50%, transparent 100%)` }}
        />
      )}
      <RadarSweep color={colors.primary} lowMotion={lowMotion} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.67) 75%, hsl(var(--background)) 100%)' }}
      />

      <div className="relative grid min-h-[184px] items-center gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:justify-self-start">
          <div className="rounds-command-emblem grid h-12 w-12 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10">
            <BrasaoSentinela size={34} title="Gestor de Rondas — PlantãoPro AC" />
          </div>
          <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/25 backdrop-blur-sm"
            style={{ background: `${colors.primary}26`, borderColor: colors.primary, boxShadow: `inset 0 0 0 1px ${colors.primary}55` }}
          >
            <span className="relative flex h-1.5 w-1.5">
              {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: colors.primary }} />}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: colors.primary }} />
            </span>
            {team ? `Equipe ${team} · em operação` : 'Operação em tempo real'}
          </span>
            <h2 className="mt-2 truncate text-xl font-bold uppercase leading-tight text-foreground sm:text-2xl">Central de operação</h2>
            <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">Monitoramento e controle de rondas</p>
          </div>
        </div>

        <OperationalClock color={colors.primary} />

        <div className="hidden items-center gap-3 lg:flex lg:justify-self-end">
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase text-muted-foreground">Estado do sistema</p>
            <p className="mt-1 flex items-center justify-end gap-2 font-mono text-xs font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              OPERANTE
            </p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-md border border-border bg-muted/40">
            <RadioTower className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
      {children && <div className="relative border-t border-border/70 bg-background/45 px-3 py-2.5 backdrop-blur-md sm:px-5">{children}</div>}
    </section>
  );
}

/**
 * Relógio operacional do Gestor de Rondas — versão "chique" do LiveClock
 * genérico, feita pra ocupar de verdade o espaço da faixa de operação em
 * vez de uma pastilha pequena perdida no canto. Mostra a hora com brilho
 * sutil, o rótulo "horário oficial" (deixa claro que é o relógio do
 * servidor/Acre, nunca o do aparelho) e a data, com um indicador de
 * sincronização ao vivo. `useServerClockParts` já é imune ao relógio do
 * dispositivo (Seção 41).
 */
function OperationalClock({ color }: { color: string }) {
  const { hours, minutes, seconds, date } = useServerClockParts();
  const { lowMotion } = useLowMotion();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateLabel = date
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Rio_Branco' })
    .replace('.', '')
    .toUpperCase();

  return (
    <div className="rounds-digital-clock relative mx-auto w-fit min-w-[242px] rounded-lg border px-4 py-3 text-center sm:min-w-[300px] sm:px-6" style={{ borderColor: `${color}50` }}>
      <div className="rounds-clock-glass absolute inset-0 rounded-lg" aria-hidden />
      <div className="relative leading-none">
        <div className="rounds-clock-digits flex items-baseline justify-center gap-1 font-mono text-[2rem] font-bold tabular-nums text-foreground sm:text-[2.65rem]" style={{ textShadow: `0 0 16px ${color}90` }}>
          <span>{pad(hours)}</span>
          <span className={lowMotion ? undefined : 'live-clock-colon'} style={{ color }}>:</span>
          <span>{pad(minutes)}</span>
          <span className="ml-1 text-sm font-semibold opacity-75 sm:text-base" style={{ color }}>{pad(seconds)}</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase" style={{ color }}>
          <span className="relative flex h-1 w-1">
            {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: color }} />}
            <span className="relative inline-flex h-1 w-1 rounded-full" style={{ background: color }} />
          </span>
          Horário oficial · Acre
        </div>
        <div className="mt-2 border-t border-border/60 pt-1.5 text-[9px] font-semibold uppercase text-muted-foreground">{dateLabel} · SINCRONIZADO</div>
      </div>
    </div>
  );
}

/**
 * Identidade do dispositivo do visitante sem login — gerada uma vez e
 * guardada no localStorage (nunca depende de conta/login). É o que garante
 * que a ronda avulsa de um visitante nunca "generaliza": cada aparelho só
 * enxerga e mexe no turno que ele mesmo criou, nunca o de outro visitante
 * nem o turno real de uma equipe autenticada (ver getActiveShift em api.ts).
 */
const GUEST_DEVICE_KEY = 'plantaopro_guest_device_id_v1';
function getGuestDeviceId(): string {
  try {
    let id = localStorage.getItem(GUEST_DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(GUEST_DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

interface RoundsDashboardProps {
  /** Avisa quem hospeda o painel (ex.: o modal da home) se existe um turno
   * ativo — usado para travar o fechamento acidental do Gestor de Rondas
   * enquanto uma ronda está em andamento, mesmo para visitantes sem login. */
  onShiftActiveChange?: (active: boolean) => void;
}

/**
 * Central operacional de rondas. Hierarquia visual (Seção 20/53):
 * ronda atual > timer > próximas > timeline > agentes > ocorrências > KPIs.
 */
export function RoundsDashboard({ onShiftActiveChange }: RoundsDashboardProps = {}) {
  const { lowMotion } = useLowMotion();
  const { agent } = useAgentProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [dividerOpen, setDividerOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [celebrationStats, setCelebrationStats] = useState<RoundCompletionStats | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => getQueueLength());
  // Rodízio do Modo Rápido (ronda avulsa) esperando ou rodando — não gera
  // um `patrol_shift`, então precisa do próprio sinal pra travar o
  // fechamento acidental da janela (mesmo sem login).
  const [quickRoundActive, setQuickRoundActive] = useState(false);

  // Allow manual team/unit selection for unauthenticated users. Persistido
  // no localStorage (por dispositivo, igual ao guest_device_id): sem isso,
  // qualquer remontagem do painel (fechar/reabrir o modal, trocar de aba)
  // esquecia a equipe/unidade escolhida e voltava pro padrão fixo — a ronda
  // real (de outra equipe) continuava ativa no banco, mas sumia da tela,
  // dando a impressão de que "o sistema reiniciou".
  const GUEST_TEAM_KEY = 'plantaopro_guest_team_v1';
  const GUEST_UNIT_KEY = 'plantaopro_guest_unit_v1';
  const [guestTeam, setGuestTeamState] = useState<string | null>(() => {
    try { return localStorage.getItem(GUEST_TEAM_KEY) || 'ALFA'; } catch { return 'ALFA'; }
  });
  const [guestUnitId, setGuestUnitIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(GUEST_UNIT_KEY) || 'dd77c458-92fb-49e2-819d-7a32288cc390'; } catch { return 'dd77c458-92fb-49e2-819d-7a32288cc390'; }
  });
  const setGuestTeam = (v: string | null) => {
    setGuestTeamState(v);
    try { if (v) localStorage.setItem(GUEST_TEAM_KEY, v); } catch { /* ignore */ }
  };
  const setGuestUnitId = (v: string | null) => {
    setGuestUnitIdState(v);
    try { if (v) localStorage.setItem(GUEST_UNIT_KEY, v); } catch { /* ignore */ }
  };

  const flushQueue = async () => {
    const { synced, remaining } = await flushPatrolQueue({
      start: api.startSlot, pause: api.pauseSlot, resume: api.resumeSlot, complete: api.completeSlot,
      extend: (slotId, minutes) => api.extendSlot(slotId, minutes),
    });
    setPendingCount(remaining);
    if (synced > 0) {
      toast.success(`${synced} ação${synced > 1 ? 'ões' : ''} sincronizada${synced > 1 ? 's' : ''}.`);
      queryClient.invalidateQueries({ queryKey: ['patrol-slots'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-metrics'] });
    }
  };

  useEffect(() => {
    const on = () => { setIsOnline(true); void flushQueue(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void flushQueue();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unitId = agent?.unit_id ?? guestUnitId ?? null;
  const team = agent?.team ?? guestTeam ?? null;

  // Só existe para visitante sem login — um agente autenticado nunca usa
  // isolamento por dispositivo, sua ronda é sempre a da equipe (compartilhada).
  const guestDeviceId = useMemo(() => (user ? null : getGuestDeviceId()), [user]);

  const shiftQuery = useQuery({
    queryKey: ['patrol-shift', unitId, team, guestDeviceId],
    queryFn: () => api.getActiveShift(unitId!, team!, guestDeviceId),
    enabled: !!unitId && !!team,
    refetchInterval: 30_000,
    // Mantém o conteúdo da equipe anterior visível enquanto busca a nova
    // — sem isso, trocar de equipe piscava a tela inteira pro esqueleto
    // de carregamento a cada clique, mesmo numa conexão rápida.
    placeholderData: keepPreviousData,
  });
  const shift = shiftQuery.data ?? null;

  // Existe alguma ronda em andamento — turno estruturado OU Modo Rápido.
  const hasActiveRound = !!shift || quickRoundActive;
  // Inclui a EDIÇÃO em andamento (form de criar turno ou dividir/reprogramar
  // aberto) — sem isso, o modal da home fechava livre (clique fora, Esc, X)
  // enquanto ainda não existia turno salvo, descartando tudo o que o
  // visitante estava preenchendo. Dava a impressão de "o sistema reiniciou".
  const isBusyWithRound = hasActiveRound || dividerOpen;

  // Reporta pra fora (o modal da home usa isso pra travar o botão de fechar
  // e pedir confirmação) — mesmo sem login, mesmo sendo ronda avulsa.
  useEffect(() => {
    onShiftActiveChange?.(isBusyWithRound);
    return () => onShiftActiveChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusyWithRound]);

  // Trava o fechamento da PRÓPRIA ABA/JANELA do navegador (não só o modal
  // interno) enquanto há ronda em andamento — recarregar ou fechar a aba
  // sem querer não pode simplesmente descartar o acompanhamento. O texto do
  // `returnValue` é ignorado pelos navegadores modernos (mostram sempre a
  // mensagem padrão do próprio sistema), mas é obrigatório setar algo pra
  // acionar o aviso nativo de "Sair do site?".
  useEffect(() => {
    if (!isBusyWithRound) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isBusyWithRound]);

  const slotsQuery = useQuery({
    queryKey: ['patrol-slots', shift?.id],
    queryFn: () => api.listShiftSlots(shift!.id),
    enabled: !!shift?.id,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
  const slots = slotsQuery.data ?? [];

  const agentsQuery = useQuery({
    queryKey: ['patrol-agents', shift?.id],
    queryFn: () => api.listShiftAgents(shift!.id),
    enabled: !!shift?.id,
  });
  const shiftAgents = agentsQuery.data ?? [];

  const sectorsQuery = useQuery({
    queryKey: ['patrol-sectors', unitId],
    queryFn: () => api.listSectors(unitId!),
    enabled: !!unitId,
  });
  const sectors = sectorsQuery.data ?? [];

  // Lista de unidades para o seletor de visitante — evita pedir o UUID cru.
  const unitsQuery = useQuery({
    queryKey: ['units-picker'],
    queryFn: () => api.listUnitsForPicker(),
    enabled: !user,
  });
  const unitsForPicker = unitsQuery.data ?? [];

  // Programações recorrentes criadas no Admin (scheduled_rounds) — só fazem
  // sentido oferecer quando não há turno ativo ainda para a equipe.
  const scheduledQuery = useQuery({
    queryKey: ['scheduled-rounds', unitId, team],
    queryFn: () => api.listScheduledRounds(unitId!, team!),
    enabled: !!unitId && !!team && !shiftQuery.data,
  });
  const scheduledRounds = scheduledQuery.data ?? [];
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleActivateScheduled = async (row: api.ScheduledRoundRow) => {
    if (!unitId || !team) return;
    setActivatingId(row.id);
    try {
      await api.activateScheduledRound(row, team, user?.id ?? null, guestDeviceId);
      await shiftQuery.refetch();
      toast.success(`Turno "${row.name}" ativado a partir da programação.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível ativar essa programação.');
    } finally {
      setActivatingId(null);
    }
  };

  const metricsQuery = useQuery({
    queryKey: ['patrol-metrics', shift?.id],
    queryFn: () => api.getMetrics(shift!.id),
    enabled: !!shift?.id,
    refetchInterval: 20_000,
  });
  const metrics = metricsQuery.data ?? { total_slots: 0, completed_slots: 0, pending_slots: 0, late_slots: 0, open_incidents: 0, coverage_pct: 0 };

  // Realtime: reflete ações de outros agentes/supervisores imediatamente.
  useEffect(() => {
    if (!shift?.id) return;
    const channel = supabase
      .channel(`patrol-slots-${shift.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_slots', filter: `shift_id=eq.${shift.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] });
        queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_incidents', filter: `unit_id=eq.${unitId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shift?.id, unitId, queryClient]);

  // Marca slots atrasados periodicamente (não é cron de banco, é polling leve do cliente).
  useEffect(() => {
    if (!shift?.id) return;
    const iv = window.setInterval(() => {
      api.markLateSlots(shift.id).then(() => queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] })).catch(() => {});
    }, 30_000);
    return () => window.clearInterval(iv);
  }, [shift?.id, queryClient]);

  const agentMetaById = useMemo(
    () => new Map(shiftAgents.map((a) => [a.agent_id, { name: a.agent?.name ?? 'Agente', avatarUrl: a.agent?.avatar_url }])),
    [shiftAgents],
  );
  const agentWindows = useMemo(
    () => buildAgentWindows(slots, (id) => (id ? agentMetaById.get(id) ?? { name: 'Agente' } : { name: 'Sem agente' })),
    [slots, agentMetaById],
  );

  const currentAgentSlot = useMemo(
    () => slots.find((s) => s.agent_id === agent?.id && (s.status === 'active' || s.status === 'late' || s.status === 'incident')) ?? null,
    [slots, agent?.id],
  );
  const timer = useRoundTimer(currentAgentSlot);

  const invalidateAll = () => {
    if (!shift?.id) return;
    queryClient.invalidateQueries({ queryKey: ['patrol-slots', shift.id] });
    queryClient.invalidateQueries({ queryKey: ['patrol-metrics', shift.id] });
    queryClient.invalidateQueries({ queryKey: ['patrol-agents', shift.id] });
  };

  const handleRemoveShiftAgent = async (agentId: string) => {
    if (!shift?.id) return;
    try {
      await api.removeShiftAgent(shift.id, agentId);
      invalidateAll();
      toast.success('Agente removido da ronda.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível remover o agente.');
    }
  };

  const handleAddSupportAgent = async (agentId: string) => {
    if (!shift?.id) return;
    try {
      await api.addSupportAgentToShift(shift.id, agentId);
      invalidateAll();
      toast.success('Agente de apoio (BH) escalado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível escalar o agente de apoio.');
    }
  };

  const handleStart = async (slot: PatrolSlot) => {
    try { await api.startSlot(slot.id); invalidateAll(); }
    catch (e: any) { toast.error(e?.message ?? 'Não foi possível iniciar a ronda.'); }
  };
  /** Se a rede falhar, a ação entra na fila offline em vez de ser perdida
   * (Seção 39) — nunca finge sucesso: o toast deixa claro que ficou pendente. */
  const runOrQueue = async (
    action: Parameters<typeof enqueuePatrolAction>[0],
    fn: () => Promise<unknown>,
    pendingMsg: string,
  ) => {
    try {
      await fn();
      invalidateAll();
    } catch (e: any) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueuePatrolAction(action);
        setPendingCount(getQueueLength());
        toast.warning(pendingMsg + ' Sem conexão — será enviado quando a rede voltar.');
      } else {
        toast.error(e?.message ?? 'Ação não concluída.');
      }
    }
  };

  const handlePause = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'pause', slotId: currentAgentSlot.id }, () => api.pauseSlot(currentAgentSlot.id), 'Pausa registrada localmente.');
  };
  const handleResume = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'resume', slotId: currentAgentSlot.id }, () => api.resumeSlot(currentAgentSlot.id), 'Retomada registrada localmente.');
  };
  const handleComplete = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'complete', slotId: currentAgentSlot.id }, async () => {
      await api.completeSlot(currentAgentSlot.id);
      toast.success('Ronda finalizada.');
    }, 'Finalização registrada localmente.');
  };
  const handleExtend = async () => {
    if (!currentAgentSlot) return;
    await runOrQueue({ type: 'extend', slotId: currentAgentSlot.id, minutes: 5 }, () => api.extendSlot(currentAgentSlot.id, 5), 'Extensão registrada localmente.');
  };
  const handleIncident = async (input: { type: string; severity: any; description: string }) => {
    if (!unitId) return;
    await api.createIncident({ slot_id: currentAgentSlot?.id ?? null, unit_id: unitId, agent_id: agent?.id ?? null, ...input });
    invalidateAll();
    toast.success('Ocorrência registrada.');
  };

  const handleConfirmEndShift = async () => {
    if (!shift) return;
    setEndingShift(true);
    try {
      const start = new Date(shift.start_at);
      const now = getServerDate();
      const totalMin = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60_000));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      await api.closeShift(shift.id);
      setEndConfirmOpen(false);
      setCelebrationStats({
        team: shift.team,
        totalSlots: metrics.total_slots,
        completedSlots: metrics.completed_slots,
        coveragePct: metrics.coverage_pct,
        durationLabel: h > 0 ? `${h}h${m > 0 ? `${m}min` : ''}` : `${m}min`,
      });
      queryClient.invalidateQueries({ queryKey: ['patrol-shift', unitId, team, guestDeviceId] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível encerrar a ronda.');
    } finally {
      setEndingShift(false);
    }
  };

  // Ronda encerrada agora mesmo — mostra a celebração ANTES de checar
  // qualquer outra coisa (turno/loading), pois assim que `closeShift`
  // resolve, o refetch já pode ter apagado `shift` — sem essa checagem no
  // topo, a tela de conclusão seria desmontada antes do usuário lê-la.
  if (celebrationStats) {
    return (
      <RoundCompletionCelebration
        open
        onClose={() => setCelebrationStats(null)}
        stats={celebrationStats}
      />
    );
  }

  if (!unitId || !team) {
    // For authenticated users without profile link
    if (user) {
      return <p className="p-6 text-sm text-muted-foreground">Vincule seu perfil a uma unidade e equipe para usar o Gestor de Rondas.</p>;
    }
    // Guest users see a banner with quick team/unit switcher (non-blocking)
    // Already has defaults, so we show the dashboard with optional override
  }

  if (shiftQuery.isLoading) {
    return (
      <div className="rounds-dashboard space-y-4 py-3 sm:py-4">
        <RondasHero team={team} />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="rounds-dashboard space-y-4 py-3 sm:py-4">
        <RondasHero team={team} />

        {!user && (
          <div className="space-y-2.5 rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <p className="text-xs font-semibold text-primary">Acesso público — indique sua equipe e unidade</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label htmlFor="guest-team-select" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Equipe</label>
                <Select value={guestTeam || 'ALFA'} onValueChange={(v) => setGuestTeam(v || 'ALFA')}>
                  <SelectTrigger id="guest-team-select" className="mt-1 h-9 border-border bg-background text-sm text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false}>
                    <SelectItem value="ALFA">ALFA</SelectItem>
                    <SelectItem value="BRAVO">BRAVO</SelectItem>
                    <SelectItem value="CHARLIE">CHARLIE</SelectItem>
                    <SelectItem value="DELTA">DELTA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="guest-unit-select" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Unidade</label>
                <Select value={guestUnitId || '__loading__'} onValueChange={(v) => setGuestUnitId(v || null)}>
                  <SelectTrigger id="guest-unit-select" className="mt-1 h-9 border-border bg-background text-sm text-foreground">
                    <SelectValue placeholder="Carregando unidades…" />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false}>
                    {unitsForPicker.length === 0 && (
                      <SelectItem value="__loading__" disabled>Carregando unidades…</SelectItem>
                    )}
                    {unitsForPicker.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {guestTeam && teamPosters[guestTeam] && (
              <div key={guestTeam} className="flex items-center gap-2.5 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                <img src={teamPosters[guestTeam]} alt={`Equipe ${guestTeam}`} className="h-12 w-12 shrink-0 rounded-lg border border-primary/25 object-cover" />
                <p className="text-xs font-bold text-foreground">EQUIPE {guestTeam}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Ou <a href="/login" className="text-primary underline hover:no-underline font-medium">faça login</a> para usar seu perfil de agente</p>
          </div>
        )}

        <div className="ops-console-panel animate-in fade-in-0 slide-in-from-bottom-2 overflow-hidden rounded-xl border border-primary/20 bg-card duration-500">
          <div className="flex flex-col items-center gap-3 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                <ShieldOff className="h-5 w-5 text-primary" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Nenhum turno em andamento</h3>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Equipe <span className="font-semibold text-foreground">{team}</span> sem escala ativa.
                </p>
              </div>
            </div>
            <Button className="w-full shrink-0 gap-2 sm:w-auto" onClick={() => setDividerOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Programar turno
            </Button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border border-t border-border/60 bg-card/60">
            {[
              { Icon: Clock3, label: 'Quartos de hora', value: '15 a 60 min' },
              { Icon: Users, label: 'Divisão', value: 'Por agente' },
              { Icon: MapPin, label: 'Setores', value: 'Por unidade' },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 px-3 py-2.5 text-center">
                <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
                <span className="text-[11px] font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <CreateShiftDialog open={dividerOpen} onOpenChange={setDividerOpen} unitId={unitId} team={team} createdBy={user?.id ?? null} guestDeviceId={guestDeviceId} onCreated={() => shiftQuery.refetch()} />

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>

        <QuickRoundsMode unitId={unitId} team={team} onSessionActiveChange={setQuickRoundActive} />

        {scheduledRounds.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              Programações desta unidade
            </h3>
            <div className="space-y-2">
              {scheduledRounds.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.round_start_time && row.round_end_time
                        ? `${row.round_start_time} – ${row.round_end_time}`
                        : `${row.ronda_duration_min} min`}
                      {' · '}quartos de {row.round_interval_min} min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={activatingId === row.id}
                    onClick={() => handleActivateScheduled(row)}
                  >
                    {activatingId === row.id ? 'Ativando...' : 'Ativar agora'}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const shiftStart = new Date(shift.start_at);
  const shiftEnd = new Date(shift.end_at);
  const fmtHm = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
  const isNightShift = shiftStart.getHours() >= 18 || shiftStart.getHours() < 6;

  return (
    <div className="rounds-dashboard space-y-4 py-3 sm:py-4">
      {/* RondasHero fica sempre na mesma posição em todos os estados
          (carregando / sem turno / com turno) para que o React reaproveite
          o mesmo elemento de imagem ao trocar de equipe — sem isso, a troca
          desmontava e remontava a foto, gerando o "flash" branco e o atraso
          percebido na transição. */}
      <RondasHero team={team}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
              {isNightShift ? <Moon className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} /> : <Sun className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />}
              {fmtHm(shiftStart)}–{fmtHm(shiftEnd)}
            </span>
            <span className="hidden h-3 w-px bg-white/20 sm:block" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} /> <span className="max-w-[9rem] truncate">{agent?.unit?.name ?? 'Minha unidade'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <Button
              variant="outline" size="sm"
              aria-label="Dividir ou reprogramar a ronda"
              className="relative h-7 gap-1.5 border-white/15 bg-white/[0.06] px-2 text-[11px] text-white before:absolute before:-inset-y-2.5 before:-inset-x-1 before:content-[''] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              onClick={() => setDividerOpen(true)}
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dividir / reprogramar</span>
            </Button>
            {agentWindows.length > 0 && (
              <ShareScheduleButton
                team={shift.team}
                unitName={agent?.unit?.name}
                rangeStart={shiftStart}
                rangeEnd={shiftEnd}
                windows={agentWindows}
                stats={{ coveragePct: metrics.coverage_pct, openIncidents: metrics.open_incidents }}
              />
            )}
            <Button
              variant="outline" size="sm"
              aria-label="Encerrar ronda"
              className="relative h-7 gap-1.5 border-destructive/40 bg-destructive/10 px-2 text-[11px] text-destructive-foreground before:absolute before:-inset-y-2.5 before:-inset-x-1 before:content-[''] hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
              onClick={() => setEndConfirmOpen(true)}
            >
              <Square className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Encerrar ronda</span>
            </Button>
          </div>
        </div>
      </RondasHero>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <WifiOff className="h-4 w-4" /> Sem conexão — as ações serão reenviadas quando a rede voltar.
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <Clock3 className="h-4 w-4" /> {pendingCount} alteração(ões) pendente(s) de sincronização...
        </div>
      )}
      {!user && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
          {guestTeam && teamPosters[guestTeam] && (
            <img
              src={teamPosters[guestTeam]}
              alt={`Equipe ${guestTeam}`}
              className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover grayscale-[35%]"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              Equipe {guestTeam} · {agent?.unit?.name ?? 'unidade selecionada'}
            </p>
            <p className="text-xs text-muted-foreground">
              Equipe e unidade travadas enquanto esta ronda estiver ativa — evita perder o acompanhamento por engano.
            </p>
          </div>
        </div>
      )}

      <RoundMetrics metrics={metrics} />

      {/* Bloco principal: ronda atual (destaque) + fila de próximas rondas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        {currentAgentSlot && timer ? (
          <section className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
            {/* Emblema da equipe ao fundo — leve (ícone vetorial, não foto),
                só pra dar identidade visual ao card sem pesar. */}
            {getTeamEmblem(team) && (
              <img
                src={getTeamEmblem(team)!}
                alt=""
                aria-hidden
                loading="lazy"
                className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 opacity-[0.07] grayscale"
              />
            )}
            <div className="relative mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
                <span className="relative flex h-2 w-2">
                  {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Ronda em andamento
              </h3>
              <span className="truncate rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                {currentAgentSlot.sector?.name ?? 'Setor não definido'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-6">
              <RoundTimer timer={timer} color={getTeamColors(team).primary} />

              <div className="flex w-full min-w-0 flex-col gap-4">
                <dl className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Ronda atual</dt>
                      <dd className="truncate text-[15px] font-bold text-foreground">
                        {currentAgentSlot.sector?.name ?? 'Setor não definido'}
                      </dd>
                      <dd className="text-xs tabular-nums text-muted-foreground">
                        {fmtHm(new Date(currentAgentSlot.scheduled_start))} – {fmtHm(new Date(currentAgentSlot.scheduled_end))}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Agente responsável</dt>
                      <dd className="truncate text-[15px] font-bold text-foreground">
                        {currentAgentSlot.agent?.name ?? agent?.name ?? '—'}
                      </dd>
                      <dd className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {timer.isPaused ? 'Pausado' : 'Em ronda'}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Turno programado desde</dt>
                      <dd className="truncate text-[13px] font-semibold text-foreground">
                        {shiftStart.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Rio_Branco' })} · {fmtHm(shiftStart)}
                      </dd>
                    </div>
                  </div>
                </dl>

                <RoundControls
                  slot={currentAgentSlot}
                  isPaused={timer.isPaused}
                  onPause={handlePause}
                  onResume={handleResume}
                  onComplete={handleComplete}
                  onExtend={handleExtend}
                  onIncident={() => setIncidentOpen(true)}
                  canExtend
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <Clock3 className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
            <p className="mt-2 text-sm text-muted-foreground">Você não está em ronda no momento.</p>
            {slots.some((s) => s.agent_id === agent?.id && s.status === 'pending') && (
              <Button
                className="mt-3"
                onClick={() => {
                  const next = slots.find((s) => s.agent_id === agent?.id && s.status === 'pending');
                  if (next) handleStart(next);
                }}
              >
                Iniciar próxima ronda
              </Button>
            )}
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-foreground">Próximas rondas</h3>
          <NextRounds slots={slots} />
        </section>
      </div>

      {/* Linhas do tempo — por agente (padrão) e por quarto de hora, em
          abas: as duas mostravam basicamente a mesma informação em formatos
          diferentes, empilhadas uma embaixo da outra. Uma delas de cada vez
          cabe bem mais fácil numa única tela. */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <Tabs defaultValue="agentes" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 pt-2.5">
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="agentes" className="relative h-7 px-2.5 text-[11px] before:absolute before:-inset-y-2 before:content-['']">Tempo por agente</TabsTrigger>
              <TabsTrigger value="quartos" className="relative h-7 px-2.5 text-[11px] before:absolute before:-inset-y-2 before:content-['']">Quartos de hora</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="agentes" className="m-0 p-3">
            {agentWindows.length > 0 ? (
              <AgentScheduleTimeline
                rangeStart={shiftStart}
                rangeEnd={shiftEnd}
                windows={agentWindows}
                live
                highlightKey={currentAgentSlot?.agent_id ?? null}
                title="Tempo de cada agente"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum agente escalado neste turno ainda.</p>
            )}
          </TabsContent>
          <TabsContent value="quartos" className="m-0 space-y-2.5 p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {[
                { c: 'bg-emerald-500', l: 'Concluída' },
                { c: 'bg-sky-500', l: 'Em andamento' },
                { c: 'bg-muted-foreground/50', l: 'Pendente' },
                { c: 'bg-amber-500', l: 'Atraso' },
                { c: 'bg-rose-500', l: 'Ocorrência' },
              ].map((k) => (
                <span key={k.l} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', k.c)} />
                  {k.l}
                </span>
              ))}
            </div>
            <RoundTimeline slots={slots} activeSlotId={currentAgentSlot?.id} />
          </TabsContent>
        </Tabs>
      </section>

      {/* Equipe + histórico/ocorrências lado a lado */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-foreground">
            Agentes da equipe {team}{' '}
            <span className="font-normal text-muted-foreground">({shiftAgents.length})</span>
          </h3>
          <RoundAgentList agents={shiftAgents} onRemove={user ? handleRemoveShiftAgent : undefined} />
          {user && (
            <AddSupportAgent
              excludeIds={shiftAgents.map((a) => a.agent_id)}
              onAdd={handleAddSupportAgent}
            />
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
            Últimas ocorrências
            {metrics.open_incidents > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                {metrics.open_incidents} em aberto
              </span>
            )}
          </h3>
          <RoundHistory shiftId={shift.id} />
        </section>
      </div>

      <IncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} onSubmit={handleIncident} />
      <ShiftDivider
        open={dividerOpen}
        onOpenChange={setDividerOpen}
        startAt={new Date(shift.start_at)}
        endAt={new Date(shift.end_at)}
        intervalMinutes={shift.interval_minutes}
        agents={shiftAgents}
        sectors={sectors}
        onConfirm={async ({ strategy, agentIds, sectorIds }) => {
          const preview = api.generateSlotPreview({
            shiftId: shift.id, startAt: new Date(shift.start_at), endAt: new Date(shift.end_at),
            intervalMinutes: shift.interval_minutes, sectorIds, agentIds, strategy,
          });
          await api.saveSlots(shift.id, preview);
          invalidateAll();
          toast.success(`${preview.length} slots gerados.`);
        }}
      />

      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Encerrar esta ronda?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                O turno da Equipe <strong className="text-foreground">{shift.team}</strong> será marcado como concluído.
                {metrics.pending_slots > 0 && (
                  <> Ainda há <strong className="text-foreground">{metrics.pending_slots}</strong> ronda{metrics.pending_slots > 1 ? 's' : ''} pendente{metrics.pending_slots > 1 ? 's' : ''}.</>
                )}
              </span>
              <span className="block font-medium text-destructive">
                Não é possível reabrir depois de encerrado — só programar um novo turno.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar acompanhando</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleConfirmEndShift(); }}
              disabled={endingShift}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endingShift ? 'Encerrando...' : 'Encerrar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Busca compacta para escalar um agente de apoio (BH) — fora do time
 * titular, entrou como reforço/banco de horas. Fecha após adicionar. */
function AddSupportAgent({ excludeIds, onAdd }: { excludeIds: string[]; onAdd: (agentId: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; team: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchAgentsByName(q, excludeIds)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <UserPlus className="h-3.5 w-3.5" /> Adicionar agente de apoio (BH)
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar agente pelo nome..."
          aria-label="Buscar agente de apoio pelo nome"
          className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary/50"
        />
      </div>
      {searching && <p className="px-1 text-[11px] text-muted-foreground">Buscando...</p>}
      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="px-1 text-[11px] text-muted-foreground">Nenhum agente encontrado.</p>
      )}
      {results.length > 0 && (
        <div className="max-h-36 space-y-0.5 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={adding === r.id}
              onClick={async () => {
                setAdding(r.id);
                await onAdd(r.id);
                setAdding(null);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-background disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="truncate text-foreground">{r.name}</span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                {adding === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (r.team ?? '—')}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
        className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm"
      >
        Cancelar
      </button>
    </div>
  );
}

const DURATION_OPTIONS = [
  { minutes: 6 * 60, label: '6 horas' },
  { minutes: 8 * 60, label: '8 horas' },
  { minutes: 12 * 60, label: '12 horas' },
  { minutes: 24 * 60, label: '24 horas' },
];

const INTERVAL_OPTIONS = [
  { minutes: 15, label: '15 min (quarto de hora)' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
];

/**
 * Diálogo de criação de turno (quando não há nenhum ativo). Deixa escolher
 * início, duração e o tamanho dos quartos de hora — em vez do turno fixo de
 * 12h/15min de antes. Ao confirmar, atribui a equipe inteira ao turno e
 * mantém o modal aberto: o componente pai troca automaticamente para o
 * ShiftDivider (mesmo estado `open`) assim que o turno passa a existir,
 * para o usuário já escolher a estratégia de divisão.
 */
function CreateShiftDialog({ open, onOpenChange, unitId, team, createdBy, guestDeviceId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; unitId: string; team: string; createdBy: string | null; guestDeviceId: string | null; onCreated: () => void;
}) {
  const [startAt, setStartAt] = useState(() => formatAcreDateTimeLocal(getServerDate()));
  const [durationMinutes, setDurationMinutes] = useState(12 * 60);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [saving, setSaving] = useState(false);

  // Detecta automaticamente horário digitado fora do razoável — em vez de
  // deixar o turno nascer torto e só o usuário perceber depois, no meio da
  // ronda. `parseAcreDateTimeLocal` trata os números do campo como hora de
  // PAREDE do Acre (nunca o fuso do aparelho — Seção 41).
  const parsedStart = parseAcreDateTimeLocal(startAt);
  const minutesFromNow = (parsedStart.getTime() - getServerDate().getTime()) / 60_000;
  const isTooFarPast = minutesFromNow < -180; // mais de 3h atrás — provável engano de data
  const isTooFarFuture = minutesFromNow > 60 * 24 * 90; // mais de 90 dias à frente
  const isSlightlyPast = minutesFromNow < 0 && !isTooFarPast;
  const dateError = isTooFarPast
    ? 'Esse horário já passou há mais de 3 horas — confira o dia digitado.'
    : isTooFarFuture
    ? 'Esse horário está a mais de 90 dias de distância — confira o dia digitado.'
    : null;

  const handleCreate = async () => {
    if (dateError) return;
    setSaving(true);
    try {
      const start = parsedStart;
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      const shift = await api.createShift({
        unit_id: unitId, team, start_at: start.toISOString(), end_at: end.toISOString(),
        interval_minutes: intervalMinutes, created_by: createdBy, guest_device_id: guestDeviceId,
      });
      let rosterAssigned = true;
      try {
        const roster = await api.listUnitTeamAgents(unitId, team);
        if (roster.length > 0) await api.assignAgentsToShift(shift.id, roster.map((a) => a.id));
      } catch {
        // Segue sem atribuir automaticamente — dá para escolher agentes na etapa de divisão,
        // mas avisa (ver toast abaixo) em vez de falhar calado.
        rosterAssigned = false;
      }
      onCreated();
      toast.success('Turno criado. Agora escolha como dividir as rondas.');
      if (!rosterAssigned) {
        toast.warning('Não foi possível carregar a equipe automaticamente — selecione os agentes na próxima etapa.');
      }
      // Não fecha: assim que `shift` existir, o pai troca este diálogo pelo ShiftDivider.
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível criar o turno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 border-b border-border bg-primary/[0.06] px-6 py-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <CalendarPlus className="h-5 w-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <DialogTitle className="text-base">Programar turno de rondas</DialogTitle>
            <DialogDescription className="text-xs">Defina início, duração e quartos de hora — a divisão entre agentes vem na próxima etapa.</DialogDescription>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="shift-start-at" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Início
            </Label>
            <input
              id="shift-start-at"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? 'shift-start-at-error' : undefined}
              className={cn(
                'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                dateError ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
              )}
            />
            {dateError && (
              <p id="shift-start-at-error" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <ShieldOff className="h-3.5 w-3.5 shrink-0" /> {dateError}
              </p>
            )}
            {!dateError && isSlightlyPast && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <Hourglass className="h-3.5 w-3.5 shrink-0" />
                Esse horário já passou — os quartos de hora vencidos entram automaticamente como concluídos.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Hourglass className="h-3.5 w-3.5 text-primary" /> Duração
              </Label>
              <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => <SelectItem key={o.minutes} value={String(o.minutes)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" /> Quartos de hora
              </Label>
              <Select value={String(intervalMinutes)} onValueChange={(v) => setIntervalMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((o) => <SelectItem key={o.minutes} value={String(o.minutes)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>A equipe inteira é atribuída automaticamente ao criar — você escolhe a estratégia de divisão (blocos, rotativo ou manual) na próxima tela.</span>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !!dateError} className="gap-1.5">
            {saving ? 'Criando...' : <>Criar e dividir <SplitSquareHorizontal className="h-4 w-4" /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
