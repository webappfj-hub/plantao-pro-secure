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
