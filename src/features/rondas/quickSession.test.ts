import { describe, expect, it } from 'vitest';
import { quickRoundStatus, type StoredQuickSession } from './quickSession';

const T = Date.UTC(2026, 9, 9, 3, 0); // início do rodízio
const s: StoredQuickSession = { names: ['A', 'B', 'C'], startTime: '22:00', endTime: '01:00', durationMinutes: 180, triggerAt: new Date(T).toISOString(), phase: 'waiting' };

describe('quickRoundStatus', () => {
  it('antes do início: aguardando com contagem', () => {
    expect(quickRoundStatus(s, T - 60_000)).toMatchObject({ kind: 'waiting', msToStart: 60_000, first: 'A' });
  });
  it('troca de agente a cada fatia igual', () => {
    expect(quickRoundStatus(s, T + 10 * 60_000)).toMatchObject({ kind: 'running', agent: 'A', index: 0, next: 'B' });
    expect(quickRoundStatus(s, T + 61 * 60_000)).toMatchObject({ kind: 'running', agent: 'B', index: 1, msLeft: 59 * 60_000 });
  });
  it('terminado ou concluído: nada a mostrar', () => {
    expect(quickRoundStatus(s, T + 180 * 60_000)).toBeNull();
    expect(quickRoundStatus({ ...s, phase: 'done' }, T)).toBeNull();
  });
});

import { fmtClockTime, fmtDuration, needsSeconds } from './quickSession';

describe('divisão curta do tempo', () => {
  it('mostra segundos quando a fatia não é em minutos cheios', () => {
    expect(fmtDuration(30_000)).toBe('30 s');
    expect(fmtDuration(90_000)).toBe('1 min 30 s');
    expect(fmtDuration(36 * 60_000)).toBe('36 min');
    expect(fmtDuration(108 * 60_000)).toBe('1h48');
    expect(needsSeconds(30_000)).toBe(true);
    expect(needsSeconds(108 * 60_000)).toBe(false);
  });
  it('horário com segundos no fuso do Acre', () => {
    const t = Date.UTC(2026, 9, 9, 12, 5, 30); // 07:05:30 no Acre
    expect(fmtClockTime(t)).toBe('07:05');
    expect(fmtClockTime(t, true)).toBe('07:05:30');
  });
});
