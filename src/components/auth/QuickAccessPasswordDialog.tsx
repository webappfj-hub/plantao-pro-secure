import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Trash2, Loader2, User } from 'lucide-react';
import { formatCPF } from '@/lib/validators';
import { removeCredential } from './SavedCredentials';
import { toast } from 'sonner';

interface QuickAccessPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpf: string;
  agentName?: string;
  onConfirm: (cpf: string, password: string, shouldSave: boolean) => Promise<void>;
}

export function QuickAccessPasswordDialog({
  open,
  onOpenChange,
  cpf,
  agentName,
  onConfirm,
}: QuickAccessPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      toast.error('Digite sua senha para continuar');
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(cpf, password, savePassword);
      setPassword('');
      setShowPassword(false);
      setSavePassword(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Password confirmation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogin = () => {
    removeCredential(cpf);
    toast.success('Credencial removida', {
      description: 'O login foi deletado deste dispositivo.',
    });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && password) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-primary/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <User className="h-5 w-5" />
            Confirme sua Senha
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Digite sua senha para fazer login com segurança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credenciais Detectadas */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">
              ✓ Credenciais Detectadas
            </p>
            <div className="space-y-1.5">
              <div>
                <p className="text-xs text-slate-400">Matrícula</p>
                <p className="font-mono text-sm font-bold text-emerald-300">
                  {formatCPF(cpf)}
                </p>
              </div>
              {agentName && (
                <div>
                  <p className="text-xs text-slate-400">Agente</p>
                  <p className="text-sm text-emerald-200">{agentName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Entrada de Senha */}
          <div className="space-y-2">
            <Label htmlFor="quick-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="quick-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••"
                className="h-11 bg-slate-800 border-slate-700 text-white pr-10"
                disabled={isLoading}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 text-slate-500 hover:text-white"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Opção Salvar Senha */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
            <Checkbox
              id="save-pwd"
              checked={savePassword}
              onCheckedChange={(checked) => setSavePassword(!!checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <Label
                htmlFor="save-pwd"
                className="text-xs font-medium text-slate-300 cursor-pointer"
              >
                Salvar senha neste dispositivo
              </Label>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Login rápido válido por 3 dias
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3 flex-col-reverse sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => handleDeleteLogin()}
            disabled={isLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1 sm:flex-initial"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar Login
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 border-slate-700 hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !password}
            className="flex-1 bg-primary text-black hover:bg-primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
