/**
 * Validação de conflitos de plantões
 * Garante que agentes não tenham dois plantões no mesmo horário
 */

import { getShiftBounds } from './shiftTime';

export interface ShiftLike {
  shift_date: string;
  start_time: string;
  end_time?: string | null;
}

export interface ShiftWithAgent extends ShiftLike {
  id?: string;
  agent_id?: string;
}

/**
 * Verifica se dois plantões se sobrepõem
 */
export function shiftsOverlap(shift1: ShiftLike, shift2: ShiftLike): boolean {
  const { start: s1, end: e1 } = getShiftBounds(shift1);
  const { start: s2, end: e2 } = getShiftBounds(shift2);

  // Dois intervalos não se sobrepõem se um acaba antes do outro começar
  return !(e1 <= s2 || e2 <= s1);
}

/**
 * Encontra conflitos de um novo plantão com existentes
 */
export function findShiftConflicts(
  newShift: ShiftWithAgent,
  existingShifts: ShiftWithAgent[]
): ShiftWithAgent[] {
  if (!newShift.agent_id) return [];

  return existingShifts.filter((existing) => {
    // Mesmo agente?
    if (existing.agent_id !== newShift.agent_id) return false;

    // Mesmo plantão (edit)?
    if (newShift.id && existing.id === newShift.id) return false;

    // Há sobreposição temporal?
    return shiftsOverlap(newShift, existing);
  });
}

/**
 * Gera mensagem de erro para conflito
 */
export function getConflictMessage(conflicts: ShiftWithAgent[]): string {
  if (conflicts.length === 0) return '';

  const conflictDates = conflicts
    .map((s) => s.shift_date)
    .join(', ');

  if (conflicts.length === 1) {
    return `Conflito com plantão em ${conflictDates}. Agente já está escalado neste horário.`;
  }

  return `Conflito com ${conflicts.length} plantões: ${conflictDates}. Revise a escalação.`;
}

/**
 * Valida um novo plantão contra a lista existente
 * Retorna { valid: boolean; message: string }
 */
export function validateNewShift(
  newShift: ShiftWithAgent,
  existingShifts: ShiftWithAgent[]
): { valid: boolean; message: string } {
  const conflicts = findShiftConflicts(newShift, existingShifts);

  if (conflicts.length > 0) {
    return {
      valid: false,
      message: getConflictMessage(conflicts),
    };
  }

  return { valid: true, message: '' };
}

/**
 * Filtro para remover plantões conflitantes (útil para UI)
 * Mantém plantões importantes, remove duplicatas
 */
export function deduplicateShifts(shifts: ShiftWithAgent[]): ShiftWithAgent[] {
  const unique: ShiftWithAgent[] = [];
  const seen = new Set<string>();

  shifts.forEach((shift) => {
    const key = `${shift.agent_id}-${shift.shift_date}-${shift.start_time}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(shift);
    }
  });

  return unique;
}
