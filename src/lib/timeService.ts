/**
 * Time Service - Sincronização centralizada de hora com o servidor
 * Garante que TODO o sistema segue a mesma hora, não a do dispositivo
 * Timezone: America/Rio_Branco (Brasil/Acre)
 */

import { supabase } from '@/integrations/supabase/client';
import { setServerDateGetter } from './shiftTime';

const TIMEZONE = 'America/Rio_Branco';
let serverTimeDiff: number | null = null;
let lastSyncTime: number = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // Re-sincronizar a cada 5 minutos

/**
 * Sincroniza com a hora do servidor
 */
export async function initializeTimeService() {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_server_now`,
      {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (response.ok) {
      const { result: server_timestamp } = await response.json();
      const serverTime = new Date(server_timestamp).getTime();
      const clientTime = Date.now();
      serverTimeDiff = serverTime - clientTime;
      lastSyncTime = clientTime;

      // Conectar com shiftTime.ts
      setServerDateGetter(now);
    }
  } catch (error) {
    console.warn('Falha ao sincronizar com servidor, usando hora local:', error);
    serverTimeDiff = 0;
    setServerDateGetter(() => new Date());
  }
}

/**
 * Retorna a hora atual sincronizada com o servidor
 */
export function now(): Date {
  // Re-sincronizar periodicamente
  if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
    void initializeTimeService();
  }

  const diff = serverTimeDiff ?? 0;
  return new Date(Date.now() + diff);
}

/**
 * Formata uma data para o timezone correto
 */
export function formatToTimezone(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formata apenas a hora
 */
export function formatTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formata apenas a data
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Inicializar serviço na importação
void initializeTimeService();
