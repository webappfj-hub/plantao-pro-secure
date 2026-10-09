import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { CommandClock } from '../CommandClock';
import { ScheduleEditor } from '../ScheduleEditor';
import type { PatrolSlot } from '../../types';
import type { RoundTimerState } from '../../useRoundTimer';

vi.mock('../../api', () => ({ updateSlot: vi.fn(), deleteSlot: vi.fn(), addSlot: vi.fn() }));

const timer = (over: Partial<RoundTimerState> = {}): RoundTimerState => ({
  secondsRemaining: 300, secondsElapsed: 600, totalSeconds: 900,
  isPaused: false, isLate: false, isOverdue: false, progressPct: 66, ...over,
});

describe('CommandClock', () => {
  it('em ronda mostra o tempo restante', () => {
    render(<CommandClock color="#fcd34d" active={{ timer: timer(), sector: 'Bloco A' }} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('Ronda em andamento: 05:00');
    expect(screen.getByText('Bloco A')).toBeInTheDocument();
  });
  it('estourado mostra o excesso', () => {
    render(<CommandClock color="#fcd34d" active={{ timer: timer({ isOverdue: true, secondsRemaining: 0, secondsElapsed: 960 }) }} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('Tempo excedido: +01:00');
  });
});

const slot = (id: string, status: PatrolSlot['status'], startUtc: string, endUtc: string): PatrolSlot => ({
  id, shift_id: 's1', agent_id: null, sector_id: null, scheduled_start: startUtc, scheduled_end: endUtc,
  started_at: null, completed_at: null, paused_at: null, paused_seconds: 0, status, notes: null,
});

describe('ScheduleEditor', () => {
  it('só os quartos pendentes viram editáveis', () => {
    render(
      <ConfirmProvider>
        <ScheduleEditor
          shiftId="s1"
          slots={[
            slot('a', 'completed', '2026-10-09T03:00:00Z', '2026-10-09T03:15:00Z'),
            slot('b', 'pending', '2026-10-09T03:15:00Z', '2026-10-09T03:30:00Z'),
          ]}
          agents={[]}
          sectors={[]}
          intervalMinutes={15}
          onChanged={() => {}}
        />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /editar programação/i }));
    expect(screen.getByLabelText('Início 22:15–22:30')).toHaveValue('22:15');
    expect(screen.queryByLabelText('Início 22:00–22:15')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /adicionar quarto/i }));
    expect(screen.getByText('Novo quarto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações \(1\)/i })).toBeEnabled();
  });
});
