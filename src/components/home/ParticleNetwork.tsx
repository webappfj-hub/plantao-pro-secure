import { useEffect, useRef } from 'react';

interface Particle { x: number; y: number; vx: number; vy: number; r: number }

/**
 * Rede de partículas em canvas: pontos à deriva, linhas entre os próximos,
 * o mouse repele e liga fios, o clique solta 3 pontos novos. Ocupa o pai
 * (que deve ser `relative`); os eventos são ouvidos no próprio pai.
 */
export function ParticleNetwork({ rgb = '56, 189, 248', className }: { rgb?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: -9999, y: -9999, active: false };
    let w = 0, h = 0, raf = 0, visible = true;
    let pts: Particle[] = [];
    const t0 = performance.now();

    const spawn = (x: number, y: number, v: number): Particle => {
      const a = Math.random() * Math.PI * 2;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0.9 + Math.random() * 0.9 };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(26, Math.max(8, Math.round((w * h) / 28000)));
      pts = Array.from({ length: n }, () => spawn(Math.random() * w, Math.random() * h, 0.12 + Math.random() * 0.3));
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      const reach = Math.min((performance.now() - t0) / 3000, 1) * (w < 640 ? 85 : 120);
      for (const p of pts) {
        if (!reduced) { p.x += p.vx; p.y += p.vy; }
        if (p.x < 0 || p.x > w) { p.vx *= -1; p.x = Math.min(w, Math.max(0, p.x)); }
        if (p.y < 0 || p.y > h) { p.vy *= -1; p.y = Math.min(h, Math.max(0, p.y)); }
        if (Math.hypot(p.vx, p.vy) > 0.45) { p.vx *= 0.985; p.vy *= 0.985; }
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 120 && d > 1) { const f = (120 - d) / 120 * 1.8; p.x += dx / d * f; p.y += dy / d * f; }
        }
      }
      ctx.lineWidth = 0.9;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < reach) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - d / reach) * 0.38})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.active) {
          const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (d < 170) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - d / 170) * 0.6})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = `rgba(${rgb}, 0.4)`;
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };

    const rel = (e: { clientX: number; clientY: number }) => {
      const r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
    };
    const onMove = (e: MouseEvent) => rel(e);
    const onLeave = () => { mouse.active = false; };
    const onClick = (e: MouseEvent) => {
      rel(e);
      for (let i = 0; i < 3; i++) pts.push(spawn(mouse.x, mouse.y, 0.45 * (0.7 + Math.random() * 0.6)));
      if (pts.length > 36) pts.splice(0, pts.length - 36);
      if (reduced) frame();
    };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) rel(t); };

    resize(); frame();
    const ro = new ResizeObserver(() => { resize(); if (reduced) frame(); });
    ro.observe(host);
    // pausa fora da tela para não gastar bateria
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    });
    io.observe(host);
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);
    host.addEventListener('click', onClick);
    host.addEventListener('touchstart', onTouch, { passive: true });
    host.addEventListener('touchmove', onTouch, { passive: true });
    host.addEventListener('touchend', onLeave);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      host.removeEventListener('click', onClick);
      host.removeEventListener('touchstart', onTouch);
      host.removeEventListener('touchmove', onTouch);
      host.removeEventListener('touchend', onLeave);
    };
  }, [rgb]);

  return <canvas ref={ref} aria-hidden className={className ?? 'pointer-events-none absolute inset-0 z-[5] h-full w-full'} />;
}
