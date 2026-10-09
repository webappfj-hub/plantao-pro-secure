import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './chunkError';

describe('isChunkLoadError', () => {
  it('reconhece falhas de carregamento de módulo', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/ChatPanel-abc.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError('Loading chunk 12 failed.')).toBe(true);
  });
  it('não confunde com erro comum de render', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'name')"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
