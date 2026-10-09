import { lazy, type ComponentType } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from './chunkError';

/**
 * `lazy` que tenta de novo se o chunk falhar (rede instável ou deploy novo
 * trocando os nomes dos arquivos). Se continuar falhando, o erro sobe para o
 * `SectionBoundary` mais próximo, que mostra "Tentar novamente" — em vez de
 * derrubar a tela inteira.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delayMs = 600,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await factory();
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
    // Arquivo velho (publicação nova): recarregar uma vez busca os arquivos certos.
    if (isChunkLoadError(lastError) && reloadOnceForChunkError()) {
      return new Promise<never>(() => { /* a página está recarregando */ });
    }
    throw lastError;
  });
}
