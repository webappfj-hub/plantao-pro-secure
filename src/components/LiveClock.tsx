import { cn } from '@/lib/utils';
import { useServerClockParts } from '@/hooks/useServerTime';

/** Relógio tático (fuso Rio Branco/AC): módulo de vidro com marcas de canto,
 * rótulo do fuso, horas em mono tabular e barra fina que varre os 60 segundos.
 * Usa o relógio sincronizado com o servidor (Seção 41): a hora exibida não
 * muda se o dispositivo estiver com data/hora alteradas, certas ou erradas. */
export function LiveClock({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const { hours, minutes, seconds } = useServerClockParts();
  const pad = (n: number) => String(n).padStart(2, '0');
  const sm = size === 'sm';

  return (
    <div
      role="timer"
      aria-label={`Hora oficial do Acre ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      className={cn(
        'glass glass-surface relative flex flex-col justify-center overflow-hidden rounded-md',
        sm ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
    >
      <span aria-hidden className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-primary/70" />
      <span aria-hidden className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-primary/70" />

      <span className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase leading-none tracking-[0.2em] text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        AC · UTC−5
      </span>

      <span className={cn('mt-1 font-mono font-semibold leading-none tabular-nums tracking-wider text-foreground', sm ? 'text-[13px]' : 'text-[15px]')}>
        {pad(hours)}
        <span className="live-clock-colon text-primary">:</span>
        {pad(minutes)}
        <span className="live-clock-colon text-primary">:</span>
        <span className="text-muted-foreground">{pad(seconds)}</span>
      </span>

      {/* Varredura dos 60 segundos */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-border/60">
        <span className="block h-full bg-primary/80" style={{ width: `${(seconds / 59) * 100}%` }} />
      </span>
    </div>
  );
}
