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

/** Duração legível, com segundos quando a conta não fecha em minutos:
 * "30 s", "1 min 30 s", "36 min", "1h48". */
export function fmtDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  }
  const min = Math.round(sec / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Fatias curtas ou quebradas (ex.: 30 s) precisam de segundos para o horário não parecer errado. */
export const needsSeconds = (perAgentMs: number) => perAgentMs % 60_000 !== 0 || perAgentMs < 300_000;

/** Horário no fuso do Acre — HH:MM, ou HH:MM:SS quando `withSeconds`. */
export function fmtClockTime(ms: number, withSeconds = false): string {
  return new Date(ms).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}), timeZone: 'America/Rio_Branco',
  });
}

// ---------- Histórico local (visitante sem login) ----------
// Só neste aparelho: guarda os últimos rodízios concluídos. Agente logado grava no banco.

export interface LocalHistoryRow {
  id: string;
  agent_names: string[];
  duration_minutes: number;
  per_agent_minutes: number;
  started_at: string;
  completed_at: string;
}

export const LOCAL_HISTORY_LIMIT = 4;
const historyKey = (unitId: string | null, team: string | null) => `quick-rounds-history-${unitId ?? 'x'}-${team ?? 'x'}`;

export function readLocalHistory(unitId: string | null, team: string | null): LocalHistoryRow[] {
  try {
    const raw = localStorage.getItem(historyKey(unitId, team));
    const rows = raw ? (JSON.parse(raw) as LocalHistoryRow[]) : [];
    return Array.isArray(rows) ? rows.slice(0, LOCAL_HISTORY_LIMIT) : [];
  } catch { return []; }
}

/** Adiciona no topo e mantém só os `LOCAL_HISTORY_LIMIT` mais recentes. */
export function addLocalHistory(unitId: string | null, team: string | null, row: Omit<LocalHistoryRow, 'id'>): LocalHistoryRow[] {
  const next = [{ ...row, id: `${row.completed_at}-${row.agent_names.join('|')}` }, ...readLocalHistory(unitId, team)]
    .filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i)
    .slice(0, LOCAL_HISTORY_LIMIT);
  try { localStorage.setItem(historyKey(unitId, team), JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearLocalHistory(unitId: string | null, team: string | null): void {
  try { localStorage.removeItem(historyKey(unitId, team)); } catch { /* ignore */ }
}
