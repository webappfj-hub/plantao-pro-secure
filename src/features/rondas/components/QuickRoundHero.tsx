import type { ReactNode } from 'react';
import { ArrowRightLeft, CheckCircle2, Clock3, Hourglass, ShieldCheck, Square, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { TEAM_ART, CHROME_GRADIENT } from '@/lib/teamArt';
import { InstrumentDial } from './CommandClock';
import { fmtClockTime, fmtDuration, needsSeconds } from '../quickSession';

const FINAL_COUNTDOWN_MS = 10 * 60_000;


function fmtClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
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
  const precise = needsSeconds(perAgentMs);
  const hm = (ms: number) => fmtClockTime(ms, precise);
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
  const sliceElapsedMs = running ? elapsed - current * perAgentMs : 0;
  const sliceLeftMs = running ? perAgentMs - sliceElapsedMs : 0;
  const isLast = running && current === n - 1;
  // Passagem de turno: aviso aos 2 min, contagem em destaque nos 20 s finais,
  // boas-vindas ao novo agente nos primeiros 10 s da vez dele.
  const handoffWarn = running && !isLast && sliceLeftMs <= 120_000 && sliceLeftMs > 20_000;
  const handoffCount = running && sliceLeftMs <= 20_000;
  const welcome = running && sliceElapsedMs < 10_000;
  const finalCountdown = running && totalRemaining <= FINAL_COUNTDOWN_MS;
  const critical = totalRemaining <= 60_000;

  return (
    <section
      aria-label={`Rodízio da equipe ${key} — ${running ? 'em ronda' : 'aguardando início'}`}
      className="relative rounded-2xl p-[2px] shadow-[0_18px_50px_-24px_rgb(0_0_0/0.8)] animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      style={{ background: CHROME_GRADIENT }}
    >
      <div className="relative overflow-hidden rounded-t-[14px] bg-[#070c18] text-white">
        {/* Fundo vetorial tático (sem foto): degradê azul-marinho, grade fina,
            malha de hexágonos e faixas diagonais na cor da equipe. */}
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(115deg, #0a1122 0%, #0d1830 45%, #0a1326 100%)' }} />
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='48' viewBox='0 0 28 48'><path d='M14 0 28 8v16L14 32 0 24V8zM14 32l14 8v16M14 32 0 40v16' fill='none' stroke='#8fb4ff' stroke-opacity='0.07' stroke-width='1'/></svg>",
            )}")`,
            backgroundSize: '28px 48px',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgb(143 180 255 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(143 180 255 / 0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div aria-hidden className="absolute inset-y-0 right-[24%] w-36 -skew-x-[24deg] opacity-[0.16]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 140% at 0% 50%, ${color}1f, transparent 60%)` }} />
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
          {running ? (
            /* Agente na ronda — nome grande, equipe e janela da vez dele */
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Agente na ronda · {current + 1}/{n}</p>
              <p key={names[current]} className="mt-1 truncate text-3xl font-extrabold leading-tight text-white animate-fade-in sm:text-4xl">{names[current]}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em]" style={{ background: `${color}22`, color }}>Equipe {key}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-200">{hm(triggerMs + current * perAgentMs)} – {hm(triggerMs + (current + 1) * perAgentMs)}</span>
              </p>
              <p className="mt-2 text-xs text-slate-400">Tempo de cada agente <span className="ml-1 text-base font-bold text-white">{fmtDuration(perAgentMs)}</span></p>
            </div>
          ) : (
            /* Divisão do tempo em destaque */
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Cada agente fica</p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none" style={{ color }}>{fmtDuration(perAgentMs)}</p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-white">{hm(triggerMs)} → {hm(endMs)}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-slate-300">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> {n} agente{n !== 1 ? 's' : ''}</span>
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden /> total {fmtDuration(totalMs)}</span>
              </p>
            </div>
          )}

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

        {/* Aviso de troca de turno (2 min) */}
        {handoffWarn && (
          <div role="status" aria-live="polite" className="relative flex flex-wrap items-center justify-between gap-2 border-t border-amber-400/40 bg-amber-500/15 px-4 py-2.5 sm:px-6">
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-amber-200">
              <ArrowRightLeft className="h-4 w-4" aria-hidden /> Troca de turno em <span className="font-mono tabular-nums">{fmtClock(sliceLeftMs)}</span>
            </span>
            <span className="text-sm text-amber-100">Prepare-se: <b className="text-white">{names[current + 1]}</b> assume às {hm(triggerMs + (current + 1) * perAgentMs)}</span>
          </div>
        )}

        {/* Contagem final da passagem (20 s) */}
        {handoffCount && (
          <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#070c18]/85 text-center backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-300">{isLast ? 'Encerramento do rodízio' : 'Troca de turno'}</p>
            <p key={Math.ceil(sliceLeftMs / 1000)} className="font-mono text-7xl font-extrabold tabular-nums text-rose-400 motion-safe:animate-in motion-safe:zoom-in-95 sm:text-8xl" style={{ textShadow: '0 0 30px rgb(244 63 94 / 0.6)' }}>
              {Math.max(0, Math.ceil(sliceLeftMs / 1000))}
            </p>
            <p className="text-sm text-slate-200">
              {isLast ? <>Fim do rodízio às <b className="text-white">{hm(endMs)}</b></> : <><b className="text-white">{names[current]}</b> passa para <b className="text-white">{names[current + 1]}</b></>}
            </p>
          </div>
        )}

        {/* Boas-vindas ao novo agente */}
        {welcome && !handoffCount && (
          <div role="status" aria-live="polite" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#070c18]/90 px-4 text-center backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0">
            <ShieldCheck className="h-10 w-10" style={{ color }} aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">{current === 0 ? 'Rodízio iniciado' : 'Passagem de turno concluída'}</p>
            <p className="text-3xl font-extrabold text-white sm:text-4xl">Bem-vindo(a), {names[current]}</p>
            <p className="text-sm text-slate-200">
              Equipe <b style={{ color }}>{key}</b> · sua ronda vai de <b className="font-mono text-white">{hm(triggerMs + current * perAgentMs)}</b> a <b className="font-mono text-white">{hm(triggerMs + (current + 1) * perAgentMs)}</b> ({fmtDuration(perAgentMs)}). Bom serviço!
            </p>
          </div>
        )}

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
                  <span className="w-14 text-right text-sm font-bold tabular-nums text-foreground">{fmtDuration(perAgentMs)}</span>
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
