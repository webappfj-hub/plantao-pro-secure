import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Alternador de modo claro/escuro — preferência por dispositivo (localStorage),
 * independente do tema institucional (que é global via banco de dados).
 * Afeta toda a aplicação porque altera as mesmas CSS vars usadas em todo o app.
 */
export function ColorModeToggle({ className, variant = 'floating' }: { className?: string; variant?: 'floating' | 'header' }) {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === 'light';

  return (
    <button
      type="button"
      onClick={toggleColorMode}
      aria-label={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={isLight ? 'Modo escuro' : 'Modo claro'}
      className={cn(
        // Alvo de toque: o botão do header visualmente tem 36px, abaixo do
        // mínimo de 44px recomendado — o ::before invisível estende a área
        // clicável sem aumentar o círculo visual (evita ficar "inchado" ao
        // lado de outros ícones do header).
        'relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'header'
          ? "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground shadow-sm transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:border-primary/50 hover:bg-muted"
          : 'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
        className,
      )}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
