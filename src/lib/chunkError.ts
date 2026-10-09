/** Erro de carregamento de módulo dinâmico (arquivo antigo que sumiu após uma publicação nova,
 * rede instável ou cache velho do service worker). */
export function isChunkLoadError(e: unknown): boolean {
  const msg = String((e as { message?: string } | null)?.message ?? e ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|ChunkLoadError|Unable to preload CSS/i.test(msg);
}

const FLAG = 'pp_chunk_reload_at';

/** Recarrega a página UMA vez (no máximo a cada 60 s) para buscar os arquivos novos.
 * Devolve false se já recarregou há pouco — aí quem chamou mostra o erro em vez de entrar em loop. */
export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(FLAG) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch { /* sem sessionStorage: tenta uma vez */ }
  window.location.reload();
  return true;
}
