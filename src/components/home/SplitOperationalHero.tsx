import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, ChevronRight, ArrowRight, ShieldCheck, CalendarDays, Clock3, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { getDutyTeam } from '@/lib/dutyTeam';
import { SHIELD_CLIP, CHROME_GRADIENT, mascotStyle } from '@/lib/teamArt';
import { cn } from '@/lib/utils';
import { ParticleNetwork } from './ParticleNetwork';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

import heroBanner from '@/assets/midias/hero-banner.webp';
import teamAlfaPhoto from '@/assets/midias/team-alfa.webp';
import teamBravoPhoto from '@/assets/midias/team-bravo.webp';
import teamCharliePhoto from '@/assets/midias/team-charlie.webp';
import teamDeltaPhoto from '@/assets/midias/team-delta.webp';

import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';

interface Props {
  onTeamClick: (team: string) => void;
}

const TEAM_PHOTOS: Record<TeamKey, string> = {
  ALFA: teamAlfaPhoto,
  BRAVO: teamBravoPhoto,
  CHARLIE: teamCharliePhoto,
  DELTA: teamDeltaPhoto,
};

const TEAMS: { key: TeamKey }[] = [
  { key: 'ALFA' },
  { key: 'BRAVO' },
  { key: 'CHARLIE' },
  { key: 'DELTA' },
];

// Cards oficiais (equipe_*_card.png) já trazem brasão, nome da equipe e
// lema aplicados pelo design — o card só exibe a arte e adiciona camadas
// discretas: foco de luz que segue o cursor, filete na cor da equipe e uma
// faixa de vidro com a ação, que sobe no hover/foco.
function TeamCard({
  team, isSelected, onDuty = false, onSelect,
}: { team: (typeof TEAMS)[number]; isSelected: boolean; onDuty?: boolean; onSelect: (k: TeamKey) => void }) {
  const accent = TEAM_COLORS[team.key].hsl;
  const track = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <button
      type="button"
      data-team={team.key}
      aria-pressed={isSelected}
      aria-label={`Selecionar equipe ${team.key}${onDuty ? ' (de plantão agora)' : ''}`}
      onClick={() => onSelect(team.key)}
      onMouseMove={track}
      style={{
        ['--accent' as string]: accent,
        // moldura: cromada; selecionada = degradê na cor da equipe
        background: isSelected
          ? `linear-gradient(135deg, hsl(${accent}), #eef1f5 45%, hsl(${accent}))`
          : 'linear-gradient(135deg, #fbfcfe 0%, #9aa5b4 22%, #eef1f5 45%, #6b7687 70%, #d3dae3 100%)',
      }}
      className={cn(
        'group relative block aspect-[3/2] w-full rounded-xl p-[2px] text-left',
        'transition-[box-shadow] duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isSelected
          ? 'shadow-[0_10px_30px_-12px_hsl(var(--accent)/0.6)]'
          : 'shadow-[0_6px_16px_-10px_rgb(0_0_0/0.6)] hover:shadow-[0_10px_30px_-14px_hsl(var(--accent)/0.55)]',
      )}
    >
      <span className="relative flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-card">
        {onDuty && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            De plantão
          </span>
        )}
      <img
        src={TEAM_PHOTOS[team.key]}
        alt={`Equipe ${team.key}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
        draggable={false}
      />
      {/* Foco de luz que acompanha o cursor */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--accent) / 0.16), transparent 70%)' }}
      />
      {/* Escurecimento inferior para a faixa de vidro */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      {/* Filete superior na cor da equipe */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)' }}
      />
      {/* Faixa de vidro com a ação */}
      <span
        className={cn(
          'glass pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-lg px-2.5 py-1 sm:inset-x-2 sm:bottom-2 sm:px-3 sm:py-1.5',
          'text-[10px] font-semibold uppercase tracking-[0.12em] text-white sm:text-[11px]',
          'translate-y-2 opacity-0 transition-all duration-300 ease-out',
          'group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100',
          isSelected && 'translate-y-0 opacity-100',
        )}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${accent})` }} />
          {isSelected ? 'Selecionada' : 'Acessar equipe'}
        </span>
        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </span>
      </span>
    </button>
  );
}

const FEATURES: { Icon: typeof CalendarDays; title: string; desc: string }[] = [
  { Icon: CalendarDays, title: 'Escalas e plantões', desc: 'Consulte a escala da equipe, folgas e trocas atualizadas, no celular ou no computador.' },
  { Icon: Clock3, title: 'Banco de horas', desc: 'Saldo, extrato e horas extras calculados automaticamente a partir dos plantões registrados.' },
  { Icon: ShieldCheck, title: 'Gestor de rondas', desc: 'Divisão do tempo por agente, cronômetro, ocorrências e histórico de cada turno.' },
  { Icon: ArrowLeftRight, title: 'Permutas', desc: 'Solicite trocas de plantão com aprovação e registro de quem autorizou.' },
];

