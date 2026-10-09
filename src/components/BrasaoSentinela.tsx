import { CSSProperties, useId } from "react";

interface BrasaoSentinelaProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
  title?: string;
}

const SHIELD_OUTER = "M100 8 L178 30 L178 112 Q178 156 100 194 Q22 156 22 112 L22 30 Z";
const SHIELD_FACE = "M100 19 L168 38 L168 111 Q168 149 100 183 Q32 149 32 111 L32 38 Z";

/**
 * Símbolo oficial PlantãoPro AC — distintivo metálico (aro cromado, esmalte
 * azul, "P" cromado e estrela dourada), com brilho que varre o escudo de
 * tempos em tempos. SVG inline: nítido em qualquer tamanho. O "P" fica
 * inteiro dentro da área útil do escudo (que estreita embaixo).
 */
export function BrasaoSentinela({
  size = 96,
  className,
  style,
  animated = false,
  title = "PlantãoPro — Instituto Socioeducativo do Acre",
}: BrasaoSentinelaProps) {
  const dim = typeof size === "number" ? `${size}px` : size;
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${uid}`;

  const composedStyle: CSSProperties = {
    width: dim,
    height: dim,
    filter: "drop-shadow(0 6px 14px rgba(2,8,23,0.45))",
    ...(animated
      ? {
          animation:
            "brasaoIn 900ms cubic-bezier(.22,1,.36,1) both, brasaoFloat 6s ease-in-out 900ms infinite",
        }
      : {}),
    ...style,
  };

  return (
    <>
      <svg viewBox="0 0 200 200" role="img" aria-label={title} className={className} style={composedStyle}>
        <title>{title}</title>
        <defs>
          <linearGradient id={id("bezel")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbfcfe" />
            <stop offset="0.28" stopColor="#9aa5b4" />
            <stop offset="0.5" stopColor="#eef1f5" />
            <stop offset="0.74" stopColor="#6b7687" />
            <stop offset="1" stopColor="#d3dae3" />
          </linearGradient>
          <radialGradient id={id("face")} cx="0.5" cy="0.28" r="0.85">
            <stop offset="0" stopColor="#2a62c0" />
            <stop offset="0.55" stopColor="#0f2f69" />
            <stop offset="1" stopColor="#071a3f" />
          </radialGradient>
          <linearGradient id={id("chrome")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.34" stopColor="#c7d0db" />
            <stop offset="0.5" stopColor="#8995a5" />
            <stop offset="0.66" stopColor="#e9eef4" />
            <stop offset="1" stopColor="#a9b3c0" />
          </linearGradient>
          <linearGradient id={id("red")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2566a" />
            <stop offset="1" stopColor="#9f1a2a" />
          </linearGradient>
          <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff4b8" />
            <stop offset="0.5" stopColor="#e2b232" />
            <stop offset="1" stopColor="#a87a0a" />
          </linearGradient>
          <linearGradient id={id("spec")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={id("clip")}><path d={SHIELD_OUTER} /></clipPath>
        </defs>

        {/* Aro cromado + esmalte */}
        <path d={SHIELD_OUTER} fill={`url(#${id("bezel")})`} />
        <path d={SHIELD_OUTER} fill="none" stroke="#3b4658" strokeOpacity="0.55" strokeWidth="1.2" />
        <path d={SHIELD_FACE} fill={`url(#${id("face")})`} />
        <path d={SHIELD_FACE} fill="none" stroke="#04122d" strokeOpacity="0.7" strokeWidth="2" />
        <path d={SHIELD_FACE} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.8" transform="translate(0 0.8)" />

        {/* Estrela dourada */}
        <path d="M100.00,30.00 L102.70,37.28 L110.46,37.60 L104.37,42.42 L106.47,49.90 L100.00,45.60 L93.53,49.90 L95.63,42.42 L89.54,37.60 L97.30,37.28 Z" fill={`url(#${id("gold")})`} stroke="#7a560a" strokeWidth="0.6" strokeLinejoin="round" />

        {/* "P" cromado — escalado para caber na área útil do escudo */}
        <g transform="translate(100 112) scale(0.7) translate(-90 -102)">
          <g fill={`url(#${id("chrome")})`} stroke="#566173" strokeWidth="1.4" strokeLinejoin="round">
            <rect x="55" y="45" width="35" height="115" rx="7" />
          </g>
          <path
            d="M 84.67 54.67 A 33 33 0 1 1 84.67 101.33"
            fill="none"
            stroke="#566173"
            strokeWidth="33"
            strokeLinecap="round"
          />
          <path
            d="M 84.67 54.67 A 33 33 0 1 1 84.67 101.33"
            fill="none"
            stroke={`url(#${id("chrome")})`}
            strokeWidth="30"
            strokeLinecap="round"
          />
          <path d="M 55 128 L 88 160 L 55 160 Z" fill={`url(#${id("red")})`} stroke="#6e1220" strokeWidth="1" strokeLinejoin="round" />
        </g>

        {/* Reflexo especular fixo (metade superior do esmalte) */}
        <path d="M32 38 L100 19 L168 38 L168 78 Q100 58 32 96 Z" fill={`url(#${id("spec")})`} />

        {/* Brilho que varre o escudo */}
        <g clipPath={`url(#${id("clip")})`}>
          <rect className="brasao-sheen" x="-70" y="-10" width="46" height="220" fill={`url(#${id("sheen")})`} transform="skewX(-18)" />
        </g>
      </svg>
      {animated && (
        <style>{`
          @keyframes brasaoIn {
            0%   { opacity: 0; transform: scale(0.82) translateY(6px); }
            60%  { opacity: 1; transform: scale(1.03) translateY(-1px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes brasaoFloat {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-3px); }
          }
        `}</style>
      )}
    </>
  );
}

export default BrasaoSentinela;
