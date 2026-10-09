import { useEffect, useState } from 'react';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TEAM_ART, TEAM_SLOGANS as SLOGANS, SHIELD_CLIP as SHIELD, CHROME_GRADIENT as CHROME, mascotStyle } from '@/lib/teamArt';

const PLATE = 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))';
const PLATE_IN = 'polygon(0 0, calc(100% - 11px) 0, 100% 11px, 100% 100%, 11px 100%, 0 calc(100% - 11px))';

/** Face da placa metálica: aço escuro escovado, tom da equipe, reflexo no topo,
 * parafusos nos cantos e brilho que varre a placa — mesma linguagem do brasão. */
function MetalFace({ color }: { color: string }) {
  const rivet = (pos: string) => (
    <span
      className={`absolute h-[5px] w-[5px] rounded-full ${pos}`}
      style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff, #8c97a6 55%, #3a4352)', boxShadow: '0 0 0 0.5px rgb(0 0 0 / 0.6)' }}
    />
  );
  return (
    <span aria-hidden className="pointer-events-none absolute inset-[2px] overflow-hidden" style={{ clipPath: PLATE_IN }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #243044 0%, #121a2a 48%, #090e1a 100%)' }} />
      {/* tom da equipe */}
      <span className="absolute inset-0" style={{ background: `radial-gradient(70% 160% at 50% 0%, ${color}33 0%, transparent 70%)` }} />
      {/* aço escovado */}
      <span className="absolute inset-0 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 3px)' }} />
      {/* reflexo no topo + sombra embaixo */}
      <span className="absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(180deg, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0))' }} />
      <span className="absolute inset-x-0 bottom-0 h-px bg-black/60" />
      {rivet('left-[7px] top-[5px]')}
      {rivet('right-[16px] top-[5px]')}
      {rivet('left-[7px] bottom-[5px]')}
      {rivet('right-[16px] bottom-[5px]')}
      <span className="duty-sheen absolute inset-y-0 left-0 w-1/5 motion-reduce:hidden" />
    </span>
  );
}

const SWAP_MS = 6500;

/** Equipe de plantão do turno (07h–07h): painel de vidro escuro com a arte da
 * equipe ao fundo, escudo com o mascote real, nome que alterna com a frase de
 * impacto. Sem alternância se o usuário reduz movimento (fica o nome). */
export function DutyTeamBadge({ className }: { className?: string }) {
  const now = useServerTime(60_000);
  const { team, next, msToChange } = getDutyTeam(now);
  const [showMsg, setShowMsg] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setShowMsg((v) => !v), SWAP_MS);
    return () => clearInterval(id);
  }, []);

  const color = TEAM_COLORS[team].hex;
  const art = TEAM_ART[team];
  const h = Math.floor(msToChange / 3_600_000);
  const m = Math.floor((msToChange % 3_600_000) / 60_000);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative cursor-default items-center justify-center gap-3 px-4 ${className ?? ''}`}
          style={{ clipPath: PLATE, background: CHROME }}
        >
          <MetalFace color={color} />

          {/* Escudo com o mascote da equipe */}
          <span aria-hidden className="relative z-10 h-10 w-9 shrink-0" style={{ clipPath: SHIELD, background: CHROME, filter: `drop-shadow(0 0 4px ${color}88)` }}>
            <span className="absolute inset-[1.5px]" style={{ clipPath: SHIELD, ...mascotStyle(team) }} />
          </span>

          <span className="relative flex min-w-0 max-w-[75%] flex-col items-center text-center leading-tight">
            <span className="flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300/80">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: color }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              </span>
              Equipe de plantão
            </span>
            <span key={showMsg ? 'msg' : 'name'} className="mt-0.5 truncate motion-safe:animate-fade-in">
              {showMsg ? (
                <span className="text-[12px] font-medium italic text-slate-100 [text-shadow:0_1px_0_rgb(0_0_0/0.6)]">“{SLOGANS[team]}”</span>
              ) : (
                <span
                  className="text-[15px] font-extrabold uppercase tracking-[0.16em]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${color} 55%, color-mix(in srgb, ${color} 55%, #000) 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 0 rgb(0 0 0 / 0.6))',
                  }}
                >{team}</span>
              )}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="font-semibold">Equipe {team} · plantão das 07h às 07h</div>
        <div className="text-muted-foreground">{art.lema}</div>
        <div className="text-muted-foreground">Troca em {h}h{String(m).padStart(2, '0')} · próxima: {next}</div>
      </TooltipContent>
    </Tooltip>
  );
}
