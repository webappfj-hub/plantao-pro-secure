import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useRoundsStats } from '@/hooks/useRoundsStats';

import { useServerTime } from '@/hooks/useServerTime';
import { DutyTeamBadge } from './DutyTeamBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PLATE_CLIP = 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';
const PLATE_CLIP_INNER = 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px))';

/**
 * Barra de controle — acesso rápido ao Gestor de Rondas, indicadores do
 * turno e relógio sincronizado com o servidor.
 */
export function RoundsCommandBar() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const rounds = useRoundsStats();
  const navigate = useNavigate();

  const unitLabel = useMemo(() => {
    if (agent?.unit?.name) {
      const municipality = agent.unit.municipality ? ` · ${agent.unit.municipality}` : '';
      return `${agent.unit.name}${municipality}`;
    }
    return '—';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const shortUnit = useMemo(() => {
    if (agent?.unit?.municipality) return agent.unit.municipality;
    if (agent?.unit?.name) return agent.unit.name.split(/\s+/).slice(0, 2).join(' ');
    return '—';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const handleRefresh = () => {
    try { window.location.reload(); } catch { /* noop */ }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="group"
        aria-label="Controle de rondas, indicadores e horário"
        className="glass glass-surface w-full rounded-lg"
      >
        <div className="relative mx-auto flex h-14 max-w-[1600px] items-stretch px-2 sm:px-3">
          <div className="flex flex-1 items-center gap-3 min-w-0 sm:gap-5">
            {/* Placa tática: cantos chanfrados (clip-path), moldura em degradê, placa
                do ícone com LED, sheen periódico e chevrons em cascata. Mesmo
                espaço do botão anterior (225 px), altura usa a folga da barra. */}
            <button
              type="button"
              onClick={() => navigate('/rondas')}
              aria-label="Abrir Gestor de Rondas"
              className="rounds-plate group relative isolate h-11 w-[225px] shrink-0 text-left focus-visible:outline-none"
              style={{ clipPath: PLATE_CLIP, background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.35) 55%, hsl(var(--primary)))' }}
            >
              <span
                className="absolute inset-px flex items-stretch overflow-hidden transition-[filter] duration-300 group-hover:brightness-125 group-focus-visible:brightness-125"
                style={{ clipPath: PLATE_CLIP_INNER, background: 'linear-gradient(180deg, rgb(12 20 36), rgb(7 12 24))' }}
              >
                {/* Placa do ícone com listras diagonais e LED de status */}
                <span
                  className="relative flex w-11 shrink-0 items-center justify-center border-r border-primary/30"
                  style={{ background: 'repeating-linear-gradient(135deg, hsl(var(--primary) / 0.22) 0 4px, hsl(var(--primary) / 0.10) 4px 8px)' }}
                >
                  <span className="absolute left-1.5 top-1.5 flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <ClipboardList className="h-5 w-5 text-white drop-shadow transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={2.2} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col justify-center pl-2.5 leading-none">
                  <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-white">Gestor de Rondas</span>
                  <span className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.16em] text-primary">Central operacional</span>
                </span>

                {/* Chevrons em cascata */}
                <span className="flex shrink-0 items-center pr-2 text-primary" aria-hidden>
                  <ChevronRight className="rounds-chev -mr-2.5 h-4 w-4" style={{ animationDelay: '0ms' }} strokeWidth={3} />
                  <ChevronRight className="rounds-chev h-4 w-4" style={{ animationDelay: '200ms' }} strokeWidth={3} />
                </span>

                <span aria-hidden className="rounds-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-reduce:hidden" />
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <Metric label="Em curso" value={String(rounds.active).padStart(2, '0')} live={rounds.active > 0} />
              <Divider className="hidden xs:block" />
              <Metric label="Hoje" value={String(rounds.today).padStart(2, '0')} className="hidden xs:flex" />
              {agent?.team && (
                <>
                  <Divider className="hidden md:block" />
                  <TeamChip team={agent.team} className="hidden md:flex" />
                </>
              )}
              {user && (
                <>
                  <Divider className="hidden lg:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden max-w-[160px] cursor-default flex-col leading-tight lg:flex">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unidade</span>
                        <span className="truncate text-[11px] font-semibold text-foreground">{shortUnit}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Unidade</span>
                      <div className="font-semibold">{unitLabel}</div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

            <DutyTeamBadge className="hidden h-11 min-w-0 flex-1 self-center md:flex" />
          </div>

          <div className="flex shrink-0 items-center gap-3 border-l border-border pl-3 sm:pl-5">
            <button
              type="button"
              onClick={handleRefresh}
              className="group hidden flex-col items-end leading-tight focus-visible:outline-none md:flex"
              aria-label="Atualizar página"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sincronizar</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground transition-colors group-hover:text-primary">
                Atualizar
                <RefreshCw className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180" strokeWidth={2.2} />
              </span>
            </button>

            <DateBlock />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ================ atoms ================ */

function Divider({ className }: { className?: string }) {
  return <span aria-hidden className={cn('h-6 w-px bg-border', className)} />;
}

function Metric({
  label,
  value,
  live,
  className,
}: {
  label: string;
  value: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col leading-tight', className)}>
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {live && (
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        )}
        <span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  );
}

function TeamChip({ team, className }: { team: string; className?: string }) {
  return (
    <div className={cn('flex flex-col leading-tight', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Equipe</span>
      <span className="self-start rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-primary">
        {team}
      </span>
    </div>
  );
}

/** Data oficial (Rio Branco/AC) — a hora já aparece no relógio do header,
 * então aqui fica só o dia, para não repetir a informação. */
function DateBlock() {
  const date = useServerTime(60_000);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Rio_Branco', ...o }).format(date).replace('.', '').toUpperCase();
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 px-3 py-1.5 leading-none">
      <span className="text-2xl font-bold tabular-nums text-foreground">{f({ day: '2-digit' })}</span>
      <span className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
        <span className="text-primary">{f({ month: 'short' })} {f({ year: 'numeric' })}</span>
        <span className="text-muted-foreground">{f({ weekday: 'short' })}</span>
      </span>
    </div>
  );
}
