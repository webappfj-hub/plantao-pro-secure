import { type ReactNode } from 'react';
import { useLowMotion } from '@/hooks/useLowMotion';

interface TacticalChronometerProps {
  /** 0–100, quanto do período já passou. */
  progressPct: number;
  /** Cor de destaque (ponteiro, arco, brilho) — normalmente a cor da equipe. */
  color: string;
  /** Vermelho de alerta em vez da cor normal, para os últimos instantes. */
  urgent?: boolean;
  size?: number;
  /** Texto grande no centro (ex.: "05:42"). */
  centerLabel: ReactNode;
  topLabel?: string;
  bottomLabel?: string;
}

/**
 * Cronômetro tático — mostrador circular com marcações de escala, ponteiro
 * de varredura e vidro realista, no lugar de um anel de progresso liso.
 * Pensado pra combinar com o resto do painel (radar do cabeçalho, HUD do
 * relógio): um instrumento de verdade, não uma barra de progresso curvada.
 * SVG puro — nenhuma imagem, nenhuma dependência externa.
 */
export function TacticalChronometer({
  progressPct, color, urgent, size = 176, centerLabel, topLabel, bottomLabel,
}: TacticalChronometerProps) {
  const { lowMotion } = useLowMotion();
  const activeColor = urgent ? 'hsl(var(--destructive))' : color;
  const cx = 100;
  const cy = 100;
  const faceR = 88;
  const tickOuterR = 84;
  const angle = (progressPct / 100) * 360;
  const angleRad = ((angle - 90) * Math.PI) / 180;
  const handX = cx + Math.cos(angleRad) * (faceR - 10);
  const handY = cy + Math.sin(angleRad) * (faceR - 10);
  const tipX = cx + Math.cos(angleRad) * tickOuterR;
  const tipY = cy + Math.sin(angleRad) * tickOuterR;

  // Arco de progresso via stroke-dasharray numa trilha logo dentro dos ticks.
  const arcR = 76;
  const arcC = 2 * Math.PI * arcR;
  const arcOffset = arcC * (1 - progressPct / 100);

  const uid = 'tc'; // ids fixos bastam: cada instância vive num <svg> próprio, sem colisão entre irmãos no DOM real do navegador é teórica mas inofensiva aqui.

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id={`${uid}-bezel`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="45%" stopColor="#64748b" />
            <stop offset="55%" stopColor="#334155" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <radialGradient id={`${uid}-face`} cx="42%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#060b16" />
          </radialGradient>
          <radialGradient id={`${uid}-glass`} cx="34%" cy="26%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Bezel metálico */}
        <circle cx={cx} cy={cy} r={96} fill="none" stroke={`url(#${uid}-bezel)`} strokeWidth="7" />
        {/* Mostrador */}
        <circle cx={cx} cy={cy} r={faceR} fill={`url(#${uid}-face)`} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />

        {/* Marcações de escala — 60 traços, maiores a cada 5 (estilo cronômetro) */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i * 6 - 90) * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const rOuter = tickOuterR;
          const rInner = isMajor ? rOuter - 8 : rOuter - 4;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * rInner}
              y1={cy + Math.sin(a) * rInner}
              x2={cx + Math.cos(a) * rOuter}
              y2={cy + Math.sin(a) * rOuter}
              stroke={isMajor ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)'}
              strokeWidth={isMajor ? 1.6 : 0.8}
            />
          );
        })}

        {/* Arco de progresso — trilha + preenchido, com brilho */}
        <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx={cx} cy={cy} r={arcR} fill="none"
          stroke={activeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={arcC}
          strokeDashoffset={arcOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease',
            filter: `drop-shadow(0 0 6px ${activeColor}aa)`,
          }}
        />

        {/* Ponteiro de varredura, como um cronômetro/radar de verdade */}
        <line
          x1={cx} y1={cy} x2={handX} y2={handY}
          stroke={activeColor} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: 'x2 0.6s linear, y2 0.6s linear', filter: `drop-shadow(0 0 4px ${activeColor}cc)` }}
        />
        <circle
          cx={tipX} cy={tipY} r={urgent || lowMotion ? 3 : 3.4}
          fill={activeColor}
          className={!lowMotion ? 'animate-pulse' : undefined}
          style={{ transition: 'cx 0.6s linear, cy 0.6s linear', filter: `drop-shadow(0 0 5px ${activeColor})` }}
        />
        <circle cx={cx} cy={cy} r="4.5" fill="#0f172a" stroke={activeColor} strokeWidth="1.5" />

        {/* Vidro — reflexo diagonal por cima de tudo */}
        <circle cx={cx} cy={cy} r={faceR} fill={`url(#${uid}-glass)`} />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {topLabel && (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/45">{topLabel}</span>
        )}
        <span
          className="font-mono text-2xl font-bold tabular-nums text-white transition-colors"
          style={{ textShadow: `0 0 12px ${activeColor}90` }}
        >
          {centerLabel}
        </span>
        {bottomLabel && <span className="text-[9px] uppercase tracking-wide text-white/40">{bottomLabel}</span>}
      </div>
    </div>
  );
}
