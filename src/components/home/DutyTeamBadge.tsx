import { useEffect, useState } from 'react';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TEAM_ART, TEAM_SLOGANS as SLOGANS, SHIELD_CLIP as SHIELD, CHROME_GRADIENT as CHROME, mascotStyle } from '@/lib/teamArt';

const SWAP_MS = 6500;

/** Equipe de plantão do turno (07h–07h): faixa discreta com filete na cor da
 * equipe, escudo com o mascote e nome que alterna com a frase de impacto.
 * Sem alternância se o usuário reduz movimento (fica o nome). */
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
          className={`relative cursor-default items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-4 ${className ?? ''}`}
          style={{ boxShadow: `inset 3px 0 0 ${color}` }}
        >
          {/* Escudo com o mascote da equipe */}
          <span aria-hidden className="relative z-10 h-10 w-9 shrink-0" style={{ clipPath: SHIELD, background: CHROME, filter: `drop-shadow(0 0 4px ${color}88)` }}>
            <span className="absolute inset-[1.5px]" style={{ clipPath: SHIELD, ...mascotStyle(team) }} />
          </span>

          <span className="relative flex min-w-0 max-w-[75%] flex-col items-center text-center leading-tight">
            <span className="flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: color }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              </span>
              Equipe de plantão
            </span>
            <span key={showMsg ? 'msg' : 'name'} className="mt-0.5 truncate motion-safe:animate-fade-in">
              {showMsg ? (
                <span className="text-[12.5px] italic text-foreground/90">“{SLOGANS[team]}”</span>
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
