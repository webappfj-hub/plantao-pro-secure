import { formatAcreDateTimeLocal, parseAcreDateTimeLocal } from '@/hooks/useServerTime';

/** "HH:MM" na hora de parede do Acre para um instante. */
export function acreHM(iso: string): string {
  return formatAcreDateTimeLocal(new Date(iso)).slice(11, 16);
}

/**
 * Novo intervalo [início, fim] trocando só o horário (HH:MM, hora do Acre) e
 * mantendo o dia do horário original. Se o fim ficar antes/igual ao início,
 * ele passa para o dia seguinte (quartos que atravessam a meia-noite).
 */
export function retimeSlot(baseStartIso: string, startHM: string, endHM: string): { start: Date; end: Date } {
  const day = formatAcreDateTimeLocal(new Date(baseStartIso)).slice(0, 10);
  const start = parseAcreDateTimeLocal(`${day}T${startHM}`);
  let end = parseAcreDateTimeLocal(`${day}T${endHM}`);
  if (end <= start) end = new Date(end.getTime() + 86_400_000);
  return { start, end };
}
