import { describe, expect, it } from 'vitest';
import { getDutyTeam } from './dutyTeam';

// 07h em Rio Branco = 12h UTC
const at = (d: number, utcH: number) => new Date(Date.UTC(2026, 9, d, utcH));

describe('getDutyTeam', () => {
  it('troca às 07h, não à meia-noite', () => {
    expect(getDutyTeam(at(8, 12)).team).toBe('DELTA');   // 08/10 07h
    expect(getDutyTeam(at(9, 11)).team).toBe('DELTA');   // 09/10 06h59 ainda DELTA
    expect(getDutyTeam(at(9, 12)).team).toBe('ALFA');    // 09/10 07h
    expect(getDutyTeam(at(8, 5)).team).toBe('CHARLIE');  // 08/10 00h local = turno anterior
  });
  it('segue DELTA → ALFA → BRAVO → CHARLIE → DELTA', () => {
    expect([8, 9, 10, 11, 12].map((d) => getDutyTeam(at(d, 18)).team)).toEqual(['DELTA', 'ALFA', 'BRAVO', 'CHARLIE', 'DELTA']);
  });
  it('conta o tempo até a troca', () => {
    expect(getDutyTeam(at(8, 17)).msToChange).toBe(19 * 3_600_000);
  });
});
