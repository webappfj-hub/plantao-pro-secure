import { Lock, LockOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  month: Date;
  /** Quantidade de registros do mês navegado (BH, plantões…). */
  records: number;
  /** Rótulo do tipo de registro: "BH", "plantões". */
  noun: string;
  closed: boolean;
  unlocked: boolean;
  onRequestUnlock: () => void;
  onRelock: () => void;
}

/** Faixa do mês navegado: mostra o cadeado (mês passado com registros) e, se
 * destravado, o aviso e o botão para travar de novo. Consulta é sempre livre. */
export function MonthLockBar({ month, records, noun, closed, unlocked, onRequestUnlock, onRelock }: Props) {
  const label = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  if (records === 0) {
    return (
      <p className="text-xs text-slate-400 capitalize">
        {label}: nenhum registro de {noun}.
      </p>
    );
  }
  if (closed) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
        <p className="flex items-center gap-2 text-xs text-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <span><b className="capitalize">{label}</b> está fechado ({records} registro{records > 1 ? 's' : ''}). Consulta liberada; edição bloqueada.</span>
        </p>
        <Button size="sm" variant="outline" className="h-9 border-amber-500/50 text-amber-200 hover:bg-amber-500/15" onClick={onRequestUnlock}>
          <LockOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Desbloquear
        </Button>
      </div>
    );
  }
  if (unlocked) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
        <p className="flex items-center gap-2 text-xs text-emerald-200">
          <LockOpen className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <span><b className="capitalize">{label}</b> aberto para edição nesta sessão.</span>
        </p>
        <Button size="sm" variant="outline" className="h-9 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/15" onClick={onRelock}>
          <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Bloquear de novo
        </Button>
      </div>
    );
  }
  return (
    <p className="text-xs text-slate-400 capitalize">
      {label}: {records} registro{records > 1 ? 's' : ''} de {noun}.
    </p>
  );
}

interface ConfirmProps {
  open: boolean;
  month: Date;
  noun: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmação obrigatória para abrir um mês fechado para edição. */
export function UnlockMonthDialog({ open, month, noun, onCancel, onConfirm }: ConfirmProps) {
  const label = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" aria-hidden /> Abrir <span className="capitalize">{label}</span> para edição?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Os registros de {noun} deste mês já foram encerrados. Alterá-los pode mudar valores já apurados. O mês fica aberto
            só nesta sessão e volta a ficar bloqueado depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter bloqueado</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sim, abrir para edição</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
