import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getTeamColors } from '@/lib/teamAssets';
import { useLowMotion } from '@/hooks/useLowMotion';
import { CheckCircle2, Clock3, ShieldCheck, Users } from 'lucide-react';

export interface RoundCompletionStats {
  team: string | null;
  totalSlots: number;
  completedSlots: number;
  coveragePct: number;
  durationLabel: string;
}

/**
 * Tela de conclusão da ronda — some quando um turno inteiro é encerrado
 * (manual ou automaticamente), não quando um agente termina só o próprio
 * quarto de hora. Selo com "desenho" (stroke-dashoffset) em vez de confete
 * genérico, no mesmo idioma visual tático do resto do Gestor de Rondas.
 * Respeita `useLowMotion`: sem animação, o selo já nasce completo.
 */
export function RoundCompletionCelebration({
  open, onClose, stats,
}: { open: boolean; onClose: () => void; stats: RoundCompletionStats | null }) {
  const { lowMotion } = useLowMotion();
  const colors = getTeamColors(stats?.team ?? null);

  // Fecha com Esc — mas nunca com clique fora, é uma conclusão, não um popover descartável sem querer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !stats) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/92 p-6 backdrop-blur-md animate-in fade-in-0 duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Ronda encerrada"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-500">
        <div className="relative mx-auto mb-4 h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-24 w-24" aria-hidden>
            <circle cx="50" cy="50" r="44" fill="none" stroke={`${colors.primary}25`} strokeWidth="4" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke={colors.primary} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={lowMotion ? 0 : 2 * Math.PI * 44}
              transform="rotate(-90 50 50)"
              style={!lowMotion ? { animation: 'rcc-ring 900ms ease-out forwards' } : undefined}
            />
            <path
              d="M32 52 L44 64 L70 36"
              fill="none" stroke={colors.primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={60}
              strokeDashoffset={lowMotion ? 0 : 60}
              style={!lowMotion ? { animation: 'rcc-check 500ms ease-out 750ms forwards' } : undefined}
            />
          </svg>
          <style>{`
            @keyframes rcc-ring { to { stroke-dashoffset: 0; } }
            @keyframes rcc-check { to { stroke-dashoffset: 0; } }
          `}</style>
        </div>

        <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Turno encerrado</p>
        <h2 className="mt-1 text-lg font-bold text-foreground">
          Ronda da Equipe {stats.team ?? '—'} concluída
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Todo o acompanhamento foi registrado e fica disponível no histórico.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 px-2 py-2.5">
            <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-sm font-bold text-foreground">{stats.completedSlots}/{stats.totalSlots}</p>
            <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Rondas</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-2 py-2.5">
            <ShieldCheck className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-sm font-bold text-foreground">{stats.coveragePct}%</p>
            <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Cobertura</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-2 py-2.5">
            <Clock3 className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-sm font-bold text-foreground">{stats.durationLabel}</p>
            <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Duração</p>
          </div>
        </div>

        <Button className="mt-5 w-full gap-1.5" onClick={onClose}>
          <Users className="h-4 w-4" /> Concluir
        </Button>
      </div>
    </div>
  );
}
