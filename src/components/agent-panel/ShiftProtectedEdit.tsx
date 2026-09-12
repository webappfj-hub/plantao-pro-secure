/**
 * Proteção de escala de plantões
 * Após criada, escala fica bloqueada até confirmar verificação
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock, Edit2, CheckCircle2 } from 'lucide-react';

interface ShiftProtectedEditProps {
  shiftId: string;
  isLocked: boolean;
  onEdit: () => void;
  onVerify: (verified: boolean) => void;
  children?: React.ReactNode;
}

export function ShiftProtectedEdit({
  shiftId,
  isLocked,
  onEdit,
  onVerify,
  children,
}: ShiftProtectedEditProps) {
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  // Gerar código de verificação simples (em produção, usar email real)
  const expectedCode = shiftId.substring(0, 6).toUpperCase();

  const handleUnlock = () => {
    if (verificationCode.toUpperCase() === expectedCode) {
      onVerify(true);
      setVerificationOpen(false);
      onEdit();
    } else {
      alert('Código de verificação incorreto');
    }
  };

  if (isLocked) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-amber-600">Escala Protegida</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Sua escala foi criada e está protegida contra alterações acidentais.
          </p>
          <Button
            onClick={() => setVerificationOpen(true)}
            className="w-full"
            variant="outline"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Desbloquear para Editar
          </Button>

          <AlertDialog open={verificationOpen} onOpenChange={setVerificationOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Verificação Necessária</AlertDialogTitle>
                <AlertDialogDescription>
                  Para editar a escala, precisamos confirmar sua identidade.
                  Um código foi enviado para seu email.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Email de Verificação</Label>
                  <Input
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Código de Verificação (6 dígitos)</Label>
                  <Input
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.toUpperCase())
                    }
                    placeholder="ABC123"
                    className="mt-2 font-mono text-center text-lg"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Verifique seu email para o código. Se não recebeu, clique em
                  "Enviar novamente".
                </p>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button onClick={handleUnlock}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verificar e Desbloquear
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
