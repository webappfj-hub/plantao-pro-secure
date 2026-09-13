import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Users, Clock3, History, Trash2, CheckCircle2, ArrowRight, CalendarClock, Zap,
  ShieldAlert, CalendarDays, Shield, Square, GripVertical, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getServerDate, acreWallTimeToServerMs, syncServerTime } from '@/hooks/useServerTime';
import { getTeamColors, getTeamEmblem } from '@/lib/teamAssets';
import * as api from '../api';
import { AgentScheduleTimeline, buildQuickModeWindows } from './AgentScheduleTimeline';
import { ShareScheduleButton } from './ShareScheduleButton';

/** Início/fim em "HH:mm" → duração em minutos. Vira o dia (fim < início) soma 24h. */
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** "HH:mm" atual no fuso do Acre, a partir do relógio do servidor. */
function nowHm(): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Rio_Branco', hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(getServerDate());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const h = get('hour') === '24' ? '00' : get('hour');
  return `${h}:${get('minute')}`;
}

function addHours(hm: string, hours: number): string {
  const [h, m] = hm.split(':').map(Number);
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Próxima ocorrência de "HH:mm" (fuso do Acre) a partir do relógio do
 * servidor — hoje, ou amanhã se já passou. Nunca usa a hora do dispositivo
 * (Seção 41): dispositivos com data/hora alterada não conseguem mentir
 * pro cronômetro de rondas. */
function nextOccurrence(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const todayMs = acreWallTimeToServerMs(h, m, 0);
  return new Date(todayMs <= getServerDate().getTime() ? acreWallTimeToServerMs(h, m, 1) : todayMs);
}

/** "HH:mm" aplicado ao dia de hoje (fuso do Acre, hora do servidor). */
function todayAt(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  return new Date(acreWallTimeToServerMs(h, m, 0));
}

function fmtClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function todayLabel(): string {
  return getServerDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Rio_Branco' });
}

const CHIP_COLORS = ['#2F6FED', '#D62839', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];
const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R;
/** Tempo que a tela de conclusão fica visível antes de fechar sozinha. */
const AUTO_CLOSE_MS = 60_000;
/** Frase que o agente precisa reescrever pra encerrar um rodízio ativo que
 * não foi programado — evita fechar por engano no meio da ronda. */
const CANCEL_PHRASE = 'ENCERRAR RONDA';

interface QuickRoundsModeProps {
  unitId: string | null;
  team: string | null;
  /** Avisa quem hospeda o painel se existe um rodízio esperando ou rodando
   * (mesmo sem cadastro/login) — usado pra travar o fechamento acidental da
   * janela/aba enquanto o Modo Rápido está ativo, do mesmo jeito que já
   * acontece para um turno estruturado. "done" não conta: a ronda já
   * terminou, só falta o cartão de conclusão fechar sozinho. */
  onSessionActiveChange?: (active: boolean) => void;
}

interface Session {
  names: string[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  triggerAt: string; // ISO — quando o cronômetro efetivamente começa a contar
  phase: 'waiting' | 'running' | 'done';
  wasScheduled: boolean;
  finishedAt?: string; // ISO — setado quando phase vira 'done'
}

/** Barra superior destacada — equipe, data, quantidade de agentes, tempo de
 * cada um. Sempre visível, em qualquer estado (configurando, esperando ou
 * rodando), pra nunca perder o contexto da ronda em uma tela só. */
function StatusStrip({ team, agentCount, perAgentMs }: { team: string | null; agentCount: number; perAgentMs: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-primary/25 bg-primary/[0.09] px-4 py-2 text-[11px] font-semibold">
      <span className="flex items-center gap-1 text-primary"><Shield className="h-3.5 w-3.5" /> Equipe {team ?? '—'}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="flex items-center gap-1 text-foreground"><CalendarDays className="h-3.5 w-3.5 text-primary" /> {todayLabel()}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="flex items-center gap-1 text-foreground"><Users className="h-3.5 w-3.5 text-primary" /> {agentCount} agente{agentCount !== 1 ? 's' : ''}</span>
      {perAgentMs > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="flex items-center gap-1 text-foreground"><Clock3 className="h-3.5 w-3.5 text-primary" /> {fmtClock(perAgentMs)}/agente</span>
        </>
      )}
    </div>
  );
}

/**
 * Modo rápido: nomes digitados na hora, tempo dividido proporcionalmente,
 * cronômetro automático. Uma vez ativado (agora ou programado para um
 * horário), o estado é salvo no localStorage — sobrevive a refresh e só
 * libera a tela de configuração quando a programação termina ou é cancelada.
 */
export function QuickRoundsMode({ unitId, team, onSessionActiveChange }: QuickRoundsModeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storageKey = `quick-rounds-session-${unitId ?? 'x'}-${team ?? 'x'}`;
  const posKey = `${storageKey}-pos`;

  const [names, setNames] = useState<string[]>(['', '']);
  const [startTime, setStartTime] = useState(() => nowHm());
  const [endTime, setEndTime] = useState(() => addHours(nowHm(), 12));
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });
  const [, forceTick] = useState(0);
  const savedRef = useRef(false);
  const [confirmScheduleOpen, setConfirmScheduleOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelPhrase, setCancelPhrase] = useState('');

  // Posição da janela compacta (fase "aguardando") — arrastável, lembrada
  // por unidade/equipe entre sessões.
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(posKey);
      return raw ? (JSON.parse(raw) as { x: number; y: number }) : { x: 16, y: 88 };
    } catch {
      return { x: 16, y: 88 };
    }
  });
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);

  const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragOffsetRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return;
    const maxX = window.innerWidth - 260;
    const maxY = window.innerHeight - 140;
    const nx = Math.min(Math.max(0, e.clientX - dragOffsetRef.current.dx), Math.max(0, maxX));
    const ny = Math.min(Math.max(0, e.clientY - dragOffsetRef.current.dy), Math.max(0, maxY));
    setPos({ x: nx, y: ny });
  };
  const onDragPointerUp = () => {
    if (!dragOffsetRef.current) return;
    dragOffsetRef.current = null;
    try { localStorage.setItem(posKey, JSON.stringify(pos)); } catch { /* ignore */ }
  };

  const durationMinutes = diffMinutes(startTime, endTime);
  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names]);
  // Início e fim iguais viram 24h inteiras via diffMinutes (regra de "virou
  // o dia") — provavelmente um esquecimento de trocar o horário de término,
  // não uma escolha real. Avisa em vez de deixar passar quieto.
  const sameStartEnd = startTime === endTime;
  // Se "programar para HH:mm" já passou hoje, o rodízio só entra amanhã —
  // detecta isso ANTES de travar a programação (Seção "sem desfazer depois").
  const scheduleResolvesTomorrow = nextOccurrence(startTime).getTime() - todayAt(startTime).getTime() > 60_000;

  const historyQuery = useQuery({
    queryKey: ['quick-round-history', unitId, team],
    queryFn: () => api.listQuickRoundHistory(unitId, team),
    enabled: !!user,
  });
  const history = historyQuery.data ?? [];

  const persist = (s: Session | null) => {
    setSession(s);
    try {
      if (s) localStorage.setItem(storageKey, JSON.stringify(s));
      else localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  // Cronômetro: 1 tick/s sempre que há sessão ativa (esperando, rodando ou concluída).
  useEffect(() => {
    if (!session) return;
    const iv = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, [session]);

  // Avisa quem hospeda o painel que há um rodízio esperando/rodando — mesmo
  // pra visitante sem login — pra travar o fechamento acidental da janela.
  useEffect(() => {
    const active = session != null && session.phase !== 'done';
    onSessionActiveChange?.(active);
    return () => onSessionActiveChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase]);

  // Ressincroniza o relógio do servidor ao montar e sempre que a aba volta
  // ao foco — garante que uma ronda ativa nunca fique presa a um desvio de
  // horário do dispositivo detectado enquanto a aba estava em segundo plano.
  useEffect(() => {
    void syncServerTime();
    const onFocus = () => { void syncServerTime(true); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const now = getServerDate().getTime();
  const triggerMs = session ? new Date(session.triggerAt).getTime() : 0;
  const isWaiting = session?.phase === 'waiting' && now < triggerMs;

  // Programado: assim que a hora chega, vira "running" sozinho.
  useEffect(() => {
    if (session?.phase === 'waiting' && now >= triggerMs) {
      persist({ ...session, phase: 'running' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const sessionNames = session ? session.names : [];
  const perAgentMs = session ? (session.durationMinutes * 60_000) / sessionNames.length : 0;
  const totalMs = session ? session.durationMinutes * 60_000 : 0;
  const elapsedMs = session && session.phase === 'running' ? Math.max(0, now - triggerMs) : 0;
  const currentIndex = session && session.phase === 'running' ? Math.min(Math.floor(elapsedMs / perAgentMs), sessionNames.length - 1) : -1;
  const isDone = session?.phase === 'running' && elapsedMs >= totalMs;

  // Ao terminar o cronômetro, vira "done": some da tela de rodízio ativo e
  // mostra um cartão compacto de conclusão por 1 minuto antes de fechar
  // sozinha — dá tempo do supervisor ver que terminou sem travar a tela.
  useEffect(() => {
    if (!isDone || !session) return;
    persist({ ...session, phase: 'done', finishedAt: getServerDate().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // Salva o histórico assim que conclui — de forma discreta (não é um
  // registro definitivo: fica só pra consulta rápida e pode ser limpo).
  useEffect(() => {
    if (session?.phase !== 'done' || savedRef.current) return;
    savedRef.current = true;
    (async () => {
      if (user) {
        try {
          await api.saveQuickRoundHistory({
            unit_id: unitId, team, agent_names: session.names,
            duration_minutes: session.durationMinutes, per_agent_minutes: session.durationMinutes / session.names.length,
            started_at: session.triggerAt, created_by: user.id,
          });
          queryClient.invalidateQueries({ queryKey: ['quick-round-history', unitId, team] });
        } catch { /* segue mesmo se não conseguir salvar o histórico */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase]);

  const finishedMs = session?.finishedAt ? new Date(session.finishedAt).getTime() : 0;
  const closeInMs = session?.phase === 'done' ? Math.max(0, AUTO_CLOSE_MS - (now - finishedMs)) : 0;

  // Fecha sozinha 1 minuto depois de concluir.
  useEffect(() => {
    if (session?.phase !== 'done') return;
    if (closeInMs <= 0) {
      persist(null);
      setNames(['', '']);
      savedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, closeInMs]);

  const addName = () => setNames((prev) => [...prev, '']);
  const removeName = (i: number) => setNames((prev) => prev.filter((_, idx) => idx !== i));
  const updateName = (i: number, value: string) => setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));

  const startSession = (mode: 'now' | 'scheduled') => {
    if (activeNames.length < 1) {
      toast.error('Digite pelo menos um nome.');
      return;
    }
    savedRef.current = false;
    const now = getServerDate();
    const typedStart = todayAt(startTime);

    if (mode === 'scheduled') {
      const triggerAt = nextOccurrence(startTime);
      persist({
        names: activeNames, startTime, endTime, durationMinutes,
        triggerAt: triggerAt.toISOString(), phase: 'waiting', wasScheduled: true,
      });
      toast.success(`Programado para iniciar às ${startTime}.`);
      return;
    }

    // "Iniciar agora": respeita o horário de início digitado, não o
    // instante do clique. Se o horário ainda não chegou, o sistema
    // INTERCEPTA o clique — em vez de ignorar o que foi digitado e começar
    // já (fora do horário programado), entra sozinho em contagem regressiva
    // até o primeiro quarto de hora, exatamente como "Programar" faria.
    // Se já passou, o rodízio nasce sabendo quanto tempo já se foi: os
    // agentes cujo pedaço já venceu aparecem concluídos, só o atual/futuros
    // ficam ativos.
    if (typedStart.getTime() > now.getTime()) {
      persist({
        names: activeNames, startTime, endTime, durationMinutes,
        triggerAt: typedStart.toISOString(), phase: 'waiting', wasScheduled: false,
      });
      toast.info(`Ainda não são ${startTime} — o rodízio vai começar sozinho nesse horário.`);
      return;
    }

    const backdatedMinutes = Math.round((now.getTime() - typedStart.getTime()) / 60_000);
    // O horário digitado já passou por completo hoje (ex.: 00:00 com o
    // relógio em 23h) — isso não é um erro do usuário, é ambiguidade de
    // dia: um turno que atravessa a madrugada (meia-noite até o dia
    // seguinte) naturalmente "já passou" se lido como hoje de manhã bem
    // cedo. Sem travar nada, reinterpreta pra próxima vez que esse horário
    // chega (essa madrugada/amanhã) e entra em contagem regressiva —
    // nunca bloqueia a criação da ronda.
    if (backdatedMinutes >= durationMinutes) {
      const nextStart = nextOccurrence(startTime);
      const isTomorrow = nextStart.getTime() - typedStart.getTime() > 60_000;
      persist({
        names: activeNames, startTime, endTime, durationMinutes,
        triggerAt: nextStart.toISOString(), phase: 'waiting', wasScheduled: false,
      });
      toast.info(`As ${startTime} de hoje já passaram — o rodízio vai começar sozinho às ${startTime}${isTomorrow ? ' de amanhã' : ''}.`);
      return;
    }
    persist({
      names: activeNames, startTime, endTime, durationMinutes,
      triggerAt: typedStart.toISOString(), phase: 'running', wasScheduled: false,
    });
    if (backdatedMinutes > 1) {
      toast.success(`Rodízio iniciado — ${backdatedMinutes} min já contabilizados desde as ${startTime}.`);
    } else {
      toast.success('Rodízio iniciado.');
    }
  };

  const handleScheduleClick = () => {
    if (activeNames.length < 1) {
      toast.error('Digite pelo menos um nome.');
      return;
    }
    setConfirmScheduleOpen(true);
  };

  const confirmSchedule = () => {
    setConfirmScheduleOpen(false);
    startSession('scheduled');
  };

  const doCancel = () => {
    savedRef.current = true;
    persist(null);
    setCancelDialogOpen(false);
    setCancelPhrase('');
    toast.info('Rodízio cancelado — nada foi salvo.');
  };

  const handleCancelClick = () => {
    setCancelPhrase('');
    setCancelDialogOpen(true);
  };

  // Só exige reescrever a frase quando a ronda está rodando e foi iniciada
  // na hora (não programada) — programação e espera cancelam com um clique.
  const requiresPhrase = session?.phase === 'running' && !session.wasScheduled;
  const canConfirmCancel = !requiresPhrase || cancelPhrase.trim().toUpperCase() === CANCEL_PHRASE;

  const handleClearHistory = async () => {
    try {
      await api.clearQuickRoundHistory(unitId, team);
      queryClient.invalidateQueries({ queryKey: ['quick-round-history', unitId, team] });
      toast.success('Histórico limpo.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível limpar o histórico.');
    }
  };

  const cancelDialog = (
    <AlertDialog open={cancelDialogOpen} onOpenChange={(v) => { setCancelDialogOpen(v); if (!v) setCancelPhrase(''); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {session?.phase === 'running' ? 'Você está em ronda' : 'Cancelar programação'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            {session?.phase === 'running' ? (
              <span className="block">
                O rodízio ainda está em andamento. Encerrar agora interrompe o controle de tempo de todos os agentes escalados.
              </span>
            ) : (
              <span className="block">
                Essa ronda ainda não começou — o horário programado será cancelado e nada fica salvo.
              </span>
            )}
            {requiresPhrase && (
              <span className="block space-y-1.5">
                <span className="block font-medium text-destructive">
                  Para confirmar, digite <strong>{CANCEL_PHRASE}</strong> abaixo:
                </span>
                <Input
                  autoFocus
                  value={cancelPhrase}
                  onChange={(e) => setCancelPhrase(e.target.value)}
                  placeholder={CANCEL_PHRASE}
                  className="h-9"
                />
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCancelPhrase('')}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={doCancel}
            disabled={!canConfirmCancel}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
          >
            Encerrar definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ---------- Aguardando horário programado: janela compacta e arrastável ----------
  if (session && isWaiting) {
    const waitColors = getTeamColors(team);
    const waitEmblem = getTeamEmblem(team);
    return (
      <>
        <div
          className="fixed z-40 w-64 animate-in fade-in-0 zoom-in-95 select-none overflow-hidden rounded-2xl border bg-card shadow-xl duration-300"
          style={{ left: pos.x, top: pos.y, borderColor: `${waitColors.primary}4d` }}
        >
          <div
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            className="flex cursor-grab items-center justify-between gap-2 border-b px-3 py-1.5 active:cursor-grabbing"
            style={{ borderColor: `${waitColors.primary}40`, background: `${waitColors.primary}17` }}
          >
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: waitColors.primary }}>
              <GripVertical className="h-3.5 w-3.5" /> Aguardando · {team}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={handleCancelClick}>
              <Square className="h-3 w-3" />
            </Button>
          </div>
          <div className="relative flex flex-col items-center gap-1 overflow-hidden px-4 py-4 text-center">
            {waitEmblem && (
              <img src={waitEmblem} alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 opacity-[0.08] grayscale" />
            )}
            <p className="relative text-[10.5px] uppercase tracking-wide text-muted-foreground">Inicia às {session.startTime}</p>
            <p className="relative font-mono text-2xl font-bold tabular-nums" style={{ color: waitColors.primary }}>{fmtClock(triggerMs - now)}</p>
            <p className="relative truncate text-[11px] text-muted-foreground">{sessionNames.join(' · ')}</p>
          </div>
        </div>
        {cancelDialog}
      </>
    );
  }

  // ---------- Concluída: cartão compacto por 1 minuto, depois fecha sozinha ----------
  if (session && session.phase === 'done') {
    return (
      <section className="animate-in fade-in-0 zoom-in-95 duration-500 overflow-hidden rounded-2xl border border-emerald-500/30 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            <PartyPopper className="h-3.5 w-3.5" /> Rodízio concluído
          </h3>
          <span className="text-[10.5px] tabular-nums text-muted-foreground">fecha em {fmtClock(closeInMs)}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-6 py-5 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-semibold text-foreground">Equipe {team} — turno encerrado</p>
          <p className="text-xs text-muted-foreground">{sessionNames.join(' · ')}</p>
          <Button
            variant="outline" size="sm" className="mt-2 h-7 gap-1.5 text-xs"
            onClick={() => { persist(null); setNames(['', '']); savedRef.current = false; }}
          >
            Fechar agora
          </Button>
        </div>
      </section>
    );
  }

  // ---------- Rodando: cronômetro automático ----------
  if (session && session.phase === 'running') {
    const sliceStartMs = currentIndex * perAgentMs;
    const elapsedInSlice = elapsedMs - sliceStartMs;
    const remainingInSlice = perAgentMs - elapsedInSlice;
    const sliceProgressPct = Math.min(100, Math.max(0, (elapsedInSlice / perAgentMs) * 100));
    const overallProgressPct = Math.min(100, (elapsedMs / totalMs) * 100);
    const urgent = remainingInSlice < 60_000;
    const ringOffset = RING_C * (1 - sliceProgressPct / 100);
    const runColors = getTeamColors(team);
    const runEmblem = getTeamEmblem(team);
    const ringColor = urgent ? 'hsl(var(--destructive))' : runColors.primary;

    return (
      <section className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border bg-card" style={{ borderColor: `${runColors.primary}40` }}>
        {/* Emblema da equipe ao fundo — leve (ícone vetorial, não foto), dá
            identidade visual à ronda sem pesar. */}
        {runEmblem && (
          <img src={runEmblem} alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -right-8 -top-8 z-0 h-40 w-40 opacity-[0.06] grayscale" />
        )}
        <StatusStrip team={team} agentCount={sessionNames.length} perAgentMs={perAgentMs} />

        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Rodízio em andamento
          </h3>
          <div className="flex items-center gap-1.5">
            {team && (
              <ShareScheduleButton
                team={team}
                rangeStart={new Date(triggerMs)}
                rangeEnd={new Date(triggerMs + totalMs)}
                windows={buildQuickModeWindows(sessionNames, new Date(triggerMs), perAgentMs)}
              />
            )}
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={handleCancelClick}>
              <Square className="h-3 w-3" /> Encerrar
            </Button>
          </div>
        </div>

        {/* Anel de progresso — o agente atual, com contagem regressiva embutida */}
        <div key={currentIndex} className="flex flex-col items-center gap-2 border-t border-border px-6 py-5 text-center animate-in fade-in-0 zoom-in-95 duration-500">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Agente na ronda</p>
          <p className="text-lg font-bold text-foreground">{sessionNames[currentIndex]}</p>

          <div className="relative mt-1 h-32 w-32">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
              <circle
                cx="50" cy="50" r={RING_R} fill="none"
                stroke={ringColor}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={ringOffset}
                className={cn('transition-[stroke-dashoffset] duration-1000 ease-linear', urgent && 'animate-pulse')}
                style={{ filter: `drop-shadow(0 0 8px ${ringColor}88)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold tabular-nums transition-colors" style={{ color: ringColor }}>
                {fmtClock(remainingInSlice)}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">restante</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-2.5">
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span>Progresso geral do turno</span>
            <span className="tabular-nums">{fmtClock(elapsedMs)} / {fmtClock(totalMs)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000 ease-linear"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>

        <div className="border-t border-border p-3">
          <AgentScheduleTimeline
            rangeStart={new Date(triggerMs)}
            rangeEnd={new Date(triggerMs + totalMs)}
            windows={buildQuickModeWindows(sessionNames, new Date(triggerMs), perAgentMs)}
            live
            highlightKey={currentIndex >= 0 ? `${sessionNames[currentIndex]}-${currentIndex}` : null}
            title="Escala do rodízio"
          />
        </div>
        {cancelDialog}
      </section>
    );
  }

  // ---------- Configuração ----------
  return (
    <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border border-border bg-card">
      <StatusStrip team={team} agentCount={activeNames.length} perAgentMs={activeNames.length > 0 ? (durationMinutes * 60_000) / activeNames.length : 0} />

      <div className="flex items-center gap-2 px-4 py-2">
        <Users className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-bold text-foreground">Modo rápido — digitar nomes</h3>
        <span className="text-[10px] text-muted-foreground">· sem cadastro, tempo dividido igual</span>
      </div>

      <div className="space-y-2.5 border-t border-border px-4 py-3">
        <div className="space-y-1">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: CHIP_COLORS[i % CHIP_COLORS.length] }}
              >
                {i + 1}
              </span>
              <Input value={name} onChange={(e) => updateName(i, e.target.value)} placeholder={`Nome do agente ${i + 1}`} className="h-8 text-sm" />
              {names.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => removeName(i)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={addName}>
            <Plus className="h-3.5 w-3.5" /> Adicionar agente
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        {sameStartEnd && (
          <p className="flex items-center gap-1.5 text-[11px] text-warning">
            <Clock3 className="h-3 w-3 shrink-0" />
            Início e término iguais — o rodízio vai durar 24h. Confira se não esqueceu de ajustar o término.
          </p>
        )}

        {/* Prévia com hora de início/fim de cada agente — não só a fração igual */}
        {activeNames.length > 0 && durationMinutes > 0 && (
          <AgentScheduleTimeline
            rangeStart={todayAt(startTime)}
            rangeEnd={new Date(todayAt(startTime).getTime() + durationMinutes * 60_000)}
            windows={buildQuickModeWindows(activeNames, todayAt(startTime), (durationMinutes * 60_000) / activeNames.length)}
            title="Prévia da divisão"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleScheduleClick}>
            <CalendarClock className="h-3.5 w-3.5" /> Programar p/ {startTime}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => startSession('now')}>
            <Zap className="h-3.5 w-3.5" /> Iniciar agora
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmScheduleOpen} onOpenChange={setConfirmScheduleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Confirmar programação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                Ao confirmar, o rodízio de <strong className="text-foreground">{activeNames.length} agente{activeNames.length > 1 ? 's' : ''}</strong> fica travado para iniciar{' '}
                <strong className="text-foreground">{scheduleResolvesTomorrow ? 'amanhã' : 'hoje'} às {startTime}</strong> e rodar sozinho até {endTime}.
              </span>
              {scheduleResolvesTomorrow && (
                <span className="block text-warning">
                  As {startTime} de hoje já passaram — por isso a programação só entra amanhã. Se não era essa a intenção, ajuste o horário antes de confirmar.
                </span>
              )}
              <span className="block font-medium text-destructive">
                Não será possível desfazer ou editar essa programação depois de confirmada — só cancelar o rodízio inteiro.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSchedule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar e travar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user && (
        <div className="border-t border-border px-4 py-2.5">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-foreground">
              <History className="h-3.5 w-3.5 text-primary" /> Histórico
            </h4>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground" onClick={handleClearHistory}>
                <Trash2 className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum rodízio registrado ainda.</p>
          ) : (
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-[11px]">
                  <span className="text-foreground">{h.agent_names.join(', ')}</span>
                  <span className="shrink-0 text-muted-foreground">{new Date(h.completed_at).toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
