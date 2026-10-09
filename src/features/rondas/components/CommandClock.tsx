import { useId } from 'react';
import { useServerClockParts } from '@/hooks/useServerTime';
import { formatClock, type RoundTimerState } from '../useRoundTimer';

interface ActiveRound {
  timer: RoundTimerState;
  sector?: string | null;
  agent?: string | null;
}

const TICKS = Array.from({ length: 60 }, (_, i) => i);
const ARC_R = 68;
const ARC_LEN = 2 * Math.PI * ARC_R;

/**
 * Relógio de comando do Gestor de Rondas — instrumento de aro cromado com
 * escala de 60 marcações. Em repouso mostra a hora oficial do Acre (as
 * marcações acendem com os segundos e o arco mostra o avanço do plantão). Quando há ronda em andamento vira cronômetro: o arco
 * mostra o quanto do quarto já passou e o centro, o tempo restante — âmbar
 * nos últimos 15% ou pausado, vermelho quando estoura. Texto sempre junto da
 * cor (nunca só cor). Hora vem do servidor, nunca do aparelho.
 */
export function CommandClock({ color, active, shiftProgress }: {
  color: string;
  active?: ActiveRound | null;
  /** 0–100: quanto do plantão (07h–07h) já passou — o arco mostra isso em repouso. */
  shiftProgress?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const { hours, minutes, seconds, date } = useServerClockParts();
  const pad = (n: number) => String(n).padStart(2, '0');

  let tone = color;
  // Em repouso: marcações acendem com os segundos e o arco mostra o plantão.
  let pct = shiftProgress ?? (seconds / 60) * 100;
  let top = 'Horário oficial · Acre';
  let big = `${pad(hours)}:${pad(minutes)}`;
  let small: string | null = pad(seconds);
  let bottom = date
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Rio_Branco' })
    .replace(/\./g, '')
    .toUpperCase();

  if (active) {
    const t = active.timer;
    const remainingPct = t.totalSeconds > 0 ? t.secondsRemaining / t.totalSeconds : 0;
    const overdue = t.isOverdue || t.isLate;
    tone = overdue ? '#ef4444' : t.isPaused || remainingPct <= 0.15 ? '#f59e0b' : color;
    pct = t.progressPct;
    top = t.isPaused ? 'Ronda pausada' : overdue ? 'Tempo excedido' : 'Ronda em andamento';
    big = overdue ? `+${formatClock(Math.max(0, t.secondsElapsed - t.totalSeconds))}` : formatClock(t.secondsRemaining);
    small = null;
    bottom = `Decorrido ${formatClock(t.secondsElapsed)} de ${formatClock(t.totalSeconds)}`;
  }

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={active ? `${top}: ${big}` : `Hora oficial do Acre ${big}`}
      className="relative mx-auto aspect-square w-[210px] shrink-0 sm:w-[236px]"
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`bz-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbfcfe" />
            <stop offset="0.28" stopColor="#8f9aaa" />
            <stop offset="0.5" stopColor="#eef1f5" />
            <stop offset="0.74" stopColor="#5f6a7b" />
            <stop offset="1" stopColor="#d3dae3" />
          </linearGradient>
          <radialGradient id={`fc-${uid}`} cx="0.5" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#1e2a3f" />
            <stop offset="1" stopColor="#060b16" />
          </radialGradient>
          <linearGradient id={`gl-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* aro cromado + face */}
        <circle cx="100" cy="100" r="99" fill={`url(#bz-${uid})`} />
        <circle cx="100" cy="100" r="92" fill="#03070f" />
        <circle cx="100" cy="100" r="90" fill={`url(#fc-${uid})`} />

        {/* escala de 60 marcações */}
        {TICKS.map((i) => {
          const major = i % 5 === 0;
          const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const r1 = major ? 76 : 80;
          const r2 = 86;
          const lit = !active && i <= seconds;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
              stroke={lit ? tone : '#cbd5e1'}
              strokeOpacity={lit ? 0.95 : major ? 0.7 : 0.25}
              strokeWidth={major ? 2 : 0.9}
              strokeLinecap="round"
            />
          );
        })}

        {/* trilho + arco de progresso */}
        <circle cx="100" cy="100" r={ARC_R} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="3" />
        <circle
          cx="100" cy="100" r={ARC_R} fill="none"
          stroke={tone} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * ARC_LEN} ${ARC_LEN}`}
          transform="rotate(-90 100 100)"
          style={{ filter: `drop-shadow(0 0 4px ${tone})`, transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }}
        />

        {/* reflexo do vidro */}
        <path d="M18 100 A82 82 0 0 1 182 100 Q100 70 18 100 Z" fill={`url(#gl-${uid})`} />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: tone }}>
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: tone }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          </span>
          {top}
        </span>
        <span className="flex items-baseline gap-1 font-mono font-bold tabular-nums">
          <span
            className="text-[2.35rem] sm:text-[2.6rem]"
            style={{
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #dbe3ee 50%, #9aa7b8 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 0 10px ${tone}66)`,
            }}
          >
            {big}
          </span>
          {small && <span className="text-base font-semibold" style={{ color: tone }}>{small}</span>}
        </span>
        <span className="mt-2 max-w-[150px] truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-300/80">{bottom}</span>
        {active?.sector && (
          <span className="mt-1 max-w-[150px] truncate text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/90">{active.sector}</span>
        )}
      </div>
    </div>
  );
}
