import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, MapPin, Cpu, Radio, Lock } from 'lucide-react';
import iseAcreBadgeUrl from '@/assets/logo-ise-socioeducativo.webp';
import { MadeInFeijoBadge } from './MadeInFeijoBadge';

import { DeveloperSignature } from './DeveloperSignature';

const iseAcreBadge = iseAcreBadgeUrl;
const iseAcreBadgeWebp = iseAcreBadgeUrl;
interface CopyrightFooterProps {
  className?: string;
  compact?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  /** Esconde o selo ISE/Acre — usar quando a página já mostra o selo em
   * outro lugar (ex.: a homepage, que o exibe na barra do cabeçalho, para
   * não duplicar a mesma marca institucional duas vezes na tela). */
  hideBadge?: boolean;
}

/**
 * Rodapé institucional — Obsidian Steel
 * Tactical public-safety identity with steel cyan accents.
 *
 * O fundo é sempre azul-marinho escuro, de propósito, nos dois temas (faixa
 * de marca que "emoldura" o conteúdo claro/escuro do resto da página — o
 * mesmo recurso do header). Por isso todo o texto aqui usa tons fixos de
 * branco (text-white/NN), nunca os tokens de tema (--foreground/
 * --muted-foreground): esses tokens invertem pra escuro no modo claro, o
 * que apagava completamente o texto contra esse fundo sempre-escuro.
 */
export const CopyrightFooter = forwardRef<HTMLDivElement, CopyrightFooterProps>(
  ({ className, compact = false, leftSlot, rightSlot, hideBadge = false }, ref) => {

    const year = new Date().getFullYear();

    if (compact) {
      // Barra de status tática: marca + estado à esquerda, leituras de
      // telemetria (segurança/versão) no centro, conexão/acesso/assinatura à
      // direita. Tudo em uma linha (nowrap) — nada quebra nem empurra.
      const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };
      const chip = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-white/65';
      return (
        <div
          ref={ref}
          className={cn(
            'relative w-full overflow-hidden',
            'border-t border-primary/25',
            'bg-[linear-gradient(180deg,hsl(220_35%_6%/0.94)_0%,hsl(222_40%_4%/0.99)_100%)]',
            'backdrop-blur-md',
            className,
          )}
        >
          {/* Grade tática + brilho + marcas de canto */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'linear-gradient(hsl(var(--primary) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.05) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary))_50%,transparent)]" />
          <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-primary/70" />
          <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-primary/70" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-x-4 gap-y-2 px-3 py-2 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] sm:px-4 sm:py-2.5" style={mono}>
            {/* Esquerda: marca + estado + jurisdição */}
            <div className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
              {leftSlot}
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">PlantãoPro</span>
              <span className="hidden min-[480px]:inline-flex items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-1.5 py-1 leading-none">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-success/95">Operacional</span>
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
                <MapPin className="h-2.5 w-2.5 text-primary/70" />
                Feijó · AC
              </span>
            </div>

            {/* Centro: telemetria */}
            <div className="hidden items-center gap-2 lg:flex">
              <span className={chip}><Lock className="h-3 w-3 text-primary/80" />LGPD · TLS 1.3</span>
              <span className={cn(chip, 'text-white/85')}>v2.7</span>
            </div>

            {/* Direita: conexão/acesso + © + assinatura discreta */}
            <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.18em] text-white/50 sm:justify-end sm:flex-nowrap sm:whitespace-nowrap">
              {rightSlot}
              <span className="hidden min-[360px]:inline">© {year}</span>
              <MadeInFeijoBadge inline size="sm" />
            </div>
          </div>
        </div>
      );
    }


    return (
      <footer
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden',
          'border-t border-primary/20',
          'bg-[linear-gradient(180deg,hsl(220_32%_8%/0.95)_0%,hsl(222_38%_5%/0.98)_100%)]',
          'backdrop-blur-md',
          className,
        )}
      >
        {/* Top steel accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary))_25%,hsl(var(--primary))_75%,transparent_100%)] opacity-85"
        />
        {/* Soft cyan halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-56 w-[55%] rounded-full bg-primary/8 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Institutional Identity */}
            <div className="md:col-span-5 flex items-center gap-3.5">
              {!hideBadge && (
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-md bg-primary/15 blur-md" />
                  <div className="relative h-12 w-12 rounded-md ring-1 ring-primary/35 bg-[linear-gradient(160deg,hsl(222_38%_11%)_0%,hsl(222_45%_6%)_100%)] flex items-center justify-center p-1.5 shadow-[0_4px_14px_hsl(222_60%_2%/0.6)]">
                    <picture>
                      <source type="image/webp" srcSet={iseAcreBadgeWebp} />
                      <img
                        src={iseAcreBadge}
                        alt="Brasão ISE Acre"
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        className="max-h-full max-w-full h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                      />
                    </picture>
                  </div>
                </div>
              )}
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-[0.24em] text-primary uppercase">
                  Instituto Socioeducativo
                </span>
                <span className="text-[13px] font-bold text-white tracking-wide font-serif">
                  PlantãoPro · Comando Tático
                </span>
                <span className="text-[10px] text-white/65 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  Governo do Estado do Acre
                </span>
              </div>
            </div>

            {/* Center: operational status */}
            <div className="md:col-span-3 flex md:justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.06] ring-1 ring-white/15">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-success opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-success/95">
                  Sistema Ativo
                </span>
                <Radio className="h-3 w-3 text-success/70" />
              </div>
            </div>

            {/* Version credit */}
            <div className="md:col-span-4 flex flex-col items-start md:items-end leading-tight gap-1">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-primary/80" />
                <span className="text-[9px] uppercase tracking-[0.22em] text-white/55 font-semibold">
                  Sistema Institucional
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-primary/12 text-primary ring-1 ring-primary/30">
                  v2.7
                </span>
              </div>
              <p className="text-[9px] text-white/45 tracking-wide">
                Feijó · AC · © {year} PlantãoPro
              </p>
            </div>

          </div>

          {/* Bottom hairline */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-white/40">
            <span className="tracking-wider uppercase flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-primary/70" />
              Uso restrito · LGPD compliant
            </span>
            <DeveloperSignature className="order-last sm:order-none" onDark />
            <span className="flex items-center gap-1.5 tracking-wider uppercase">
              <ShieldCheck className="h-3 w-3 text-primary/70" />
              TLS 1.3 · AES-256 · RLS
            </span>
          </div>
        </div>
      </footer>
    );
  },
);

CopyrightFooter.displayName = 'CopyrightFooter';
