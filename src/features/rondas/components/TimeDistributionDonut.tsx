import type { AgentWindow } from './AgentScheduleTimeline';

/**
 * Donut "Distribuição do tempo" — quanto do turno cada agente ocupa.
 * Alimentado 100% por `AgentWindow[]` (já computado em RoundsDashboard via
 * `buildAgentWindows`, a partir dos slots reais) — nenhum dado inventado,
 * nenhuma lógica nova de cálculo de tempo.
 */
export function TimeDistributionDonut({ windows, totalMinutes }: { windows: AgentWindow[]; totalMinutes: number }) {
  const total = Math.max(totalMinutes, 1);
  const R = 40;
  const CIRC = 2 * Math.PI * R;

  let cursor = 0;
  const arcs = windows.map((w) => {
    const frac = Math.max(0, w.totalMinutes) / total;
    const dash = frac * CIRC;
    const arc = { color: w.color, dash, offset: -cursor * CIRC };
    cursor += frac;
    return arc;
  });

  if (windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-border">
          <span className="text-[10px] text-muted-foreground">Sem dados</span>
        </div>
        <p className="text-xs text-muted-foreground">Nenhum agente escalado ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          {arcs.map((a, i) => (
            <circle
              key={windows[i].key}
              cx="50" cy="50" r={R} fill="none"
              stroke={a.color} strokeWidth="10"
              strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-foreground">{Math.round(total)}</span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">min totais</span>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-1.5">
        {windows.map((w) => {
          const pct = Math.round((Math.max(0, w.totalMinutes) / total) * 100);
          return (
            <div key={w.key} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w.color }} />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{w.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(w.totalMinutes)}min</span>
              <span className="w-9 shrink-0 text-right tabular-nums font-semibold text-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
