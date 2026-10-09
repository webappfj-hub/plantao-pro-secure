/** Sessão do Modo Rápido como o Gestor de Rondas grava no storage do aparelho. */
export interface StoredQuickSession {
  names: string[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  triggerAt: string;
  phase: 'waiting' | 'running' | 'done';
}

export type QuickRoundStatus =
  | { kind: 'waiting'; startsAt: number; msToStart: number; first: string; count: number }
  | { kind: 'running'; agent: string; index: number; count: number; sliceStart: number; sliceEnd: number; msLeft: number; next: string | null };

export const quickSessionKey = (unitId: string, team: string) => `quick-rounds-session-${unitId}-${team}`;

/** Lê a sessão do Modo Rápido (localStorage para agente logado, sessionStorage
 * para visitante — o mesmo critério do Gestor). */
export function readQuickSession(unitId: string, team: string): StoredQuickSession | null {
  const key = quickSessionKey(unitId, team);
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(key);
      if (raw) return JSON.parse(raw) as StoredQuickSession;
    } catch { /* ignore */ }
  }
  return null;
}

/** Situação do rodízio no instante `now` — mesma conta do Gestor (tempo
 * dividido igualmente entre os agentes a partir de `triggerAt`). */
export function quickRoundStatus(s: StoredQuickSession | null, now: number): QuickRoundStatus | null {
  if (!s || s.phase === 'done' || s.names.length === 0) return null;
  const trigger = new Date(s.triggerAt).getTime();
  const total = s.durationMinutes * 60_000;
  const per = total / s.names.length;
  if (now < trigger) {
    return { kind: 'waiting', startsAt: trigger, msToStart: trigger - now, first: s.names[0], count: s.names.length };
  }
  const elapsed = now - trigger;
  if (elapsed >= total) return null;
  const index = Math.min(Math.floor(elapsed / per), s.names.length - 1);
  const sliceStart = trigger + index * per;
  return {
    kind: 'running',
    agent: s.names[index],
    index,
    count: s.names.length,
    sliceStart,
    sliceEnd: sliceStart + per,
    msLeft: sliceStart + per - now,
    next: s.names[index + 1] ?? null,
  };
}

/** Duração legível: "1h48", "36 min". */
export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
