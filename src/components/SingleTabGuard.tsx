import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ilustração institucional — duas janelas do navegador em conflito, uma
 * travada por um cadeado. Mesmo idioma visual (gradientes/bisel) dos outros
 * emblemas táticos do app (ver RoundsManager.tsx: useEmblemFx). */
function DuplicateTabIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-36 shrink-0" aria-hidden role="img">
      <defs>
        <linearGradient id="dtg-back" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="dtg-front" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <radialGradient id="dtg-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dtg-lock" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Janela de fundo (aba "fantasma" tentando abrir) */}
      <g transform="translate(14 8) rotate(-4 60 50)" opacity="0.85">
        <rect x="0" y="0" width="120" height="86" rx="8" fill="url(#dtg-back)" stroke="#475569" strokeWidth="1.2" />
        <rect x="0" y="0" width="120" height="16" rx="8" fill="#1e293b" />
        <circle cx="10" cy="8" r="2.2" fill="#64748b" />
        <circle cx="18" cy="8" r="2.2" fill="#64748b" />
        <circle cx="26" cy="8" r="2.2" fill="#64748b" />
        <rect x="10" y="28" width="70" height="6" rx="3" fill="#475569" />
        <rect x="10" y="42" width="94" height="5" rx="2.5" fill="#334155" />
        <rect x="10" y="53" width="94" height="5" rx="2.5" fill="#334155" />
        <rect x="10" y="64" width="60" height="5" rx="2.5" fill="#334155" />
      </g>

      {/* Janela ativa (a aba original, em foco) */}
      <g transform="translate(30 24)">
        <rect x="0" y="0" width="120" height="86" rx="8" fill="url(#dtg-front)" stroke="#f59e0b" strokeOpacity="0.55" strokeWidth="1.4" />
        <rect x="0" y="0" width="120" height="16" rx="8" fill="#0b1120" />
        <circle cx="10" cy="8" r="2.4" fill="#f59e0b" fillOpacity="0.85" />
        <circle cx="18" cy="8" r="2.4" fill="#f59e0b" fillOpacity="0.55" />
        <circle cx="26" cy="8" r="2.4" fill="#f59e0b" fillOpacity="0.3" />
        <rect x="10" y="28" width="70" height="6" rx="3" fill="#f59e0b" fillOpacity="0.7" />
        <rect x="10" y="42" width="94" height="5" rx="2.5" fill="#334155" />
        <rect x="10" y="53" width="94" height="5" rx="2.5" fill="#334155" />
      </g>

      {/* Auréola de alerta + cadeado central, sobre as duas janelas */}
      <circle cx="80" cy="60" r="34" fill="url(#dtg-glow)" />
      <g transform="translate(80 60)">
        <rect x="-13" y="-2" width="26" height="20" rx="4" fill="url(#dtg-lock)" stroke="#78350f" strokeWidth="1.2" />
        <path d="M-8 -2 V-10 a8 8 0 0 1 16 0 V-2" fill="none" stroke="url(#dtg-lock)" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="0" cy="7" r="2.6" fill="#78350f" />
        <rect x="-1.1" y="8" width="2.2" height="6" rx="1" fill="#78350f" />
      </g>
    </svg>
  );
}

/**
 * SingleTabGuard
 * ---------------
 * Impede que o mesmo site seja aberto em várias abas do mesmo navegador.
 * A PRIMEIRA aba aberta permanece ativa. Abas subsequentes veem uma tela
 * bloqueadora informando que o app já está aberto em outra aba, sem executar
 * a lógica principal (não conta como novo usuário, não gera login, etc.).
 *
 * Estratégia:
 *  - Usa BroadcastChannel para negociar entre abas do mesmo browser.
 *  - Nova aba envia "ping"; abas existentes respondem "pong".
 *  - Se receber "pong" em <=500ms, esta aba é bloqueada.
 *  - Fallback via localStorage heartbeat (para browsers sem BroadcastChannel).
 */

const CHANNEL = "plantaopro-single-tab";
const HEARTBEAT_KEY = "plantaopro_tab_heartbeat";
const HEARTBEAT_INTERVAL = 1500;
const HEARTBEAT_STALE_MS = 4000;

type Msg =
  | { type: "ping"; id: string; ts: number }
  | { type: "pong"; id: string; ts: number }
  | { type: "focus-request"; id: string };

