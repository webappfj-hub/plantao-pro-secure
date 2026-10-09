import { useEffect, useState, type ReactNode } from 'react';
import { Building2, WifiOff } from 'lucide-react';
import { useServerClockParts, useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { TEAM_ART, SHIELD_CLIP, CHROME_GRADIENT, mascotStyle } from '@/lib/teamArt';
import { formatClock, type RoundTimerState } from '../useRoundTimer';
import heroBanner from '@/assets/midias/hero-banner.webp';

const isTeam = (t: string | null | undefined): t is TeamKey => !!t && t in TEAM_ART;

interface Props {
  team?: string | null;
  unitName?: string | null;
  /** Ronda em andamento agora (qualquer agente) — o relógio da faixa vira o tempo restante dela. */
  active?: { timer: RoundTimerState; sector?: string | null; agent?: string | null } | null;
  children?: ReactNode;
}

/**
 * Faixa de comando do Gestor de Rondas — compacta (uma linha em telas largas),
 * com a arte da equipe de plantão ao fundo: escudo + equipe + lema, um único
 * relógio digital (hora oficial; vira tempo restante quando há ronda ativa),
 * janela do plantão e unidade. Mostradores grandes ficam só onde há ação
 * (rodízio/ronda), para não repetir relógio na tela.
 */
export function RoundsCommandCenter({ team, unitName, active, children }: Props) {
  const now = useServerTime(30_000);
  const duty = getDutyTeam(now);
  const shown: TeamKey = isTeam(team) ? team : duty.team;
  const color = TEAM_COLORS[shown].hex;
  const art = TEAM_ART[shown];
  const { hours, minutes, seconds, date } = useServerClockParts();
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(duty.msToChange / 3_600_000);
  const m = Math.floor((duty.msToChange % 3_600_000) / 60_000);

  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const t = active?.timer;
  const overdue = !!t && (t.isOverdue || t.isLate);
  const clockTone = t ? (overdue ? '#ef4444' : t.isPaused ? '#f59e0b' : color) : color;

  return (
    <section
      aria-label={`Central de operação — Equipe ${shown}`}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-[#070c18] text-white shadow-[0_12px_32px_-20px_rgb(0_0_0/0.8)]"
    >
      {/* Fundo institucional (unidade + mapa do Acre + brasão) em largura total —
          diferente da arte da equipe usada no painel do rodízio logo abaixo. */}
      <img
        src={heroBanner}
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[50%_42%]"
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_12_24/0.92)_0%,rgb(7_12_24/0.72)_40%,rgb(7_12_24/0.45)_70%,rgb(7_12_24/0.3)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
        {/* Equipe */}
        <div className="flex min-w-[12rem] flex-1 items-center gap-3">
          <span aria-hidden className="relative h-12 w-[42px] shrink-0" style={{ clipPath: SHIELD_CLIP, background: CHROME_GRADIENT, filter: `drop-shadow(0 0 6px ${color}66)` }}>
            <span className="absolute inset-[2px]" style={{ clipPath: SHIELD_CLIP, ...mascotStyle(shown) }} />
          </span>
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {shown === duty.team ? 'Equipe de plantão' : 'Plantão anterior · em ronda'}
            </p>
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold uppercase leading-none tracking-[0.1em]" style={{ color }}>{shown}</span>
              <span className="hidden truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300 md:inline">{art.lema}</span>
            </p>
          </div>
        </div>

        {/* Relógio único — módulo de tempo: rótulo, dígitos grandes com
            separador piscando, barra que varre os segundos (ou o quarto). */}
        {(() => {
          const pct = t ? t.progressPct : (seconds / 60) * 100;
          const label = t ? (t.isPaused ? 'Ronda pausada' : overdue ? 'Tempo excedido' : 'Ronda · tempo restante') : 'Hora oficial · Acre';
          const sub = t
            ? (active?.agent ? `${active.agent}${active.sector ? ` · ${active.sector}` : ''}` : active?.sector ?? 'Em andamento')
            : `${date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Rio_Branco' })} · UTC−5`;
          const digits = t
            ? (overdue ? `+${formatClock(Math.max(0, t.secondsElapsed - t.totalSeconds))}` : formatClock(t.secondsRemaining))
            : null;
          return (
            <div
              role="timer"
              aria-live="off"
              aria-label={t ? `${label}: ${digits}` : `Hora oficial do Acre ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
              className="relative w-full overflow-hidden rounded-lg border border-white/12 bg-black/45 px-4 pb-2.5 pt-2 backdrop-blur-sm sm:w-[260px]"
              style={{ boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 0 0 1px ${clockTone}22` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: clockTone }}>
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: clockTone }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: clockTone }} />
                  </span>
                  {label}
                </span>
                {!t && <span className="font-mono text-[10px] font-semibold text-slate-500">SYNC</span>}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1 font-mono font-bold tabular-nums leading-none">
                {digits ? (
                  <span className="text-[2.4rem] text-white" style={{ textShadow: `0 0 20px ${clockTone}55` }}>{digits}</span>
                ) : (
                  <>
                    <span className="text-[2.4rem] text-white" style={{ textShadow: `0 0 20px ${clockTone}44` }}>{pad(hours)}</span>
                    <span className="live-clock-colon text-[2rem]" style={{ color: clockTone }}>:</span>
                    <span className="text-[2.4rem] text-white" style={{ textShadow: `0 0 20px ${clockTone}44` }}>{pad(minutes)}</span>
                    <span className="ml-1 w-[2ch] text-lg text-slate-300">{pad(seconds)}</span>
                  </>
                )}
              </div>
              <p className="mt-1 truncate text-center text-[10.5px] capitalize text-slate-400">{sub}</p>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.06]" aria-hidden>
                <div className="h-full transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%`, background: clockTone, boxShadow: `0 0 8px ${clockTone}` }} />
              </div>
            </div>
          );
        })()}

        {/* Plantão + unidade + estado */}
        <dl className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-md border border-white/10 bg-black/35 px-3 py-1.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Plantão 07→07</dt>
            <dd className="text-slate-200">Troca em <b className="text-white">{h}h{pad(m)}</b> · {duty.next}</dd>
          </div>
          <div className="rounded-md border border-white/10 bg-black/35 px-3 py-1.5">
            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"><Building2 className="h-3 w-3" aria-hidden /> Unidade</dt>
            <dd className="max-w-[10rem] truncate font-semibold text-white">{unitName ?? 'Selecionada'}</dd>
          </div>
          <span className={`flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.16em] ${online ? 'text-emerald-400' : 'text-amber-400'}`}>
            {online ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden /> : <WifiOff className="h-3 w-3" aria-hidden />}
            {online ? 'Operante' : 'Offline'}
          </span>
        </dl>
      </div>

      {children && <div className="relative border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md sm:px-5">{children}</div>}
    </section>
  );
}
