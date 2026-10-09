import { useCallback, useEffect, useState } from 'react';

/** "2026-09" para a data. */
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** O mês de `d` já terminou em relação a `now` (qualquer mês antes do mês atual). */
export const isPastMonth = (d: Date, now: Date = new Date()) =>
  d.getFullYear() < now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth());

/** Mês fechado = já passou E tem registros. Mês sem registro não trava (nada a proteger). */
export const isMonthClosed = (month: Date, recordsInMonth: number, now: Date = new Date()) =>
  recordsInMonth > 0 && isPastMonth(month, now);

/**
 * Meses desbloqueados pelo usuário nesta sessão do navegador (sessionStorage):
 * destravar exige confirmação, vale até fechar a aba e volta a travar depois.
 */
export function useMonthUnlocks(storageKey: string) {
  const read = () => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set<string>(); }
  };
  const [unlocked, setUnlocked] = useState<Set<string>>(read);
  useEffect(() => { setUnlocked(read()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storageKey]);

  const persist = (next: Set<string>) => {
    setUnlocked(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
  };
  const unlock = useCallback((key: string) => persist(new Set(unlocked).add(key)), [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps
  const relock = useCallback((key: string) => { const n = new Set(unlocked); n.delete(key); persist(n); }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps
  return { isUnlocked: (key: string) => unlocked.has(key), unlock, relock };
}
