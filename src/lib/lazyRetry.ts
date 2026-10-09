import { lazy, type ComponentType } from 'react';

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
    throw lastError;
  });
}