function SectionHeader({ eyebrow, title, desc, aside }: { eyebrow: string; title: string; desc?: string; aside?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-1.5 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h2>
        {desc && <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {aside && <span className="text-sm font-medium text-muted-foreground">{aside}</span>}
    </div>
  );
}

export function SplitOperationalHero({ onTeamClick }: Props) {
  const navigate = useNavigate();
  const { user, masterSession } = useAuth();
  const loggedIn = !!user || !!masterSession;
  const metrics = useOperationalMetrics();
  const trackedAgents = useOnlineAgents().size;
  const visitorsNow = useVisitorPresence();
  const onlineAgents = Math.max(trackedAgents, visitorsNow);
  const [selectedTeam, setSelectedTeam] = useState<TeamKey | null>(null);
  const duty = getDutyTeam(useServerTime(60_000));
  const dutyColor = TEAM_COLORS[duty.team].hex;
  const h = Math.floor(duty.msToChange / 3_600_000);
  const m = Math.floor((duty.msToChange % 3_600_000) / 60_000);

  const handleSelect = useCallback((k: TeamKey) => {
    setSelectedTeam(k);
    onTeamClick(k);
  }, [onTeamClick]);

  const goTeams = () => {
    const el = document.getElementById('equipes');
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const fmt2 = (n: number) => String(n).padStart(2, '0');
  const stats = [
    { label: 'Unidades', value: metrics.loading ? '—' : fmt2(metrics.units) },
    { label: 'Agentes', value: metrics.loading ? '—' : fmt2(metrics.agentsRegistered || metrics.agentsActive) },
    { label: 'Online agora', value: fmt2(onlineAgents), live: true },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* HERO — uma mensagem, uma ação principal, prova em números; foto ao lado */}
      <div className="grid items-center gap-8 py-2 sm:py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="animate-fade-in">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Instituto Socioeducativo do Acre
          </p>
          <h1 className="mt-4 font-heading text-[clamp(2rem,4.2vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-foreground [text-wrap:balance]">
            Plantões e rondas sob controle, <span className="text-primary">em tempo real.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Escalas, banco de horas, permutas e rondas das unidades socioeducativas do Acre, reunidos em um único sistema. Desenvolvido por agentes, para agentes.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 gap-2 px-6 text-[15px] font-semibold" onClick={() => (loggedIn ? navigate('/agent-panel') : goTeams())}>
              {loggedIn ? 'Ir para o meu painel' : 'Entrar no sistema'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="lg" variant="outline" className="h-12 gap-2 px-6 text-[15px] font-semibold" onClick={() => navigate('/rondas')}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              Abrir Gestor de Rondas
            </Button>
          </div>

          <dl className="mt-8 grid max-w-md grid-cols-3 divide-x divide-border border-y border-border">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-3 first:pl-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {s.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
                  {s.label}
                </dt>
                <dd className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="relative animate-fade-in" style={{ animationDelay: '120ms' }}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-[#070c18] shadow-[0_30px_60px_-30px_rgb(2_6_23/0.6)]">
            <img
              src={heroBanner}
              alt="Agente da Socioeducação do Acre em frente a uma unidade, com o brasão do Governo do Acre"
              loading="eager"
              decoding="async"
              width={1920}
              height={768}
              className="absolute inset-0 h-full w-full object-cover object-[100%_30%]"
              draggable={false}
            />
            <ParticleNetwork />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Equipe de plantão agora */}
            <figcaption className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl border border-white/15 bg-black/55 px-4 py-3 text-white backdrop-blur-md sm:right-auto">
              <span aria-hidden className="relative h-11 w-10 shrink-0" style={{ clipPath: SHIELD_CLIP, background: CHROME_GRADIENT }}>
                <span className="absolute inset-[2px]" style={{ clipPath: SHIELD_CLIP, ...mascotStyle(duty.team) }} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: dutyColor }} aria-hidden />
                  De plantão agora
                </span>
                <span className="block text-base font-bold tracking-wide">Equipe {duty.team}</span>
                <span className="block text-xs text-white/70">Troca às 07:00 · em {h}h{String(m).padStart(2, '0')}</span>
              </span>
            </figcaption>
          </div>
        </figure>
      </div>

      {/* EQUIPES */}
      <div id="equipes" className="mt-10 scroll-mt-24 sm:mt-14">
        <SectionHeader
          eyebrow="Acesso"
          title="Escolha sua equipe para entrar"
          desc="Selecione a sua equipe e informe a matrícula. A equipe marcada “De plantão” é a que está em serviço agora."
          aside="4 equipes"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TEAMS.map((t) => (
            <TeamCard key={t.key} team={t} isSelected={selectedTeam === t.key} onDuty={duty.team === t.key} onSelect={handleSelect} />
          ))}
        </div>
      </div>

      {/* RECURSOS */}
      <div className="mt-12 sm:mt-16">
        <SectionHeader eyebrow="Recursos" title="Tudo o que o plantão precisa, em um só lugar" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, desc }) => (
            <li key={title} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
