import { describe, expect, it } from 'vitest';
import { isMonthClosed, isPastMonth, monthKey } from './monthLock';

const now = new Date(2026, 9, 9); // 09/10/2026

describe('monthLock', () => {
  it('monthKey', () => expect(monthKey(new Date(2026, 8, 20))).toBe('2026-09'));
  it('isPastMonth: só meses anteriores ao atual', () => {
    expect(isPastMonth(new Date(2026, 8, 30), now)).toBe(true);
    expect(isPastMonth(new Date(2025, 11, 1), now)).toBe(true);
    expect(isPastMonth(new Date(2026, 9, 1), now)).toBe(false);
    expect(isPastMonth(new Date(2026, 10, 1), now)).toBe(false);
  });
  it('fecha só mês passado COM registros', () => {
    expect(isMonthClosed(new Date(2026, 8, 1), 3, now)).toBe(true);
    expect(isMonthClosed(new Date(2026, 8, 1), 0, now)).toBe(false);
    expect(isMonthClosed(new Date(2026, 9, 1), 3, now)).toBe(false);
  });
});
