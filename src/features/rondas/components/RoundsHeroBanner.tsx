import { Radio, ShieldCheck, Timer } from 'lucide-react';
import rondasHeader from '@/assets/midias/rondas-header.jpg';

/**
 * Faixa de abertura do Gestor de Rondas — imagem operacional com
 * sobreposição em degradê e identificação do módulo.
 * Apenas apresentação: nenhuma regra de negócio aqui.
 */
export function RoundsHeroBanner() {
  return (
    <section
      aria-label="Gestor de Rondas"
      className="relative isolate overflow-hidden border-b border-border/80 bg-card"
    >
      <img
        src={rondasHeader}
        alt="Agente em ronda noturna em corredor de unidade socioeducativa"
        width={1920}
        height={720}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative flex min-h-[132px] flex-col justify-center gap-2 px-4 py-5 sm:min-h-[168px] sm:px-6 sm:py-7">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <ShieldCheck className="h-3 w-3" strokeWidth={2.4} />
          Módulo operacional
        </span>

        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Gestor de Rondas
        </h2>

        <p className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Escala por agente, cronômetro sincronizado com o servidor, alarme
          antecipado e histórico auditável do plantão.
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
            Tempo real
          </span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
            Registro por equipe
          </span>
        </div>
      </div>
    </section>
  );
}
