import { describe, expect, it } from 'vitest';
import { acreHM, retimeSlot } from './scheduleTime';

// 08/10/2026 22:00 no Acre (UTC−5) = 09/10 03:00 UTC
const base = '2026-10-09T03:00:00.000Z';

describe('retimeSlot', () => {
  it('lê e grava na hora de parede do Acre', () => {
    expect(acreHM(base)).toBe('22:00');
    const { start, end } = retimeSlot(base, '22:15', '22:45');
    expect(start.toISOString()).toBe('2026-10-09T03:15:00.000Z');
    expect(end.toISOString()).toBe('2026-10-09T03:45:00.000Z');
  });
  it('fim antes do início passa para o dia seguinte (meia-noite)', () => {
    const { start, end } = retimeSlot(base, '23:45', '00:15');
    expect(end.getTime() - start.getTime()).toBe(30 * 60_000);
  });
});
