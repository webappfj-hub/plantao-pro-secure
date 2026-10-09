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
      className="relative isolate flex min-h-[560px] w-full items-center overflow-hidden lg:min-h-[640px]"
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(180deg, hsl(var(--background)) 0%, transparent 18%, transparent 78%, hsl(var(--background)) 100%)," +
            "linear-gradient(90deg, hsl(222 20% 6% / 0.94) 0%, hsl(222 20% 6% / 0.72) 45%, hsl(222 20% 6% / 0.15) 100%)",
        }}
      />

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
            className="text-flow mt-4 font-heading text-[clamp(1.9rem,3.6vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-white animate-fade-in"
            style={{ animationDelay: "160ms" }}
          >
            Gestão de plantões com controle real e segurança institucional.
          </h2>

          <p
            className="mt-4 max-w-lg text-[15px] leading-[1.7] text-white/75 animate-fade-in"
            style={{ animationDelay: "260ms" }}
          >
            Escalas, banco de horas e rondas em um único sistema, feito para
            as unidades do Sistema Socioeducativo do Acre.
          </p>

          <div
            className="glass mt-7 grid max-w-md grid-cols-3 gap-6 rounded-xl px-5 py-4 animate-fade-in"
            style={{ animationDelay: "360ms" }}
          >
            {[
              { k: "9", v: "Unidades" },
              { k: "24/7", v: "Operação" },
              { k: "AES-256", v: "Criptografia" },
            ].map((m) => (
              <div key={m.v} className="flex flex-col">
                <span className="text-xl font-bold leading-none text-white">{m.k}</span>
                <span className="mt-1.5 text-[11px] uppercase tracking-wider text-white/55">{m.v}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center animate-fade-in"
            style={{ animationDelay: "460ms" }}
          >
            <button
              type="button"
              onClick={handlePrimary}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Entrar no sistema
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/about")}
              className="glass inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Saiba mais
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
