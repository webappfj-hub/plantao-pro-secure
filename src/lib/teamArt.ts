import type { CSSProperties } from 'react';
import type { TeamKey } from '@/lib/teamColors';
import teamAlfa from '@/assets/midias/team-alfa.webp';
import teamBravo from '@/assets/midias/team-bravo.webp';
import teamCharlie from '@/assets/midias/team-charlie.webp';
import teamDelta from '@/assets/midias/team-delta.webp';

/** Arte oficial de cada equipe (768×512). `x,y,s` = recorte quadrado do
 * mascote (canto superior esquerdo da arte), em px da arte original. */
export const TEAM_ART: Record<TeamKey, { src: string; x: number; y: number; s: number; lema: string }> = {
  ALFA: { src: teamAlfa, x: 48, y: 38, s: 106, lema: 'Disciplina · Compromisso · Resultados' },
  BRAVO: { src: teamBravo, x: 46, y: 48, s: 110, lema: 'União · Determinação · Evolução' },
  CHARLIE: { src: teamCharlie, x: 50, y: 32, s: 116, lema: 'Atenção · Presença · Proteção' },
  DELTA: { src: teamDelta, x: 50, y: 26, s: 116, lema: 'Planejamento · Disciplina · Resultados' },
};

export const TEAM_SLOGANS: Record<TeamKey, string> = {
  ALFA: 'Na linha de frente, com firmeza e propósito.',
  BRAVO: 'Coragem para proteger, preparo para agir.',
  CHARLIE: 'Atenção total. Nenhum detalhe passa.',
  DELTA: 'Disciplina hoje, futuro amanhã.',
};

/** Estilo de fundo que mostra só o mascote da equipe, recortado da arte. */
export function mascotStyle(team: TeamKey): CSSProperties {
  const a = TEAM_ART[team];
  return {
    backgroundColor: 'rgb(8 12 22)',
    backgroundImage: `url(${a.src})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${(768 / a.s) * 100}% auto`,
    backgroundPosition: `${(a.x / (768 - a.s)) * 100}% ${(a.y / (512 - a.s)) * 100}%`,
  };
}

export const SHIELD_CLIP = 'polygon(50% 0, 100% 13%, 100% 58%, 50% 100%, 0 58%, 0 13%)';
export const CHROME_GRADIENT = 'linear-gradient(135deg, #fbfcfe 0%, #9aa5b4 22%, #eef1f5 45%, #6b7687 70%, #d3dae3 100%)';
