import { useEffect, useState } from 'react';
import { Crosshair, Radio, Shield, Target, type LucideIcon } from 'lucide-react';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ICONS: Record<TeamKey, LucideIcon> = { ALFA: Shield, BRAVO: Target, CHARLIE: Crosshair, DELTA: Radio };

const SLOGANS: Record<TeamKey, string> = {
  ALFA: 'Na linha de frente, com firmeza e propósito.',
  BRAVO: 'Coragem para proteger, preparo para agir.',
  CHARLIE: 'Atenção total. Nenhum detalhe passa.',
  DELTA: 'Disciplina hoje, futuro amanhã.',
};

const SWAP_MS = 6500;

/** Equipe de plantão do turno (07h–07h): emblema na cor da equipe + nome que
 * alterna com a frase de impacto. Sem alternância animada se o usuário
 * reduz movimento (fica o nome). */
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
  const Icon = ICONS[team];
  const h = Math.floor(msToChange / 3_600_000);
  const m = Math.floor((msToChange % 3_600_000) / 60_000);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex min-w-0 cursor-default items-center gap-3 ${className ?? ''}`} style={{ ['--duty' as string]: color }}>
          {/* Emblema: escudo com ícone da equipe, brilho discreto na cor dela */}
          <span
            aria-hidden
            className="relative flex h-10 w-9 shrink-0 items-center justify-center"
            style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--duty) 45%, transparent))' }}
          >
            <svg viewBox="0 0 36 40" className="absolute inset-0 h-full w-full">
              <path
                d="M18 1.5 33.5 7v13.2c0 9-6.6 15.4-15.5 18.3C9.1 35.6 2.5 29.2 2.5 20.2V7L18 1.5Z"
                fill="color-mix(in srgb, var(--duty) 14%, transparent)"
                stroke="var(--duty)"
                strokeWidth="1.6"
              />
            </svg>
            <Icon className="duty-ink relative h-4 w-4" style={{ color }} strokeWidth={2.3} />
          </span>

          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Equipe de plantão</span>
            <span key={showMsg ? 'msg' : 'name'} className="mt-0.5 max-w-[260px] truncate motion-safe:animate-fade-in">
              {showMsg ? (
                <span className="text-[12px] font-medium italic text-foreground">“{SLOGANS[team]}”</span>
              ) : (
                <span className="duty-ink text-[15px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{team}</span>
              )}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="font-semibold">Plantão das 07h às 07h</div>
        <div className="text-muted-foreground">Troca em {h}h{String(m).padStart(2, '0')} · próxima: {next}</div>
      </TooltipContent>
    </Tooltip>
  );
}
