import { useEffect, useState, type ReactNode } from 'react';
import { Building2, RadioTower, WifiOff } from 'lucide-react';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { TEAM_ART, TEAM_SLOGANS, SHIELD_CLIP, CHROME_GRADIENT, mascotStyle } from '@/lib/teamArt';
import { CommandClock } from './CommandClock';
import type { RoundTimerState } from '../useRoundTimer';

const DAY_MS = 86_400_000;
const isTeam = (t: string | null | undefined): t is TeamKey => !!t && t in TEAM_ART;

interface Props {
  team?: string | null;
  unitName?: string | null;
  /** Ronda em andamento agora (qualquer agente) — o relógio vira cronômetro. */
  active?: { timer: RoundTimerState; sector?: string | null; agent?: string | null } | null;
  children?: ReactNode;
}

/**
 * Central de operação do Gestor de Rondas — cabeçalho em moldura cromada com
 * a arte da equipe de plantão ao fundo (escurecida para leitura), escudo com o
 * mascote, nome em metal, lema/frase, janela do plantão (07h–07h) com contagem
 * até a troca e o relógio de comando no centro. A faixa de ações do turno
 * (children) fica embutida embaixo.
 */
export function RoundsCommandCenter({ team, unitName, active, children }: Props) {
  const now = useServerTime(30_000);
  const duty = getDutyTeam(now);
  const shown: TeamKey = isTeam(team) ? team : duty.team;
  const color = TEAM_COLORS[shown].hex;
  const art = TEAM_ART[shown];
  const fromPreviousShift = shown !== duty.team;
  const h = Math.floor(duty.msToChange / 3_600_000);
  const m = Math.floor((duty.msToChange % 3_600_000) / 60_000);
  const shiftProgress = Math.min(100, Math.max(0, (1 - duty.msToChange / DAY_MS) * 100));

  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <section
      aria-label={`Central de operação — Equipe ${shown}`}
      className="relative rounded-2xl p-[2px] shadow-[0_18px_50px_-24px_rgb(0_0_0/0.8)]"
      style={{ background: CHROME_GRADIENT }}
    >
      <div className="relative overflow-hidden rounded-[14px] bg-[#070c18] text-white">
        {/* Arte da equipe ao fundo (lado direito), escurecida para leitura */}
        {/* Só a metade direita da arte (equipe em campo): a esquerda traz o
            nome/lema impressos, que duplicariam o texto do painel. */}
        <img
          src={art.src}
          alt=""
          aria-hidden
          decoding="async"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[200%] max-w-none select-none object-cover object-[100%_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              `radial-gradient(60% 90% at 50% 45%, rgb(7 12 24 / 0.55), transparent 75%),` +
              `linear-gradient(90deg, rgb(7 12 24 / 0.97) 0%, rgb(7 12 24 / 0.88) 38%, rgb(7 12 24 / 0.7) 62%, rgb(7 12 24 / 0.5) 100%)`,
          }}
        />
        {/* Grade tática fina + tom da equipe */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `linear-gradient(${color}12 1px, transparent 1px), linear-gradient(90deg, ${color}12 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        {/* Faixa superior: identificação do console */}
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrasaoSentinela size={26} title="Gestor de Rondas — PlantãoPro AC" />
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-200">
              Central de operação <span className="text-white/40">·</span> <span className="text-slate-400">Gestor de rondas</span>
            </span>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em] ${online ? 'text-emerald-400' : 'text-amber-400'}`}>
            {online ? (
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            ) : <WifiOff className="h-3 w-3" aria-hidden />}
            {online ? 'Operante' : 'Sem conexão'}
          </span>
        </div>

        <div className="relative grid items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
          {/* Equipe de plantão */}
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="relative h-[84px] w-[74px] shrink-0"
              style={{ clipPath: SHIELD_CLIP, background: CHROME_GRADIENT, filter: `drop-shadow(0 0 10px ${color}77)` }}
            >
              <span className="absolute inset-[2.5px]" style={{ clipPath: SHIELD_CLIP, ...mascotStyle(shown) }} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300/85">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
                {fromPreviousShift ? 'Plantão anterior · em ronda' : 'Equipe de plantão'}
              </p>
              <h2
                className="mt-1 text-[2.1rem] font-extrabold uppercase leading-none tracking-[0.12em] sm:text-[2.5rem]"
                style={{
                  backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${color} 58%, color-mix(in srgb, ${color} 55%, #000) 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 0 rgb(0 0 0 / 0.55))',
                }}
              >
                {shown}
              </h2>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300/80">{art.lema}</p>
              <p className="mt-1 text-[12.5px] italic text-white/90">“{TEAM_SLOGANS[shown]}”</p>
            </div>
          </div>

          {/* Relógio de comando */}
          <CommandClock color={color} active={active} shiftProgress={shiftProgress} />

          {/* Situação do plantão */}
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:justify-self-end">
            <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
              <dt className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">Plantão</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">07:00 → 07:00</dd>
              <dd className="text-[11px] text-slate-300">
                Troca em <span className="font-semibold text-white">{h}h{String(m).padStart(2, '0')}</span> · próxima {duty.next}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
              <dt className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <Building2 className="h-3 w-3" aria-hidden /> Unidade
              </dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-white">{unitName ?? 'Unidade selecionada'}</dd>
              <dd className="flex items-center gap-1 text-[11px] text-slate-300">
                <RadioTower className="h-3 w-3" aria-hidden /> {active ? `Em ronda${active.agent ? ` · ${active.agent}` : ''}` : 'Sem ronda em curso'}
              </dd>
            </div>
          </dl>
        </div>

        {children && (
          <div className="relative border-t border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur-md sm:px-5">{children}</div>
        )}
      </div>
    </section>
  );
}
