import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock3, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServerDate } from '@/hooks/useServerTime';
import { useLowMotion } from '@/hooks/useLowMotion';
import type { PatrolSlotStatus } from '../types';

/** Paleta de identidade por agente — a mesma ordem usada no Modo Rápido,
 * pra uma cor sempre significar a mesma pessoa em qualquer tela da ronda. */
export const TIMELINE_COLORS = ['#2F6FED', '#D62839', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

/** Progressão fria→quente ao longo da madrugada — inspirada no cartaz de
 * "Quarto de Hora" da equipe: comunica visualmente o avanço do turno em vez
 * da identidade de quem está na ronda. Interpolada quando há mais blocos
 * que cores (turnos longos/rotativos). */
const PROGRESSION_STOPS = ['#2F6FED', '#8B5CF6', '#F59E0B', '#D62839'];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function progressionColor(index: number, total: number): string {
  if (total <= 1) return PROGRESSION_STOPS[0];
  const t = (index / (total - 1)) * (PROGRESSION_STOPS.length - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(PROGRESSION_STOPS.length - 1, i0 + 1);
  const frac = t - i0;
  const [r0, g0, b0] = hexToRgb(PROGRESSION_STOPS[i0]);
  const [r1, g1, b1] = hexToRgb(PROGRESSION_STOPS[i1]);
  return rgbToHex(r0 + (r1 - r0) * frac, g0 + (g1 - g0) * frac, b0 + (b1 - b0) * frac);
}

export interface TimelineSegment {
  start: Date;
  end: Date;
  status?: PatrolSlotStatus;
}

export interface AgentWindow {
  key: string;
  name: string;
  color: string;
  avatarUrl?: string | null;
  segments: TimelineSegment[];
  totalMinutes: number;
}

export interface AgentMeta {
  name: string;
  avatarUrl?: string | null;
}

/** Agrupa slots (já salvos ou ainda em preview) por agente, mesclando
 * segmentos contíguos do mesmo agente em um único bloco visual — assim a
 * estratégia "blocos" vira uma barra só (início→fim do período dele), e a
 * "rotativa" mostra os pedaços espalhados de verdade. */
export function buildAgentWindows(
  rawSlots: Array<{ agent_id: string | null; scheduled_start: Date | string; scheduled_end: Date | string; status?: PatrolSlotStatus }>,
  metaFor: (agentId: string | null) => AgentMeta,
): AgentWindow[] {
  const order: string[] = [];
  const byAgent = new Map<string, TimelineSegment[]>();
  for (const s of rawSlots) {
    const key = s.agent_id ?? '__sem_agente__';
    if (!byAgent.has(key)) {
      byAgent.set(key, []);
      order.push(key);
    }
    const start = s.scheduled_start instanceof Date ? s.scheduled_start : new Date(s.scheduled_start);
    const end = s.scheduled_end instanceof Date ? s.scheduled_end : new Date(s.scheduled_end);
    byAgent.get(key)!.push({ start, end, status: s.status });
  }

  return order.map((key, i) => {
    const sorted = [...byAgent.get(key)!].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimelineSegment[] = [];
    for (const seg of sorted) {
      const last = merged[merged.length - 1];
      if (last && seg.start.getTime() <= last.end.getTime() + 1000) {
        if (seg.end.getTime() > last.end.getTime()) last.end = seg.end;
        last.status = seg.status;
      } else {
        merged.push({ ...seg });
      }
    }
    const totalMinutes = merged.reduce((sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 60_000, 0);
    const meta = metaFor(key === '__sem_agente__' ? null : key);
    return {
      key,
      name: meta.name,
      avatarUrl: meta.avatarUrl,
      color: TIMELINE_COLORS[i % TIMELINE_COLORS.length],
      segments: merged,
      totalMinutes,
    };
  });
}

/** Divisão sequencial igual do Modo Rápido — cada nome já nasce com hora de
 * início/fim explícita, em vez de só uma fração do tempo total. */
export function buildQuickModeWindows(names: string[], triggerAt: Date, perAgentMs: number): AgentWindow[] {
  return names.map((name, i) => ({
    key: `${name}-${i}`,
    name,
    color: TIMELINE_COLORS[i % TIMELINE_COLORS.length],
    segments: [{ start: new Date(triggerAt.getTime() + i * perAgentMs), end: new Date(triggerAt.getTime() + (i + 1) * perAgentMs) }],
    totalMinutes: perAgentMs / 60_000,
  }));
}

function fmtHm(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
}
function fmtHms(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Rio_Branco' });
}
export function fmtDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
function pct(a: number, b: number): number {
  return b <= 0 ? 0 : Math.min(100, Math.max(0, (a / b) * 100));
}

/** Avatar com foto real (quando o agente tem uma) e fallback automático pras
 * iniciais se a imagem falhar ou não existir — nunca deixa um espaço vazio.
 * `loading="lazy"` + imagem pequena: não pesa em conexão/dispositivo fraco. */
function AgentAvatar({ name, avatarUrl, color, glow }: { name: string; avatarUrl?: string | null; color: string; glow?: boolean }) {
  const [broken, setBroken] = useState(false);
  const showPhoto = !!avatarUrl && !broken;
  return (
    <span
      className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white ring-2 ring-black/10"
      style={{ background: color, boxShadow: glow ? `0 0 12px ${color}99` : undefined }}
    >
      {showPhoto ? (
        <img
          src={avatarUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

interface AgentScheduleTimelineProps {
  rangeStart: Date;
  rangeEnd: Date;
  windows: AgentWindow[];
  /** Liga o cursor "agora" pulsante e o preenchimento de progresso — só faz
   * sentido quando a ronda já está de fato em andamento. Em modo preview
   * (antes de confirmar a divisão), fica desligado: mostra só os horários. */
  live?: boolean;
  /** Chave do agente em destaque (ex.: quem está na ronda agora) — recebe
   * anel e brilho extra, útil quando o agente está sozinho de madrugada e
   * precisa achar sua própria linha rapidinho. */
  highlightKey?: string | null;
  title?: string;
  /** 'agent' (padrão) — cor fixa por pessoa, útil pra acompanhar quem está
   * em cada pedaço num turno rotativo. 'progression' — gradiente frio→quente
   * conforme a madrugada avança, útil pra visualizar o turno como um todo
   * (usado no cartão exportável). */
  colorMode?: 'agent' | 'progression';
}

/** Linha do tempo profissional por agente — mostra hora de início, hora de
 * término e duração de cada um lado a lado com uma barra proporcional real
 * (não só uma fração igual), com cursor "agora" ao vivo quando `live`. */
export function AgentScheduleTimeline({ rangeStart, rangeEnd, windows, live = false, highlightKey = null, title, colorMode = 'agent' }: AgentScheduleTimelineProps) {
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { lowMotion } = useLowMotion();

  useEffect(() => {
    if (!live) return;
    const iv = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, [live]);

  if (windows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum agente para exibir na linha do tempo.</p>;
  }

  const totalMs = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
  const now = getServerDate();
  const nowPct = live ? pct(now.getTime() - rangeStart.getTime(), totalMs) : null;
  const showNowCursor = nowPct !== null && nowPct >= 0 && nowPct <= 100;

  // Marcações de hora no eixo — intervalo adaptativo pra não poluir turnos longos.
  const totalHours = totalMs / 3_600_000;
  const tickStepHours = totalHours <= 3 ? 0.5 : totalHours <= 8 ? 1 : totalHours <= 16 ? 2 : 4;
  const ticks: Date[] = [];
  for (let h = 0; h <= totalHours + 0.001; h += tickStepHours) {
    ticks.push(new Date(rangeStart.getTime() + h * 3_600_000));
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-card/60">
      {/* Textura tática discreta — grade de pontos, igual ao restante do painel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.25) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />

      <div className="relative flex items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
          <Clock3 className="h-3.5 w-3.5 text-primary" />
          {title ?? 'Tempo de cada agente'}
        </h4>
        {showNowCursor && (
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
            <span className="relative flex h-1.5 w-1.5">
              {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Agora {fmtHms(now)}
          </span>
        )}
      </div>

      {/* Régua de horas */}
      <div className="relative ml-[112px] mr-3 mt-3 h-4 sm:ml-32">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 text-[9px] font-medium tabular-nums text-muted-foreground"
            style={{ left: `${pct(t.getTime() - rangeStart.getTime(), totalMs)}%` }}
          >
            {fmtHm(t)}
          </span>
        ))}
      </div>

      <div className="relative space-y-1.5 px-3 pb-3 pt-1">
        {windows.map((w, wi) => {
          const rowColor = colorMode === 'progression' ? progressionColor(wi, windows.length) : w.color;
          const isHighlighted = highlightKey != null && w.key === highlightKey;
          const isExpanded = expanded === w.key;
          const canExpand = w.segments.length > 1;
          const overallStart = w.segments[0]?.start;
          const overallEnd = w.segments[w.segments.length - 1]?.end;
          // Marcação de status — só faz sentido ao vivo: identifica quem já
          // cumpriu o horário (todos os segmentos já terminaram), quem está
          // em ronda agora e quem ainda espera a vez. Deixa isso explícito
          // em vez de só a cor esmaecida da trilha, pra bater o olho e saber
          // quem "já foi", sem precisar interpretar a barra.
          const agentStatus: 'done' | 'active' | 'waiting' | null = !live
            ? null
            : w.segments.every((s) => s.end.getTime() <= now.getTime())
            ? 'done'
            : w.segments.some((s) => s.start.getTime() <= now.getTime() && s.end.getTime() > now.getTime())
            ? 'active'
            : 'waiting';

          return (
            <div
              key={w.key}
              className={cn(
                'rounded-xl border transition-all duration-300',
                isHighlighted ? 'border-primary/50 bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_0_20px_-4px_hsl(var(--primary)/0.35)]' : 'border-transparent',
                agentStatus === 'done' && 'opacity-55',
              )}
            >
              <div className="flex items-center gap-2 py-1.5 sm:gap-3">
                {/* Identidade do agente */}
                <div className="flex w-[104px] shrink-0 items-center gap-2 sm:w-28">
                  <AgentAvatar name={w.name} avatarUrl={w.avatarUrl} color={rowColor} glow={isHighlighted} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold leading-tight text-foreground">{w.name}</div>
                    {agentStatus && (
                      <span
                        className={cn(
                          'mt-0.5 flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wide',
                          agentStatus === 'done' && 'text-emerald-400',
                          agentStatus === 'active' && 'text-primary',
                          agentStatus === 'waiting' && 'text-muted-foreground',
                        )}
                      >
                        {agentStatus === 'done' && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {agentStatus === 'active' && (
                          <span className="relative flex h-1.5 w-1.5">
                            {!lowMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />}
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                        )}
                        {agentStatus === 'waiting' && <Clock3 className="h-2.5 w-2.5" />}
                        {agentStatus === 'done' ? 'Concluído' : agentStatus === 'active' ? 'Em ronda' : 'Aguardando'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Trilha proporcional */}
                <div className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/40">
                  {w.segments.map((seg, si) => {
                    const left = pct(seg.start.getTime() - rangeStart.getTime(), totalMs);
                    const width = Math.max(1.2, pct(seg.end.getTime() - seg.start.getTime(), totalMs));
                    const segIsPast = live && seg.end.getTime() <= now.getTime();
                    const segIsActive = live && seg.start.getTime() <= now.getTime() && seg.end.getTime() > now.getTime();
                    const elapsedWithinPct = segIsActive ? pct(now.getTime() - seg.start.getTime(), seg.end.getTime() - seg.start.getTime()) : 0;
                    return (
                      <div
                        key={si}
                        className="absolute top-1 bottom-1 overflow-hidden rounded-md"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: segIsPast ? `${rowColor}33` : `${rowColor}cc`,
                          boxShadow: segIsActive && !lowMotion ? `0 0 14px ${rowColor}aa` : undefined,
                        }}
                      >
                        {segIsActive && (
                          <>
                            <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${elapsedWithinPct}%` }} />
                            {!lowMotion && (
                              <div
                                className="absolute inset-0 animate-pulse"
                                style={{ background: `linear-gradient(90deg, transparent, ${rowColor}55, transparent)` }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Cursor "agora" cruzando a trilha */}
                  {showNowCursor && (
                    <div
                      className="absolute inset-y-0 w-px bg-white/90"
                      style={{ left: `${nowPct}%`, boxShadow: lowMotion ? undefined : '0 0 6px rgba(255,255,255,0.85)' }}
                    />
                  )}
                </div>

                {/* Horário + duração — sempre em números grandes e legíveis */}
                <button
                  type="button"
                  disabled={!canExpand}
                  aria-expanded={canExpand ? isExpanded : undefined}
                  aria-label={canExpand ? `${isExpanded ? 'Recolher' : 'Expandir'} detalhes de horário de ${w.name}` : undefined}
                  onClick={() => setExpanded(isExpanded ? null : w.key)}
                  className={cn(
                    'flex w-[126px] shrink-0 items-center justify-between gap-1 rounded-lg px-2 py-1 text-right sm:w-36',
                    canExpand && 'transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  )}
                >
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[12px] font-bold tabular-nums text-foreground">
                      {overallStart && fmtHm(overallStart)}–{overallEnd && fmtHm(overallEnd)}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground">{fmtDuration(w.totalMinutes)}{canExpand ? ` · ${w.segments.length}x` : ''}</div>
                  </div>
                  {canExpand && <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />}
                </button>
              </div>

              {isExpanded && canExpand && (
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pl-[116px] sm:pl-32">
                  {w.segments.map((seg, si) => (
                    <span key={si} className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      <Radio className="h-2.5 w-2.5" style={{ color: rowColor }} />
                      {fmtHm(seg.start)}–{fmtHm(seg.end)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
