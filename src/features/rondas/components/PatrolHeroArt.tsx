import { cn } from '@/lib/utils';

interface PatrolHeroArtProps {
  color?: string;
  className?: string;
}

/**
 * Ilustração de fundo (vigilância / segurança pública / socioeducativo) para
 * ocupar o espaço vazio dos cartões do rodízio: torre de observação, câmera
 * de CCTV com feixe de varredura, agente em ronda e grade de pontos —
 * tudo em traço vetorial fino, low-opacity, no mesmo idioma visual do
 * RadarSweep/BrasaoSentinela já usados no app. Puramente decorativo.
 */
export function PatrolHeroArt({ color = 'hsl(var(--primary))', className }: PatrolHeroArtProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* Grade de pontos — textura de fundo */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`, backgroundSize: '18px 18px' }}
      />

      <svg
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.13]"
      >
        <defs>
          {/* Fade radial centrado no relógio — a arte preenche as bordas dos
              dois lados por igual e só se apaga perto do texto/mostrador. */}
          <radialGradient id="patrolFade" cx="50%" cy="56%" r="46%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="70%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </radialGradient>
          <radialGradient id="patrolBeamFade" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <mask id="patrolMask">
            <rect x="0" y="0" width="640" height="360" fill="url(#patrolFade)" />
          </mask>
        </defs>

        <g mask="url(#patrolMask)" stroke={color} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke">
          {/* Horizonte / linha de base do perímetro */}
          <line x1="0" y1="300" x2="640" y2="300" strokeOpacity="0.5" />

          {/* Torre de observação */}
          <g transform="translate(430 96)" strokeLinejoin="round" strokeLinecap="round">
            <path d="M-10 204 L-26 0 L26 0 L10 204" />
            <line x1="-20" y1="150" x2="20" y2="150" />
            <line x1="-16" y1="96" x2="16" y2="96" />
            <line x1="-26" y1="0" x2="-10" y2="204" strokeOpacity="0.6" />
            <line x1="26" y1="0" x2="10" y2="204" strokeOpacity="0.6" />
            <rect x="-34" y="-34" width="68" height="34" rx="2" />
            <line x1="-34" y1="-14" x2="34" y2="-14" strokeOpacity="0.6" />
            {/* Holofote/câmera no topo da torre */}
            <circle cx="0" cy="-46" r="8" fill={color} fillOpacity="0.18" />
            <circle cx="0" cy="-46" r="8" />
            <path d="M0 -46 L120 -108" strokeOpacity="0.7" />
            <path d="M0 -46 L120 8" strokeOpacity="0.35" />
          </g>
          {/* Feixe do holofote (cone preenchido, mais sutil) */}
          <path d="M430 50 L640 -14 L640 62 Z" fill="url(#patrolBeamFade)" stroke="none" />

          {/* Câmera de CCTV no canto */}
          <g transform="translate(56 40) rotate(8)" strokeLinejoin="round" strokeLinecap="round">
            <rect x="0" y="10" width="58" height="30" rx="6" />
            <path d="M8 10 L14 -6 H44 L50 10" />
            <circle cx="20" cy="25" r="9" />
            <circle cx="20" cy="25" r="3" fill={color} fillOpacity="0.4" />
            <line x1="58" y1="18" x2="80" y2="10" />
            <line x1="58" y1="32" x2="80" y2="40" />
          </g>

          {/* Agente em ronda (silhueta simplificada) */}
          <g transform="translate(150 220)" strokeLinejoin="round" strokeLinecap="round">
            <circle cx="0" cy="-46" r="10" />
            <path d="M0 -36 L0 6" />
            <path d="M0 -26 L-18 -10" />
            <path d="M0 -26 L20 -34 L26 -20" />
            <path d="M0 6 L-14 46" />
            <path d="M0 6 L16 46" />
            <path d="M20 -34 L34 -40" strokeOpacity="0.6" />
          </g>

          {/* Anéis de radar decorativos ao fundo, à esquerda */}
          <g transform="translate(150 220)" strokeOpacity="0.35">
            <circle cx="0" cy="0" r="60" />
            <circle cx="0" cy="0" r="96" />
          </g>

          {/* Cerca / perímetro estilizado */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map((x) => (
            <line key={x} x1={x} y1="300" x2={x + 14} y2="270" strokeOpacity="0.3" />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default PatrolHeroArt;
