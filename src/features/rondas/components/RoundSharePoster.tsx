import { forwardRef } from 'react';
import { ShieldCheck, Users, Clock3, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';
import { fmtDuration, progressionColor, type AgentWindow } from './AgentScheduleTimeline';

function fmtHm(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' });
}
function fmtDateLong(d: Date): string {
  const raw = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Rio_Branco' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Ordinal em português — "1º", "2º", "3º"... até 10, cai pro número puro
 * depois disso (turnos rotativos longos não precisam de ordinal bonito). */
function ordinal(n: number): string {
  return n <= 10 ? `${n}º` : `${n}.`;
}

export interface RoundSharePosterProps {
  team: string;
  unitName?: string;
  rangeStart: Date;
  rangeEnd: Date;
  windows: AgentWindow[];
  stats?: { coveragePct?: number; openIncidents?: number };
}

/**
 * Cartão exportável da escala — pensado pra virar PNG (html2canvas) e ser
 * compartilhado no grupo da equipe, no espírito dos cartazes de "Quarto de
 * Hora" que os supervisores já montavam manualmente. Largura fixa (720px):
 * html2canvas precisa de um layout previsível, não responsivo, pra gerar a
 * mesma imagem não importa o tamanho da tela de quem clicou em Compartilhar.
 */
export const RoundSharePoster = forwardRef<HTMLDivElement, RoundSharePosterProps>(
  ({ team, unitName, rangeStart, rangeEnd, windows, stats }, ref) => {
    const teamColor = TEAM_COLORS[team as TeamKey]?.hex ?? '#2F6FED';
    const totalMinutes = windows.reduce((sum, w) => sum + w.totalMinutes, 0);

    return (
      <div
        ref={ref}
        style={{ width: 720, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
        className="relative overflow-hidden bg-[#0a0e17] text-white"
      >
        {/* Textura tática + brilho de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 50% at 50% 0%, ${teamColor}33 0%, transparent 70%)` }}
        />

        {/* Cabeçalho */}
        <div className="relative flex items-center gap-3 border-b border-white/10 px-8 pb-5 pt-7">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${teamColor}26`, boxShadow: `0 0 0 1px ${teamColor}55` }}
          >
            <ShieldCheck className="h-6 w-6" style={{ color: teamColor }} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: teamColor }}>
              Equipe {team} · PlantãoPro AC
            </p>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">Escala do Turno</h1>
          </div>
          <div className="shrink-0 text-right text-[11px] text-white/60">
            <p>{fmtDateLong(rangeStart)}</p>
            <p className="font-semibold text-white/85">{fmtHm(rangeStart)} às {fmtHm(rangeEnd)}</p>
          </div>
        </div>

        {/* Frase institucional */}
        <p className="relative px-8 pb-5 pt-4 text-[13px] italic text-white/70">
          "Cada turno, um propósito: manter a ordem."
        </p>

        {/* Grade de agentes */}
        <div className="relative grid grid-cols-2 gap-3 px-8 pb-6">
          {windows.map((w, i) => {
            const start = w.segments[0]?.start;
            const end = w.segments[w.segments.length - 1]?.end;
            const color = progressionColor(i, windows.length);
            return (
              <div
                key={w.key}
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: `${color}55`, background: `${color}14` }}
              >
                <div className="flex items-center gap-1.5 px-3 pt-2.5 text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
                  <Clock3 className="h-3 w-3" />
                  {ordinal(i + 1)} Quarto {start && end ? `· ${fmtHm(start)} às ${fmtHm(end)}` : ''}
                </div>
                <div className="flex items-center gap-2.5 px-3 pb-3 pt-2">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 ring-black/20"
                    style={{ background: color }}
                  >
                    {w.avatarUrl ? (
                      <img src={w.avatarUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      w.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-tight">{w.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-white/50">Agente socioeducativo</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé — resumo operacional em selos, no espírito do cartaz original */}
        <div className="relative grid grid-cols-4 gap-2 border-t border-white/10 px-6 py-4">
          {[
            { Icon: Users, label: 'Efetivo', value: `${windows.length} agente${windows.length === 1 ? '' : 's'}` },
            { Icon: Clock3, label: 'Duração total', value: fmtDuration(totalMinutes) },
            {
              Icon: stats?.openIncidents ? AlertTriangle : CheckCircle2,
              label: 'Ocorrências',
              value: stats?.openIncidents ? `${stats.openIncidents} aberta${stats.openIncidents > 1 ? 's' : ''}` : 'Nenhuma',
            },
            { Icon: MapPin, label: 'Cobertura', value: stats?.coveragePct != null ? `${Math.round(stats.coveragePct)}%` : 'Total' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <Icon className="h-4 w-4" style={{ color: teamColor }} strokeWidth={2.2} />
              <span className="text-[9px] uppercase tracking-wide text-white/45">{label}</span>
              <span className="text-[11px] font-bold text-white/90">{value}</span>
            </div>
          ))}
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 px-8 py-3 text-[10px] text-white/40">
          <span>{unitName ?? 'Unidade Socioeducativa do Acre'}</span>
          <span>Gerado pelo PlantãoPro</span>
        </div>
      </div>
    );
  },
);
RoundSharePoster.displayName = 'RoundSharePoster';
