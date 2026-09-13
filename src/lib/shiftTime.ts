import { parseISO } from 'date-fns';

// ⚠️ CRÍTICO: Use getServerDate() para sincronização de hora
// Não use new Date() local pois pode não sincronizar com servidor!
let serverDateGetter: (() => Date) | null = null;

export function setServerDateGetter(getter: () => Date) {
  serverDateGetter = getter;
}

export function getServerDate(): Date {
  return serverDateGetter ? serverDateGetter() : new Date();
}

export interface ShiftLike {
  shift_date: string;
  start_time: string;
  end_time?: string | null;
}

/**
 * Retorna início e fim reais de um plantão respeitando `end_time`.
 * - Se `end_time` ausente ou igual a `start_time`, assume 24h (convenção legada).
 * - Se `end_time` <= `start_time`, considera plantão que cruza meia-noite
 *   (ex.: 19:00→07:00 = 12h).
 * Fonte única de verdade para saber se agente ainda está de plantão.
 */
export function getShiftBounds(shift: ShiftLike): { start: Date; end: Date } {
  const base = parseISO(shift.shift_date);
  const [sh, sm] = shift.start_time.split(':').map((n) => Number(n) || 0);
  const start = new Date(base);
  start.setHours(sh, sm, 0, 0);

  const endStr = shift.end_time && shift.end_time.length >= 4 ? shift.end_time : shift.start_time;
  const [eh, em] = endStr.split(':').map((n) => Number(n) || 0);
  const end = new Date(base);
  end.setHours(eh, em, 0, 0);

  // Mesmo horário → 24h. Fim <= início → cruza a meia-noite.
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export function isShiftActive(shift: ShiftLike, now?: Date): boolean {
  const { start, end } = getShiftBounds(shift);
  const t = (now || getServerDate()).getTime();
  return t >= start.getTime() && t < end.getTime();
}
