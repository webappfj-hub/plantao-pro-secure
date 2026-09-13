import { useRef, useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RoundSharePoster, type RoundSharePosterProps } from './RoundSharePoster';

/**
 * Botão "Compartilhar escala" — renderiza o cartão fora da tela (mesma
 * largura fixa sempre, pra imagem sair igual não importa o dispositivo),
 * captura com html2canvas só quando clicado (import dinâmico: não pesa no
 * bundle inicial nem em quem nunca usa) e usa Web Share quando disponível
 * (mobile), com fallback de download direto (desktop/navegadores antigos).
 */
export function ShareScheduleButton(props: RoundSharePosterProps) {
  const posterRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    const el = posterRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0e17',
        scale: 2,
        useCORS: true,
        width: el.offsetWidth,
      });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('falha ao gerar imagem');

      const filename = `escala-equipe-${props.team.toLowerCase()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'Escala de rondas', text: `Escala da equipe ${props.team}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Imagem baixada — envie para a equipe.');
      }
    } catch (e) {
      console.error('[ShareScheduleButton]', e);
      toast.error('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs sm:h-8 sm:px-3" onClick={handleShare} disabled={busy || props.windows.length === 0}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{busy ? 'Gerando...' : 'Compartilhar escala'}</span>
      </Button>

      {/* Fora da tela, mas com layout real (offsetWidth/Height válidos) —
          html2canvas precisa que o elemento esteja no DOM e visível pro
          navegador, só não pros olhos do usuário. */}
      <div aria-hidden className="pointer-events-none fixed left-0 top-0 -z-50 opacity-0" style={{ transform: 'translateX(-9999px)' }}>
        <RoundSharePoster ref={posterRef} {...props} />
      </div>
    </>
  );
}
