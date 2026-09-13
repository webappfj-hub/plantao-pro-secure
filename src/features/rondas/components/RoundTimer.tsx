import { formatClock, type RoundTimerState } from '../useRoundTimer';
import { TacticalChronometer } from './TacticalChronometer';

interface RoundTimerProps {
  timer: RoundTimerState;
  size?: number;
  /** Cor de destaque do mostrador — normalmente a cor da equipe. */
  color?: string;
}

/** Cronômetro tático da ronda atual — mostrador com marcações, ponteiro de
 * varredura e vidro, no lugar do anel liso de antes. Cor muda por urgência,
 * mas o texto/label sempre acompanha (não depende só de cor, Seção 27/49). */
export function RoundTimer({ timer, size = 220, color = 'hsl(var(--primary))' }: RoundTimerProps) {
  const { secondsRemaining, totalSeconds, progressPct, isPaused, isLate } = timer;

  const pctRemaining = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0;
  const tone = isLate || pctRemaining <= 0
    ? 'danger'
    : pctRemaining <= 0.15
    ? 'warning'
    : 'normal';

  const label = isPaused ? 'PAUSADO' : tone === 'danger' ? 'ATRASADO' : 'TEMPO RESTANTE';

  return (
    <TacticalChronometer
      size={size}
      progressPct={progressPct}
      color={tone === 'warning' ? 'hsl(var(--warning))' : color}
      urgent={tone === 'danger'}
      topLabel={label}
      centerLabel={formatClock(secondsRemaining)}
      bottomLabel={`de ${formatClock(totalSeconds)}`}
    />
  );
}
