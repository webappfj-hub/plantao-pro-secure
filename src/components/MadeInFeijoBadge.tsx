import { cn } from '@/lib/utils';

/**
 * MadeInFeijoBadge — Selo tático de origem do software.
 *
 * Renderizado em HTML/CSS (não SVG) para nitidez perfeita em qualquer
 * densidade de pixel. Combina com a tipografia do rodapé.
 */
export function MadeInFeijoBadge({
  inline = false,
  size = 'md',
  className,
}: {
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const wrapperClass = inline
    ? 'inline-flex items-center select-none'
    : 'pointer-events-none fixed bottom-2 left-2 z-[55] hidden sm:inline-flex select-none';

  const sizeMap = {
    sm: {
      pad: 'px-1.5 py-[3px] gap-1.5',
      tag: 'text-[8px] tracking-[0.20em]',
      title: 'text-[9px] tracking-[0.22em]',
      chev: 'text-[9px]',
      bar: 'h-3',
    },
    md: {
      pad: 'px-2 py-1 gap-2',
      tag: 'text-[9px] tracking-[0.22em]',
      title: 'text-[11px] tracking-[0.24em]',
      chev: 'text-[11px]',
      bar: 'h-4',
    },
    lg: {
      pad: 'px-3 py-1.5 gap-2.5',
      tag: 'text-[10px] tracking-[0.24em]',
      title: 'text-[13px] tracking-[0.26em]',
      chev: 'text-[13px]',
      bar: 'h-5',
    },
  }[size];

  return (
    <div
      role="note"
      title="Software desenvolvido por Franc Denis"
      aria-label="Software desenvolvido por Franc Denis"
      className={cn(wrapperClass, className)}
    >
      {/* Assinatura discreta: só texto, sem moldura — realça no hover */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-mono uppercase leading-none text-white/35 transition-colors duration-200 hover:text-white/75',
          sizeMap.tag,
        )}
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        <span aria-hidden className="text-primary/60">{'</>'}</span>
        <span>dev</span>
        <span aria-hidden className="text-white/20">/</span>
        <span className="font-semibold">Franc Denis</span>
      </span>
    </div>
  );
}

export default MadeInFeijoBadge;
