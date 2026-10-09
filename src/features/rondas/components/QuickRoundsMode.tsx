import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Users, Clock3, History, Trash2, CheckCircle2, ArrowRight, CalendarClock, Zap,
  ShieldAlert, CalendarDays, Shield, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getServerDate, acreWallTimeToServerMs, syncServerTime } from '@/hooks/useServerTime';
import { getTeamColors } from '@/lib/teamAssets';
import * as api from '../api';
import { buildQuickModeWindows } from './AgentScheduleTimeline';
import { ShareScheduleButton } from './ShareScheduleButton';
import { QuickRoundHero } from './QuickRoundHero';
import { fmtDuration } from '../quickSession';

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
  // Visitante sem login: guarda a sessão em sessionStorage, não localStorage
  // — fecha o navegador e a próxima abertura já nasce limpa (sem nomes nem
  // rodízio de teste sobrando). Agente logado mantém localStorage: é
  // trabalho real, precisa sobreviver a fechar/reabrir a aba sem perder.
  const store = user ? localStorage : sessionStorage;

  const [names, setNames] = useState<string[]>(['', '']);
  const [startTime, setStartTime] = useState(() => nowHm());
  const [endTime, setEndTime] = useState(() => addHours(nowHm(), 12));
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = store.getItem(storageKey);
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
      if (s) store.setItem(storageKey, JSON.stringify(s));
      else store.removeItem(storageKey);
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
      toast.error('Informe o nome de pelo menos um agente.');
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
      toast.success(`Rodízio programado para as ${startTime}.`);
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
      toast.info(`O rodízio começa automaticamente às ${startTime}.`);
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
      toast.success(`Rodízio iniciado. ${backdatedMinutes} min já contados desde as ${startTime}.`);
    } else {
      toast.success('Rodízio iniciado.');
    }
  };

  const handleScheduleClick = () => {
    if (activeNames.length < 1) {
      toast.error('Informe o nome de pelo menos um agente.');
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
    toast.info('Rodízio cancelado. Nada foi salvo.');
  };

  const handleCancelClick = () => {
    setCancelPhrase('');
    setCancelDialogOpen(true);
  };

  // Parar o rodízio (aguardando ou em ronda) sempre exige reescrever a
  // frase — evita interromper a escala de todos por um toque sem querer.
  const requiresPhrase = session != null && session.phase !== 'done';
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
            {session?.phase === 'running' ? 'Parar o rodízio em andamento?' : 'Cancelar o rodízio programado?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            {session?.phase === 'running' ? (
              <span className="block">
                O rodízio da equipe <strong className="text-foreground">{team}</strong> está em andamento
                ({sessionNames.length} agente{sessionNames.length !== 1 ? 's' : ''}). Parar agora interrompe o controle de tempo de
                todos os agentes escalados e não pode ser desfeito.
              </span>
            ) : (
              <span className="block">
                O rodízio programado para <strong className="text-foreground">{session?.startTime}</strong> ainda não começou.
                Ao parar, a programação é cancelada e nada fica salvo.
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
            Parar rodízio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ---------- Aguardando horário programado: painel em destaque ----------
  if (session && isWaiting) {
    return (
      <>
        <QuickRoundHero
          team={team}
          names={sessionNames}
          phase="waiting"
          now={now}
          triggerMs={triggerMs}
          perAgentMs={perAgentMs}
          totalMs={totalMs}
          onStop={handleCancelClick}
        />
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
          <p className="text-sm font-semibold text-foreground">Equipe {team} — turno concluído</p>
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

  // ---------- Rodando: painel em destaque com cronômetro e escala ----------
  if (session && session.phase === 'running') {
    return (
      <>
        <QuickRoundHero
          team={team}
          names={sessionNames}
          phase="running"
          now={now}
          triggerMs={triggerMs}
          perAgentMs={perAgentMs}
          totalMs={totalMs}
          onStop={handleCancelClick}
          actions={team ? (
            <ShareScheduleButton
              team={team}
              rangeStart={new Date(triggerMs)}
              rangeEnd={new Date(triggerMs + totalMs)}
              windows={buildQuickModeWindows(sessionNames, new Date(triggerMs), perAgentMs)}
            />
          ) : undefined}
        />
        {cancelDialog}
      </>
    );
  }

  // ---------- Configuração ----------
  const perAgentMsPreview = activeNames.length > 0 ? (durationMinutes * 60_000) / activeNames.length : 0;
  // Mapeia cada linha digitada (pode ter nome vazio) pro seu índice dentro
  // de `activeNames` — é o que determina a fatia de horário que ela ocupa.
  // Sem isso, o índice bruto de `names` desalinha assim que alguém apaga um
  // nome no meio da lista.
  let activeCursor = 0;
  const rowWindow = (name: string): { start: Date; end: Date } | null => {
    if (!name.trim() || durationMinutes <= 0 || perAgentMsPreview <= 0) return null;
    const idx = activeCursor++;
    const base = todayAt(startTime).getTime() + idx * perAgentMsPreview;
    return { start: new Date(base), end: new Date(base + perAgentMsPreview) };
  };
  const fmtRowTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
  const quickColors = getTeamColors(team);

  return (
    <section
      className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl border-2 bg-card shadow-lg"
      style={{ borderColor: `${quickColors.primary}40`, boxShadow: `0 8px 28px -14px ${quickColors.primary}45` }}
    >
      {/* Faixa superior de destaque — deixa claro que este card é a ação principal da tela */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${quickColors.primary}, transparent)` }} aria-hidden />

      <StatusStrip team={team} agentCount={activeNames.length} perAgentMs={perAgentMsPreview} />

      <div className="flex items-center gap-2 px-4 py-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" style={{ color: quickColors.primary }} aria-hidden>
          <path d="M12 2 L20 5.5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5.5 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 7 V12 L15 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="text-xs font-bold text-foreground">Rodízio rápido</h3>
        <span className="text-[10px] text-muted-foreground">· digite os nomes; o tempo é dividido igualmente</span>
      </div>

      <div className="space-y-2 border-t border-border px-4 py-2.5">
        {/* Divisão do tempo — atualiza enquanto os nomes e horários são digitados */}
        {activeNames.length > 0 && durationMinutes > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: `${quickColors.primary}55`, background: `${quickColors.primary}12` }} aria-live="polite">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cada agente fica</p>
              <p className="text-3xl font-extrabold tabular-nums leading-tight" style={{ color: quickColors.primary }}>{fmtDuration(perAgentMsPreview)}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p><b className="text-foreground">{activeNames.length}</b> agente{activeNames.length !== 1 ? 's' : ''}</p>
              <p>total <b className="text-foreground">{fmtDuration(durationMinutes * 60_000)}</b></p>
              <p className="font-mono tabular-nums">{startTime} → {endTime}</p>
            </div>
          </div>
        )}
        <div className="space-y-1">
          {names.map((name, i) => {
            const win = rowWindow(name);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: CHIP_COLORS[i % CHIP_COLORS.length] }}
                >
                  {i + 1}
                </span>
                <Input
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Agente ${i + 1}`}
                  aria-label={`Agente ${i + 1}`}
                  className="h-8 text-sm"
                />
                {win && (
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                    {fmtRowTime(win.start)}–{fmtRowTime(win.end)}
                  </span>
                )}
                {names.length > 1 && (
                  <Button
                    variant="ghost" size="icon"
                    aria-label={`Remover agente ${i + 1}`}
                    className="relative h-8 w-8 shrink-0 text-muted-foreground before:absolute before:-inset-1 before:content-['']"
                    onClick={() => removeName(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={addName}>
            <Plus className="h-3.5 w-3.5" /> Adicionar agente
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            aria-label="Horário de início do rodízio"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            aria-label="Horário de término do rodízio"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        {sameStartEnd && (
          <p className="flex items-center gap-1.5 text-[11px] text-warning">
            <Clock3 className="h-3 w-3 shrink-0" />
            Início e término iguais: o rodízio vai durar 24 h. Confira o horário de término.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleScheduleClick}>
            <CalendarClock className="h-3.5 w-3.5" /> Programar para {startTime}
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
            <p className="text-[11px] text-muted-foreground">Nenhum rodízio concluído ainda.</p>
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