function newTabId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SingleTabGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  // Espelha `blocked` para uso dentro do handler de BroadcastChannel, que é
  // registrado uma única vez (closure fixa). Ler o estado diretamente ali
  // sempre via a versão do primeiro render, fazendo esta instância ecoar
  // "pong" (viva) para sempre, mesmo depois de já ter sido marcada como
  // bloqueada — o que derrubava abas legítimas quando uma aba antiga não
  // era desmontada de forma limpa (crash, aba morta pelo SO, etc.).
  const blockedRef = useRef(false);

  useEffect(() => {
    const myId = newTabId();
    let bc: BroadcastChannel | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let decideTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const markBlocked = () => {
      if (disposed) return;
      blockedRef.current = true;
      setBlocked(true);
      setReady(true);
      // Uma aba bloqueada nunca deve voltar a responder "pong": ela não é
      // candidata a dona, então encerramos o canal para reduzir o risco de
      // virar um respondente fantasma caso a aba nunca seja desmontada.
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
      bc = null;
    };

    const markOwner = () => {
      if (disposed) return;
      blockedRef.current = false;
      setBlocked(false);
      setReady(true);
      // Escreve heartbeat inicial imediatamente.
      writeHeartbeat();
      heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL);
    };

    const writeHeartbeat = () => {
      try {
        localStorage.setItem(
          HEARTBEAT_KEY,
          JSON.stringify({ id: myId, ts: Date.now() })
        );
      } catch {
        /* ignore */
      }
    };

    // 1) Verifica heartbeat existente (fallback / detecção rápida).
    let heartbeatOwner = false;
    try {
      const raw = localStorage.getItem(HEARTBEAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; ts: number };
        if (parsed?.ts && Date.now() - parsed.ts < HEARTBEAT_STALE_MS) {
          heartbeatOwner = true;
        }
      }
    } catch {
      /* ignore */
    }

    // 2) BroadcastChannel para negociação em tempo real.
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(CHANNEL);
      } catch {
        bc = null;
      }
    }

    if (bc) {
      bc.onmessage = (ev: MessageEvent<Msg>) => {
        const msg = ev.data;
        if (!msg || msg.id === myId) return;
        if (msg.type === "ping") {
          // Alguém está entrando — se somos os donos, respondemos "pong".
          if (!blockedRef.current && !disposed) {
            bc?.postMessage({ type: "pong", id: myId, ts: Date.now() } as Msg);
          }
        } else if (msg.type === "pong") {
          // Outra aba já é dona: nós somos o duplicado.
          markBlocked();
          if (decideTimeout) clearTimeout(decideTimeout);
        } else if (msg.type === "focus-request") {
          // Outra aba pediu foco (fluxo raro; principalmente para janela original).
          try {
            window.focus();
          } catch {
            /* ignore */
          }
        }
      };

      // Envia ping para detectar outros.
      bc.postMessage({ type: "ping", id: myId, ts: Date.now() } as Msg);
    }

    // 3) Decisão após breve janela de resposta.
    //    IMPORTANTE: só bloqueamos se outra aba responder AO VIVO ("pong")
    //    pelo BroadcastChannel. O heartbeat do localStorage é apenas dica —
    //    ele pode ficar "preso" quando a aba é fechada de forma abrupta
    //    (crash, mobile em background, kill do SO), gerando falsos positivos.
    void heartbeatOwner;
    decideTimeout = setTimeout(() => {
      if (disposed) return;
      markOwner();
    }, 500);

    // 4) Ao fechar a aba dona, limpa o heartbeat para liberar próxima aba.
    const cleanupHeartbeat = () => {
      try {
        const raw = localStorage.getItem(HEARTBEAT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string };
          if (parsed?.id === myId) {
            localStorage.removeItem(HEARTBEAT_KEY);
          }
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", cleanupHeartbeat);
    window.addEventListener("pagehide", cleanupHeartbeat);

    return () => {
      disposed = true;
      if (decideTimeout) clearTimeout(decideTimeout);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      window.removeEventListener("beforeunload", cleanupHeartbeat);
      window.removeEventListener("pagehide", cleanupHeartbeat);
      cleanupHeartbeat();
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    // Renderiza nada durante a negociação (~500ms) para não iniciar auth/queries
    // em uma aba que pode ser um duplicado.
    return null;
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-6 text-slate-100 backdrop-blur-xl">
        <div className="tactical-cards w-full max-w-md rounded-lg border border-amber-500/40 bg-slate-900/90 p-6 shadow-2xl">
          <div className="mb-4 flex flex-col items-center text-center">
            <DuplicateTabIllustration />
            <h1 className="mt-2 font-mono text-sm uppercase tracking-[0.22em] text-amber-400">
              Aba duplicada detectada
            </h1>
          </div>
          <p className="mb-2 text-center text-sm leading-relaxed text-slate-300">
            O <b>Plantão Pro</b> já está aberto em outra aba deste navegador.
          </p>
          <p className="mb-5 text-center text-xs leading-relaxed text-slate-400">
            Para evitar conflitos de sessão e contagens duplicadas de rondas e
            plantões, o sistema não pode ficar aberto em mais de uma aba ao
            mesmo tempo. Volte para a aba original — esta aqui fica bloqueada
            até que ela seja fechada.
          </p>
          <Button
            variant="outline"
            className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            onClick={() => {
              try {
                const bc = new BroadcastChannel(CHANNEL);
                bc.postMessage({ type: "focus-request", id: "duplicate" });
                setTimeout(() => bc.close(), 200);
              } catch {
                /* ignore */
              }
              window.close();
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ir para a aba original
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
