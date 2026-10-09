import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MonthLockBar, UnlockMonthDialog } from '../MonthLockBar';

const month = new Date(2026, 8, 1);

describe('MonthLockBar', () => {
  it('mês fechado mostra o cadeado e pede desbloqueio', () => {
    const onRequestUnlock = vi.fn();
    render(<MonthLockBar month={month} records={3} noun="BH" closed unlocked={false} onRequestUnlock={onRequestUnlock} onRelock={() => {}} />);
    expect(screen.getByText(/está fechado \(3 registros\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /desbloquear/i }));
    expect(onRequestUnlock).toHaveBeenCalled();
  });
  it('mês sem registros não tem cadeado', () => {
    render(<MonthLockBar month={month} records={0} noun="BH" closed={false} unlocked={false} onRequestUnlock={() => {}} onRelock={() => {}} />);
    expect(screen.getByText(/nenhum registro de BH/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('destravado oferece bloquear de novo', () => {
    const onRelock = vi.fn();
    render(<MonthLockBar month={month} records={2} noun="BH" closed={false} unlocked onRequestUnlock={() => {}} onRelock={onRelock} />);
    fireEvent.click(screen.getByRole('button', { name: /bloquear de novo/i }));
    expect(onRelock).toHaveBeenCalled();
  });
});

describe('UnlockMonthDialog', () => {
  it('só abre após confirmar', () => {
    const onConfirm = vi.fn();
    render(<UnlockMonthDialog open month={month} noun="BH" onCancel={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText(/já foram encerrados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sim, abrir para edição/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
