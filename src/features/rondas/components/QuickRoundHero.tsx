import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Hourglass, Square, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { TEAM_ART, CHROME_GRADIENT } from '@/lib/teamArt';
import { InstrumentDial } from './CommandClock';

const FINAL_COUNTDOWN_MS = 10 * 60_000;

const hm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });

function fmtClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** Duração legível: "1h48", "36 min". */
function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

interface Props {
  team: string | null;
  names: string[];
  phase: 'waiting' | 'running';
  now: number;
  triggerMs: number;
  perAgentMs: number;
  totalMs: number;
  onStop: () => void;
  actions?: ReactNode;
}

/**
 * Rodízio do Modo Rápido em destaque — mesma linguagem da central de
 * operação: moldura cromada, arte da equipe ao fundo, mostrador de
 * instrumento no centro. Aguardando: contagem regressiva até o início.
 * Em ronda: tempo restante do agente atual e, nos 10 minutos finais do
 * período, uma contagem de encerramento em destaque. Abaixo, a escala com
 * cada agente, seu horário e duração — o agente atual realçado.
 */
export function QuickRoundHero({ team, names, phase, now, triggerMs, perAgentMs, totalMs, onStop, actions }: Props) {
  const key: TeamKey = team && team in TEAM_ART ? (team as TeamKey) : 'ALFA';
  const color = TEAM_COLORS[key].hex;
  const n = names.length;
  const running = phase === 'running';
  const elapsed = running ? Math.max(0, now - triggerMs) : 0;
  const current = running ? Math.min(Math.floor(elapsed / perAgentMs), n - 1) : -1;
  const endMs = triggerMs + totalMs;
  const totalRemaining = endMs - now;

  // Mostrador
  let dial: Parameters<typeof InstrumentDial>[0];
  if (!running) {
    const toStart = triggerMs - now;
    const inLastHour = toStart <= 3_600_000;
    dial = {
      tone: toStart <= 60_000 ? '#f59e0b' : color,
      pct: inLastHour ? (1 - toStart / 3_600_000) * 100 : 0,
      litTicks: inLastHour ? 60 - Math.ceil(toStart / 60_000) : undefined,
      top: 'Inicia em',
      big: fmtClock(toStart),
      bottom: `Início às ${hm(triggerMs)}`,
      extra: names[0] ? `1º · ${names[0]}` : null,
      urgent: toStart <= 60_000,
      ariaLabel: `Rodízio inicia em ${fmtClock(toStart)}, às ${hm(triggerMs)}`,
    };
  } else {
    const sliceElapsed = elapsed - current * perAgentMs;
    const sliceLeft = perAgentMs - sliceElapsed;
    const tone = sliceLeft <= 60_000 ? '#ef4444' : sliceLeft <= perAgentMs * 0.15 ? '#f59e0b' : color;
    const last = current === n - 1;
    dial = {
      tone,
      pct: (sliceElapsed / perAgentMs) * 100,
      top: `Em ronda · ${current + 1}/${n}`,
      big: fmtClock(sliceLeft),
      bottom: last ? `Fim às ${hm(endMs)}` : `Troca às ${hm(triggerMs + (current + 1) * perAgentMs)}`,
      extra: names[current],
      urgent: sliceLeft <= 60_000,
      ariaLabel: `${names[current]} em ronda, faltam ${fmtClock(sliceLeft)}`,
    };
  }

  const nextIdx = running ? current + 1 : 0;
  const finalCountdown = running && totalRemaining <= FINAL_COUNTDOWN_MS;
  const critical = totalRemaining <= 60_000;

  return (
    <section
      aria-label={`Rodízio da equipe ${key} — ${running ? 'em ronda' : 'aguardando início'}`}
      className="relative rounded-2xl p-[2px] shadow-[0_18px_50px_-24px_rgb(0_0_0/0.8)] animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      style={{ background: CHROME_GRADIENT }}
    >
      <div className="relative overflow-hidden rounded-t-[14px] bg-[#070c18] text-white">
        <img
          src={TEAM_ART[key].src}
          alt=""
          aria-hidden
          decoding="async"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[200%] max-w-none select-none object-cover object-[100%_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgb(7 12 24 / 0.97) 0%, rgb(7 12 24 / 0.86) 45%, rgb(7 12 24 / 0.62) 100%)' }}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        {/* Barra superior */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/30 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em]',
                running ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/40 bg-amber-400/10 text-amber-300',
              )}
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping', running ? 'bg-emerald-400' : 'bg-amber-400')} />
                <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', running ? 'bg-emerald-400' : 'bg-amber-400')} />
              </span>
              {running ? 'Em ronda' : 'Aguardando início'}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Modo rápido · rodízio</span>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              size="sm"
              variant="outline"
              onClick={onStop}
              className="h-9 gap-1.5 border-rose-400/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> Parar rodízio
            </Button>
          </div>
        </div>

        <div className="relative grid items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Resumo do rodízio (a equipe já aparece na faixa de comando) */}
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">Período do rodízio</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">{hm(triggerMs)} → {hm(endMs)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-slate-300">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> {n} agente{n !== 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden /> {fmtDuration(perAgentMs)} cada</span>
            </p>
          </div>

          <InstrumentDial {...dial} className="relative mx-auto aspect-square w-[172px] shrink-0" />

          {/* Próximo agente */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm lg:justify-self-end lg:w-[240px]">
            {nextIdx < n ? (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-400">{running ? 'Próximo agente' : 'Primeiro agente'}</p>
                <p className="mt-1 truncate text-lg font-bold text-white">{names[nextIdx]}</p>
                <p className="font-mono text-sm tabular-nums text-slate-200">
                  {hm(triggerMs + nextIdx * perAgentMs)} – {hm(triggerMs + (nextIdx + 1) * perAgentMs)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-400">Último agente</p>
                <p className="mt-1 text-sm text-slate-200">Após este turno o rodízio se encerra às <span className="font-mono font-bold text-white">{hm(endMs)}</span>.</p>
              </>
            )}
          </div>
        </div>

        {/* Contagem final do período */}
        {finalCountdown && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'relative flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-6',
              critical ? 'border-rose-400/40 bg-rose-500/20 motion-safe:animate-pulse' : 'border-amber-400/40 bg-amber-500/15',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]">
              <Hourglass className={cn('h-4 w-4', critical ? 'text-rose-300' : 'text-amber-300')} aria-hidden />
              Encerramento do período
            </span>
            <span className={cn('font-mono text-2xl font-bold tabular-nums', critical ? 'text-rose-200' : 'text-amber-200')}>
              {fmtClock(totalRemaining)}
            </span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className={cn('h-full rounded-full', critical ? 'bg-rose-400' : 'bg-amber-400')} style={{ width: `${(1 - totalRemaining / FINAL_COUNTDOWN_MS) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Progresso geral */}
        {running && !finalCountdown && (
          <div className="relative border-t border-white/10 px-4 py-2.5 sm:px-6">
            <div className="mb-1 flex justify-between text-[11px] text-slate-300">
              <span>Progresso do período</span>
              <span className="font-mono tabular-nums">{fmtClock(elapsed)} / {fmtClock(totalMs)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (elapsed / totalMs) * 100)}%`, background: color }} />
            </div>
          </div>
        )}
      </div>

      {/* Escala do rodízio */}
      <div className="rounded-b-[14px] bg-card text-card-foreground">
        <div className="flex items-center justify-between px-4 pb-1 pt-4 sm:px-6">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide">Escala do rodízio</h3>
          <span className="text-xs text-muted-foreground">{fmtDuration(perAgentMs)} por agente</span>
        </div>
        <ol className="grid gap-1.5 px-4 pb-4 pt-2 sm:px-6 xl:grid-cols-2">
          {names.map((name, i) => {
            const s = triggerMs + i * perAgentMs;
            const e = s + perAgentMs;
            const done = running && i < current;
            const now_ = running && i === current;
            const pct = now_ ? ((elapsed - i * perAgentMs) / perAgentMs) * 100 : 0;
            return (
              <li
                key={`${name}-${i}`}
                aria-current={now_ ? 'step' : undefined}
                className={cn(
                  'relative overflow-hidden rounded-lg border px-3 py-2',
                  now_ ? 'border-primary/50 bg-primary/10' : 'border-border bg-background/40',
                  done && 'opacity-70',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: done ? '#10b981' : now_ ? color : '#475569' }}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</span>
                  <span className="font-mono text-base font-bold tabular-nums">{hm(s)} – {hm(e)}</span>
                  <span className="hidden w-16 text-right text-xs text-muted-foreground sm:inline">{fmtDuration(perAgentMs)}</span>
                  <span
                    className={cn(
                      'hidden rounded-full border px-2 py-0.5 text-[10.5px] font-semibold md:inline',
                      done ? 'border-emerald-500/40 text-emerald-400' : now_ ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    {done ? 'Concluído' : now_ ? 'Em ronda' : 'Aguardando'}
                  </span>
                </div>
                {now_ && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/15">
                    <div className="h-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
