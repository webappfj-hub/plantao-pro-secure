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

export interface InstrumentDialProps {
  /** Cor de destaque (arco, marcações acesas, rótulo). */
  tone: string;
  /** 0–100 do arco. */
  pct: number;
  /** Quantas das 60 marcações acendem (ex.: segundos). Omitido = nenhuma. */
  litTicks?: number;
  top: string;
  big: string;
  small?: string | null;
  bottom?: string;
  extra?: string | null;
  /** Último minuto/urgência: anel pulsa (respeita reduced-motion). */
  urgent?: boolean;
  ariaLabel: string;
  className?: string;
}

/**
 * Mostrador de instrumento — aro cromado, face escura, escala de 60
 * marcações, arco de progresso e reflexo de vidro. Puramente visual: quem
 * usa decide o que o arco e o centro representam (hora, cronômetro,
 * contagem regressiva). Texto sempre acompanha a cor.
 */
export function InstrumentDial({ tone, pct, litTicks, top, big, small, bottom, extra, urgent, ariaLabel, className }: InstrumentDialProps) {
  const uid = useId().replace(/:/g, '');
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={ariaLabel}
      className={className ?? 'relative mx-auto aspect-square w-[210px] shrink-0 sm:w-[236px]'}
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

        <circle cx="100" cy="100" r="99" fill={`url(#bz-${uid})`} />
        <circle cx="100" cy="100" r="92" fill="#03070f" />
        <circle cx="100" cy="100" r="90" fill={`url(#fc-${uid})`} />
        {urgent && (
          <circle cx="100" cy="100" r="90" fill="none" stroke={tone} strokeWidth="2" className="motion-safe:animate-pulse" opacity="0.8" />
        )}

        {TICKS.map((i) => {
          const major = i % 5 === 0;
          const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const r1 = major ? 76 : 80;
          const lit = litTicks != null && i <= litTicks;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
              x2={100 + 86 * Math.cos(a)} y2={100 + 86 * Math.sin(a)}
              stroke={lit ? tone : '#cbd5e1'}
              strokeOpacity={lit ? 0.95 : major ? 0.7 : 0.25}
              strokeWidth={major ? 2 : 0.9}
              strokeLinecap="round"
            />
          );
        })}

        <circle cx="100" cy="100" r={ARC_R} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="3" />
        <circle
          cx="100" cy="100" r={ARC_R} fill="none"
          stroke={tone} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(Math.min(100, Math.max(0, pct)) / 100) * ARC_LEN} ${ARC_LEN}`}
          transform="rotate(-90 100 100)"
          style={{ filter: `drop-shadow(0 0 4px ${tone})`, transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }}
        />
        <path d="M18 100 A82 82 0 0 1 182 100 Q100 70 18 100 Z" fill={`url(#gl-${uid})`} />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="mb-2 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em]" style={{ color: tone }}>
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: tone }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          </span>
          {top}
        </span>
        <span className="flex items-baseline gap-1 font-mono font-bold tabular-nums">
          <span
            className="text-[2.2rem] sm:text-[2.5rem]"
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
        {bottom && <span className="mt-2 max-w-[150px] truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">{bottom}</span>}
        {extra && <span className="mt-1 max-w-[150px] truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90">{extra}</span>}
      </div>
    </div>
  );
}

/**
 * Relógio de comando do Gestor de Rondas. Em repouso mostra a hora oficial do
 * Acre (marcações acendem com os segundos; arco = avanço do plantão). Com
 * ronda em andamento vira cronômetro do tempo restante — âmbar nos últimos
 * 15% ou pausado, vermelho quando estoura. Hora do servidor, nunca do aparelho.
 */
export function CommandClock({ color, active, shiftProgress }: {
  color: string;
  active?: ActiveRound | null;
  /** 0–100: quanto do plantão (07h–07h) já passou — o arco mostra isso em repouso. */
  shiftProgress?: number;
}) {
  const { hours, minutes, seconds, date } = useServerClockParts();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (active) {
    const t = active.timer;
    const remainingPct = t.totalSeconds > 0 ? t.secondsRemaining / t.totalSeconds : 0;
    const overdue = t.isOverdue || t.isLate;
    const tone = overdue ? '#ef4444' : t.isPaused || remainingPct <= 0.15 ? '#f59e0b' : color;
    const top = t.isPaused ? 'Ronda pausada' : overdue ? 'Tempo excedido' : 'Ronda em andamento';
    const big = overdue ? `+${formatClock(Math.max(0, t.secondsElapsed - t.totalSeconds))}` : formatClock(t.secondsRemaining);
    return (
      <InstrumentDial
        tone={tone}
        pct={t.progressPct}
        top={top}
        big={big}
        bottom={`Decorrido ${formatClock(t.secondsElapsed)} de ${formatClock(t.totalSeconds)}`}
        extra={active.sector}
        urgent={overdue || (!t.isPaused && t.secondsRemaining <= 60)}
        ariaLabel={`${top}: ${big}`}
      />
    );
  }

  const big = `${pad(hours)}:${pad(minutes)}`;
  return (
    <InstrumentDial
      tone={color}
      pct={shiftProgress ?? (seconds / 60) * 100}
      litTicks={seconds}
      top="Horário oficial · Acre"
      big={big}
      small={pad(seconds)}
      bottom={date
        .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Rio_Branco' })
        .replace(/\./g, '')
        .toUpperCase()}
      ariaLabel={`Hora oficial do Acre ${big}`}
    />
  );
}
