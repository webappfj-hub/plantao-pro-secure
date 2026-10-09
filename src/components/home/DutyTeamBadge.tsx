import { useEffect, useState } from 'react';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import teamAlfa from '@/assets/midias/team-alfa.webp';
import teamBravo from '@/assets/midias/team-bravo.webp';
import teamCharlie from '@/assets/midias/team-charlie.webp';
import teamDelta from '@/assets/midias/team-delta.webp';

// Cada arte (768×512) traz o mascote da equipe no canto superior esquerdo.
// `x,y,s` = recorte quadrado do mascote em px da arte original.
const TEAM_ART: Record<TeamKey, { src: string; x: number; y: number; s: number; lema: string }> = {
  ALFA: { src: teamAlfa, x: 48, y: 38, s: 106, lema: 'Disciplina · Compromisso · Resultados' },
  BRAVO: { src: teamBravo, x: 46, y: 48, s: 110, lema: 'União · Determinação · Evolução' },
  CHARLIE: { src: teamCharlie, x: 50, y: 32, s: 116, lema: 'Atenção · Presença · Proteção' },
  DELTA: { src: teamDelta, x: 50, y: 26, s: 116, lema: 'Planejamento · Disciplina · Resultados' },
};

const SLOGANS: Record<TeamKey, string> = {
  ALFA: 'Na linha de frente, com firmeza e propósito.',
  BRAVO: 'Coragem para proteger, preparo para agir.',
  CHARLIE: 'Atenção total. Nenhum detalhe passa.',
  DELTA: 'Disciplina hoje, futuro amanhã.',
};

/** Arte própria da faixa (segurança pública), feita para caber na largura e na
 * altura do painel: grade tática, régua de marcações em cima/baixo, faixas de
 * alerta nas pontas, luz de viatura alternando e radares nas duas extremidades.
 * Camadas em CSS/SVG — sem foto esticada. */
function StripArt({ color }: { color: string }) {
  const arcs = [14, 26, 38, 50];
  const radar = (side: 'left' | 'right') => (
    <svg
      aria-hidden
      viewBox="-60 -60 120 120"
      className={`absolute top-1/2 h-[120px] w-[120px] -translate-y-1/2 ${side === 'left' ? '-left-[62px]' : '-right-[62px]'}`}
      style={{ color }}
    >
      {arcs.map((r) => <circle key={r} r={r} fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.8" />)}
      <line x1="-58" x2="58" y1="0" y2="0" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.6" />
      <line y1="-58" y2="58" x1="0" x2="0" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.6" />
      <g className="duty-sweep" style={{ transformOrigin: '0 0' }}>
        <path d="M0 0 L52 0 A52 52 0 0 0 36.8 -36.8 Z" fill="currentColor" fillOpacity="0.22" />
        <line x1="0" y1="0" x2="52" y2="0" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1" />
      </g>
    </svg>
  );
  const stripes = (dir: 'left' | 'right') => (
    <span
      aria-hidden
      className={`absolute inset-y-0 w-8 ${dir === 'left' ? 'left-0' : 'right-0'}`}
      style={{
        backgroundImage: `repeating-linear-gradient(135deg, ${color}26 0 5px, transparent 5px 10px), linear-gradient(${dir === 'left' ? '90deg' : '270deg'}, rgb(8 12 22 / 0) 0%, rgb(8 12 22) 100%)`,
      }}
    />
  );
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {/* grade tática */}
      <span className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${color}14 1px, transparent 1px), linear-gradient(90deg, ${color}14 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
      {/* brilho central */}
      <span className="absolute inset-0" style={{ background: `radial-gradient(60% 140% at 50% 50%, ${color}1f 0%, transparent 70%)` }} />
      {radar('left')}
      {radar('right')}
      {stripes('left')}
      {stripes('right')}
      {/* luz de viatura: alterna esquerda/direita */}
      <span className="duty-beacon-l absolute inset-y-0 left-0 w-16" style={{ background: `linear-gradient(90deg, ${color}55, transparent)` }} />
      <span className="duty-beacon-r absolute inset-y-0 right-0 w-16" style={{ background: `linear-gradient(270deg, ${color}55, transparent)` }} />
      {/* régua de marcações */}
      <span className="absolute inset-x-0 top-0 h-[4px]" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${color}66 0 1px, transparent 1px 8px)` }} />
      <span className="absolute inset-x-0 bottom-0 h-[4px]" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${color}66 0 1px, transparent 1px 8px)` }} />
    </span>
  );
}

const SHIELD = 'polygon(50% 0, 100% 13%, 100% 58%, 50% 100%, 0 58%, 0 13%)';
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
          className={`relative cursor-default items-center justify-center gap-3 overflow-hidden rounded-lg border px-3 ${className ?? ''}`}
          style={{
            borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
            boxShadow: `0 6px 20px -10px ${color}, inset 0 1px 0 rgb(255 255 255 / 0.1)`,
            backgroundColor: 'rgb(8 12 22)',
          }}
        >
          <StripArt color={color} />

          {/* Escudo com o mascote da equipe */}
          <span aria-hidden className="relative h-10 w-9 shrink-0" style={{ clipPath: SHIELD, background: color }}>
            <span
              className="absolute inset-[1.5px]"
              style={{
                clipPath: SHIELD,
                backgroundColor: 'rgb(8 12 22)',
                backgroundImage: `url(${art.src})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${(768 / art.s) * 100}% auto`,
                backgroundPosition: `${(art.x / (768 - art.s)) * 100}% ${(art.y / (512 - art.s)) * 100}%`,
              }}
            />
          </span>

          <span className="relative flex min-w-0 max-w-[75%] flex-col items-center text-center leading-tight">
            <span className="flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/60">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full opacity-70 motion-safe:animate-ping" style={{ background: color }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              </span>
              Equipe de plantão
            </span>
            <span key={showMsg ? 'msg' : 'name'} className="mt-0.5 truncate motion-safe:animate-fade-in">
              {showMsg ? (
                <span className="text-[12px] font-medium italic text-white/90">“{SLOGANS[team]}”</span>
              ) : (
                <span className="text-[15px] font-bold uppercase tracking-[0.16em]" style={{ color }}>{team}</span>
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
