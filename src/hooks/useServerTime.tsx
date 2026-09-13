import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Relógio global sincronizado com a rede (não confia no horário do sistema local).
 *
 * Fonte primária: RPC `get_server_now()` no backend (Lovable Cloud).
 * Fallback: HTTP `Date` header retornado pelo próprio endpoint Supabase (mesma origem).
 *
 * Todo o app compartilha o mesmo offset em memória (module-scope),
 * então múltiplos consumidores não disparam múltiplas sincronizações.
 */

// O relógio exibido NÃO deve avançar com Date.now(), porque Date.now() é
// exatamente a hora de parede do dispositivo. Depois da primeira sincronização,
// congelamos o horário absoluto do servidor e avançamos apenas com
// performance.now(), que é monotônico e não muda quando o usuário corrige/erra
// manualmente o relógio do aparelho.
let serverBaseMs: number | null = null;
let monotonicBaseMs = 0;
let lastSyncAtMonotonic = 0;
let syncing: Promise<void> | null = null;

const SYNC_INTERVAL_MS = 5 * 60_000; // ressincroniza a cada 5 min

async function fetchServerNow(): Promise<number | null> {
  // 1) RPC oficial
  try {
    const t0 = performance.now();
    const { data, error } = await supabase.rpc('get_server_now');
    const t1 = performance.now();
    if (!error && data) {
      const server = new Date(data as unknown as string).getTime();
      if (Number.isFinite(server)) {
        // corrige metade do round-trip
        return server + Math.round((t1 - t0) / 2);
      }
    }
  } catch {
    /* ignore */
  }

  // 2) Fallback: header Date do próprio Supabase (HEAD request)
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (url) {
      const t0 = performance.now();
      const res = await fetch(`${url}/auth/v1/health`, { method: 'HEAD', cache: 'no-store' });
      const t1 = performance.now();
      const h = res.headers.get('date');
      if (h) {
        const server = new Date(h).getTime();
        if (Number.isFinite(server)) return server + Math.round((t1 - t0) / 2);
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function syncServerTime(force = false): Promise<void> {
  const now = performance.now();
  if (!force && serverBaseMs != null && now - lastSyncAtMonotonic < SYNC_INTERVAL_MS) return;
  if (syncing) return syncing;
  syncing = (async () => {
    const serverMs = await fetchServerNow();
    if (serverMs != null) {
      serverBaseMs = serverMs;
      monotonicBaseMs = performance.now();
      lastSyncAtMonotonic = monotonicBaseMs;
    }
  })();
  try {
    await syncing;
  } finally {
    syncing = null;
  }
}

/** Data corrente estimada do servidor (rede), sem depender do relógio local. */
export function getServerDate(): Date {
  if (serverBaseMs == null) {
    // Único fallback possível antes da primeira resposta do backend.
    return new Date();
  }
  return new Date(serverBaseMs + (performance.now() - monotonicBaseMs));
}

/** Offset atual entre servidor e relógio de parede do dispositivo, em ms. */
export function getServerOffsetMs(): number {
  if (serverBaseMs == null) return 0;
  return getServerDate().getTime() - Date.now();
}

/**
 * Hook: retorna a Date "de rede" atualizada no intervalo escolhido (default 1s).
 * Faz uma sincronização inicial e ressincroniza periodicamente.
 */
export function useServerTime(tickMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => getServerDate());

  useEffect(() => {
    let alive = true;

    // sincroniza ao montar
    syncServerTime().then(() => { if (alive) setNow(getServerDate()); });

    const tick = window.setInterval(() => {
      if (alive) setNow(getServerDate());
    }, tickMs);

    // ressync periódica
    const resync = window.setInterval(() => { syncServerTime(true); }, SYNC_INTERVAL_MS);

    // ressync ao voltar do background / recuperar rede
    const onFocus = () => { syncServerTime(true); };
    const onOnline = () => { syncServerTime(true); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      alive = false;
      window.clearInterval(tick);
      window.clearInterval(resync);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [tickMs]);

  return now;
}

// Acre é fixo em UTC-05:00 o ano todo (Brasil aboliu o horário de verão em
// 2019) — dá pra converter hora de parede do Acre pra epoch sem tabela de
// fusos, só somando o offset ao instante do servidor.
const ACRE_UTC_OFFSET_HOURS = 5;

/** Epoch (ms) do horário de parede "HH:mm" no fuso do Acre, no dia atual
 * do servidor (+ dayOffset dias) — para "programar para tal hora" sem
 * depender da data/hora configurada no dispositivo. */
export function acreWallTimeToServerMs(hour: number, minute: number, dayOffset = 0): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Rio_Branco', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = fmt.formatToParts(getServerDate());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return Date.UTC(get('year'), get('month') - 1, get('day') + dayOffset, hour + ACRE_UTC_OFFSET_HOURS, minute, 0, 0);
}

/**
 * Converte o valor de um <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * pro instante correto, tratando os números digitados como hora de PAREDE
 * do Acre — nunca como hora local do dispositivo. `new Date(string)` faria
 * o parse no fuso do aparelho: um celular configurado em outro fuso (ou só
 * com a região errada) criaria o turno deslocado por horas sem nenhum aviso
 * (Seção 41 — nunca confiar no relógio/fuso do dispositivo). Como o Acre
 * não tem horário de verão, o offset fixo (-05:00) resolve sem depender do
 * relógio do servidor.
 */
export function parseAcreDateTimeLocal(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = (timePart ?? '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h + ACRE_UTC_OFFSET_HOURS, min, 0, 0));
}

/**
 * Contrapartida de `parseAcreDateTimeLocal`: formata um instante pro valor
 * de um <input type="datetime-local"> exibindo a hora de PAREDE do Acre —
 * nunca `d.getHours()`/`getDate()` (que leem no fuso do dispositivo). Sem
 * isso, o valor inicial do campo já nasce errado em qualquer aparelho fora
 * do fuso do Acre, antes mesmo do usuário tocar nele.
 */
export function formatAcreDateTimeLocal(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Rio_Branco',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Ano/mês/dia (1-indexado) da hora de PAREDE do Acre para um instante — a
 * mesma leitura que `formatAcreDateTimeLocal` usa, exposta separadamente
 * para quem só precisa dos componentes de data (ex.: bucketing por período). */
export function getAcreDateParts(d: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Rio_Branco', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export interface BHPayPeriod {
  /** Início do período: dia 16 às 00:00 (hora do Acre), como instante UTC. */
  start: Date;
  /** Fim do período: dia 15 do mês seguinte às 23:59:59.999 (hora do Acre). */
  end: Date;
  /** Mês/ano em que o valor deste período é efetivamente pago (1-indexado). */
  payoutMonth: number;
  payoutYear: number;
  /** "16/08" — início do período. */
  startLabel: string;
  /** "15/09" — fim do período (mês de pagamento). */
  endLabel: string;
  /** "Setembro/2026" — mês em que o valor cai. */
  payoutLabel: string;
}

/**
 * Política de Banco de Horas da unidade: o mês é dividido em ciclos de
 * pagamento que NÃO coincidem com o mês calendário — cada ciclo vai do dia
 * 16 de um mês até o dia 15 do mês seguinte, e o valor acumulado nesse
 * ciclo é pago dentro do mesmo mês em que ele termina (ex.: 16/08–15/09 é
 * pago em setembro; 16/09–15/10 é pago em outubro).
 *
 * Isso é diferente da "quinzena calendário" (dias 1-15 / 16-fim do mês)
 * usada em outras partes do sistema (ex. rondas) — aqui o corte é sempre no
 * dia 16, nunca dentro do mesmo mês.
 */
export function getBHPayPeriod(date: Date): BHPayPeriod {
  const { year, month, day } = getAcreDateParts(date);

  // Se estamos no dia 16 em diante, o período corrente começou neste mês.
  // Do contrário (dia 1-15), o período corrente começou no mês anterior.
  let startMonth = day >= 16 ? month : month - 1;
  let startYear = year;
  if (startMonth === 0) { startMonth = 12; startYear -= 1; }

  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth === 13) { endMonth = 1; endYear += 1; }

  const start = new Date(Date.UTC(startYear, startMonth - 1, 16, ACRE_UTC_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(endYear, endMonth - 1, 15, 23 + ACRE_UTC_OFFSET_HOURS, 59, 59, 999));

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start,
    end,
    payoutMonth: endMonth,
    payoutYear: endYear,
    startLabel: `${pad(16)}/${pad(startMonth)}`,
    endLabel: `${pad(15)}/${pad(endMonth)}`,
    payoutLabel: `${MONTH_NAMES_PT[endMonth - 1]}/${endYear}`,
  };
}

/** Período anterior ao de `date` — útil para mostrar "o ciclo que acabou de
 * fechar, ainda aguardando pagamento" ao lado do período em andamento. */
export function getPreviousBHPayPeriod(date: Date): BHPayPeriod {
  const current = getBHPayPeriod(date);
  // Um dia antes do início do período atual cai no meio do período anterior.
  const dayBeforeStart = new Date(current.start.getTime() - 24 * 60 * 60 * 1000);
  return getBHPayPeriod(dayBeforeStart);
}

/**
 * Retorna horas/minutos/segundos da hora do servidor em um fuso específico.
 * Uso padrão para todos os relógios do app: `useServerClockParts()` = Rio Branco.
 * Se a sync com o servidor falhar, `useServerTime` já retorna a Date local
 * como fallback — mantendo a UI consistente.
 */
export function useServerClockParts(
  timeZone: string = 'America/Rio_Branco',
  tickMs = 1000,
): { hours: number; minutes: number; seconds: number; date: Date } {
  const date = useServerTime(tickMs);
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
    let h = get('hour');
    if (h === 24) h = 0; // Intl pode devolver 24 em alguns runtimes
    return { hours: h, minutes: get('minute'), seconds: get('second'), date };
  } catch {
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      date,
    };
  }
}

