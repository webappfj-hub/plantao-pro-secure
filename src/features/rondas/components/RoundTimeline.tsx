import { useEffect, useRef } from 'react';
import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatrolSlot } from '../types';

const STATUS_STYLE: Record<PatrolSlot['status'], { dot: string; ring: string; badge: string; label: string }> = {
  completed: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-400', label: 'Concluída' },
  active: { dot: 'bg-sky-400', ring: 'ring-sky-400/40', badge: 'bg-sky-400/15 text-sky-300', label: 'Em andamento' },
  pending: { dot: 'bg-transparent', ring: 'ring-border', badge: 'bg-muted text-muted-foreground', label: 'Pendente' },
  late: { dot: 'bg-amber-500', ring: 'ring-amber-500/40', badge: 'bg-amber-500/15 text-amber-400', label: 'Atraso' },
  incident: { dot: 'bg-rose-500', ring: 'ring-rose-500/40', badge: 'bg-rose-500/15 text-rose-400', label: 'Ocorrência' },
  cancelled: { dot: 'bg-transparent', ring: 'ring-border', badge: 'bg-muted text-muted-foreground', label: 'Cancelada' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
}

/**
 * Timeline vertical do turno — um marco por quarto de hora, em ordem
 * cronológica (mesmos dados de sempre: `patrol_slots`). Substitui a antiga
 * tira horizontal de pontinhos + o card separado "Próximas rondas": era a
 * mesma informação (setor, agente, horário, status) em três lugares
 * diferentes da tela. Rola sozinha até o marco ativo — turnos longos (ex.:
 * 96 quartos de hora em 24h) não obrigam a rolar manualmente até "agora".
 */
export function RoundTimeline({ slots, activeSlotId }: { slots: PatrolSlot[]; activeSlotId?: string | null }) {
  const activeRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlotId]);

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum posto gerado para este turno ainda.</p>;
  }

  const ordered = [...slots].sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

  return (
    <div ref={containerRef} className="max-h-[420px] space-y-0 overflow-y-auto pr-1">
      {ordered.map((slot, i) => {
        const style = STATUS_STYLE[slot.status];
        const isActive = slot.id === activeSlotId;
        const isLast = i === ordered.length - 1;
        return (
          <div key={slot.id} ref={isActive ? activeRef : undefined} className="relative flex gap-3 pb-3">
            {!isLast && <span className="absolute left-[9px] top-5 h-full w-px bg-border" aria-hidden />}
            <span
              className={cn(
                'relative z-10 mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ring-2',
                style.dot, style.ring,
                isActive && 'animate-pulse',
              )}
            >
              {slot.status === 'completed' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>

            <div className={cn('min-w-0 flex-1 rounded-lg border px-3 py-2', isActive ? 'border-sky-400/40 bg-sky-400/[0.06]' : 'border-transparent')}>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-bold tabular-nums text-foreground">{fmtTime(slot.scheduled_start)}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', style.badge)}>{style.label}</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-semibold text-foreground">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                {slot.sector?.name ?? 'Setor não definido'}
              </p>
              {slot.agent?.name && <p className="truncate text-[11px] text-muted-foreground">{slot.agent.name}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
