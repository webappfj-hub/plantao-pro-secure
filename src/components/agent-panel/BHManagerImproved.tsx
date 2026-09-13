import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit2, Trash2, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BankEntry {
  id: string;
  agent_id: string;
  hours: number;
  operation_type: 'credit' | 'debit';
  description: string | null;
  created_at: string;
}

export function BHManagerImproved() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    hours: '',
    operation_type: 'credit' as 'credit' | 'debit',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('overtime_bank')
        .select('*')
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Erro ao buscar banco de horas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o banco de horas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.hours || !user) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('overtime_bank')
          .update({
            hours: parseFloat(formData.hours),
            operation_type: formData.operation_type,
            description: formData.description || null,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Registro atualizado com sucesso',
        });
      } else {
        // Inserir
        const { error } = await supabase.from('overtime_bank').insert({
          agent_id: user.id,
          hours: parseFloat(formData.hours),
          operation_type: formData.operation_type,
          description: formData.description || null,
        });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Registro adicionado com sucesso',
        });
      }

      resetForm();
      setDialogOpen(false);
      await fetchEntries();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar registro',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return;

    try {
      const { error } = await supabase
        .from('overtime_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Registro deletado com sucesso',
      });
      await fetchEntries();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar registro',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      hours: '',
      operation_type: 'credit',
      description: '',
    });
    setEditingId(null);
  };

  const handleEdit = (entry: BankEntry) => {
    setEditingId(entry.id);
    setFormData({
      hours: entry.hours.toString(),
      operation_type: entry.operation_type,
      description: entry.description || '',
    });
    setDialogOpen(true);
  };

  const totalCredits = entries
    .filter((e) => e.operation_type === 'credit')
    .reduce((sum, e) => sum + e.hours, 0);

  const totalDebits = entries
    .filter((e) => e.operation_type === 'debit')
    .reduce((sum, e) => sum + e.hours, 0);

  const balance = totalCredits - totalDebits;

  return (
    <div className="space-y-6">
      {/* Resumo do Saldo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Créditos</p>
              <p className="text-2xl font-bold text-emerald-500">
                {totalCredits.toFixed(1)}h
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Débitos</p>
              <p className="text-2xl font-bold text-red-500">
                {totalDebits.toFixed(1)}h
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-500/10 to-cyan-500/5 border-blue-500/30' : 'from-orange-500/10 to-amber-500/5 border-orange-500/30'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Saldo</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                {Math.abs(balance).toFixed(1)}h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Adicionar */}
      <Button
        onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}
        className="w-full"
        size="lg"
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Registro
      </Button>

      {/* Dialog de Edição/Inserção */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Registro' : 'Novo Registro de Horas'}
            </DialogTitle>
            <DialogDescription>
              Adicione ou edite um registro no banco de horas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Operação</Label>
              <Select
                value={formData.operation_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    operation_type: value as 'credit' | 'debit',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito (Horas Ganhas)</SelectItem>
                  <SelectItem value="debit">Débito (Horas Usadas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Horas</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
                placeholder="Ex: 2.5"
              />
            </div>

            <div>
              <Label>Descrição (Opcional)</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Banco de horas extraordinário"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {entry.operation_type === 'credit' ? '+' : '-'}
                        {entry.hours.toFixed(1)}h
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          entry.operation_type === 'credit'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {entry.operation_type === 'credit' ? 'Crédito' : 'Débito'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.description || 'Sem descrição'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
