import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroAgentesViatura from "@/assets/midias/hero-agentes-viatura.webp";

// Foto institucional oficial (fornecida pelo usuário) — equipe e viatura do
// Sistema Socioeducativo do Acre.
const IMG_URL = heroAgentesViatura;

interface CinematicBrandHeroProps {
  onScrollToLogin?: () => void;
  onMasterClick?: () => void;
}

/**
 * Seção institucional exibida abaixo do painel operacional na home.
 * Composição sóbria: imagem oficial à direita, mensagem e indicadores
 * institucionais à esquerda. Um único acento de cor (azul institucional).
 */
export function CinematicBrandHero({
  onScrollToLogin,
}: CinematicBrandHeroProps) {
  const navigate = useNavigate();
  const { user, masterSession } = useAuth();
  const isAuthenticated = !!user || !!masterSession;

  const scrollToTeams = () => {
    if (onScrollToLogin) {
      onScrollToLogin();
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrimary = () => {
    if (isAuthenticated) {
      navigate("/agent-panel");
      return;
    }
    scrollToTeams();
  };

  return (
    <section
      aria-label="PlantãoPro — Sistema de gestão de plantões"
      className="relative isolate flex min-h-[560px] w-full items-center overflow-hidden border-y border-border/60 lg:min-h-[640px]"
      style={{ background: "hsl(222 20% 6%)" }}
    >
      {/* Foto em tela cheia — dá continuidade visual com as seções vizinhas */}
      <img
        src={IMG_URL}
        alt="Agentes da Socioeducação do Acre em frente à unidade e viatura oficial"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full select-none object-cover object-[62%_35%] lg:object-[58%_32%]"
        style={{ filter: "saturate(0.95) contrast(1.03)" }}
      />
      {/* Scrim: escurece o lado do texto e dissolve topo/base no fundo da página */}
      <div aria-hidden className="hero-scrim pointer-events-none absolute inset-0 -z-10" />

      <div aria-hidden className="hero-vfade pointer-events-none absolute inset-0 -z-10" />

      <div className="relative z-10 w-full px-6 py-14 sm:px-10 lg:px-14">
        <div className="max-w-2xl">
          <div
            className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary animate-fade-in"
            style={{ animationDelay: "80ms" }}
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span>Sistema Socioeducativo do Acre</span>
          </div>

          <h2
            className="text-flow mt-4 [filter:drop-shadow(0_2px_14px_rgb(0_0_0/0.65))] font-heading text-[clamp(1.9rem,3.6vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-white animate-fade-in"
            style={{ animationDelay: "160ms" }}
          >
            Feito por agentes, para quem está no plantão.
          </h2>

          <p
            className="mt-4 max-w-lg text-[15px] leading-[1.7] text-white/90 [text-shadow:0_1px_14px_rgb(0_0_0/0.75),0_0_2px_rgb(0_0_0/0.6)] animate-fade-in"
            style={{ animationDelay: "260ms" }}
          >
            Desenvolvido em Feijó/AC para as unidades do Sistema Socioeducativo — com segurança,
            registro e transparência em cada turno.
          </p>

          <div
            className="metal-bezel relative mt-7 max-w-md animate-fade-in"
            style={{ animationDelay: "360ms" }}
          >
            <span className="metal-face"><span className="metal-sheen" /></span>
            <div className="relative z-10 grid grid-cols-3 gap-6 px-5 py-4">
            {[
              { k: "9", v: "Unidades" },
              { k: "24/7", v: "Operação" },
              { k: "AES-256", v: "Criptografia" },
            ].map((m) => (
              <div key={m.v} className="flex flex-col">
                <span className="text-xl font-bold leading-none text-white [text-shadow:0_1px_0_rgb(0_0_0/0.6)]">{m.k}</span>
                <span className="mt-1.5 text-[11px] uppercase tracking-wider text-slate-300/70">{m.v}</span>
              </div>
            ))}
            </div>
          </div>

          <div
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center animate-fade-in"
            style={{ animationDelay: "460ms" }}
          >
            <button
              type="button"
              onClick={handlePrimary}
              className="metal-bezel group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-none"
              style={{ ['--ch' as string]: '10px', ['--tint' as string]: 'hsl(var(--primary) / 0.55)', ['--face-a' as string]: '#2a62c0', ['--face-b' as string]: '#0f2f69', ['--face-c' as string]: '#071a3f' }}
            >
              <span className="metal-face"><span className="metal-sheen" /></span>
              <span className="relative z-10 inline-flex items-center gap-2 [text-shadow:0_1px_0_rgb(0_0_0/0.55)]">
                Entrar no sistema
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/about")}
              className="metal-bezel group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-none"
              style={{ ['--ch' as string]: '10px' }}
            >
              <span className="metal-face" />
              <span className="relative z-10 [text-shadow:0_1px_0_rgb(0_0_0/0.55)]">Saiba mais</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
