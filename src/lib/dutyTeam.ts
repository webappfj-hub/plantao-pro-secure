import type { TeamKey } from '@/lib/teamColors';

/** Escala de plantão: uma equipe por turno de 24h, das 07h às 07h (Rio Branco, UTC−5 fixo),
 * em ciclo DELTA → ALFA → BRAVO → CHARLIE. Âncora: 08/10/2026 às 07h = DELTA. */
export const DUTY_ORDER: readonly TeamKey[] = ['DELTA', 'ALFA', 'BRAVO', 'CHARLIE'];

const DAY = 86_400_000;
const SHIFT_START_UTC = 12 * 3_600_000; // 07h em Rio Branco = 12h UTC
const ANCHOR_IDX = Math.floor(Date.UTC(2026, 9, 8) / DAY);

export function getDutyTeam(now: Date): { team: TeamKey; next: TeamKey; msToChange: number } {
  const idx = Math.floor((now.getTime() - SHIFT_START_UTC) / DAY);
  const i = (((idx - ANCHOR_IDX) % 4) + 4) % 4;
  return {
    team: DUTY_ORDER[i],
    next: DUTY_ORDER[(i + 1) % 4],
    msToChange: (idx + 1) * DAY + SHIFT_START_UTC - now.getTime(),
  };
}
