import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  team: string;
  unit_id: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export function ShiftManagerImproved() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '17:00',
    team: 'ALFA',
    unit_id: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'cancelled',
  });

  useEffect(() => {
    if (user) {
      fetchShifts();
    }
  }, [user]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', user?.id)
        .order('shift_date', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Erro ao buscar plantões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os plantões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.shift_date || !formData.start_time || !user) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        // Atualizar plantão
        const { error } = await supabase
          .from('agent_shifts')
          .update({
            shift_date: formData.shift_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            team: formData.team,
            unit_id: formData.unit_id,
            description: formData.description || null,
            status: formData.status,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Plantão atualizado com sucesso',
        });
      } else {
        // Criar novo plantão
        const { error } = await supabase.from('agent_shifts').insert({
          agent_id: user.id,
          shift_date: formData.shift_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          team: formData.team,
          unit_id: formData.unit_id,
          description: formData.description || null,
          status: formData.status,
        });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Plantão criado com sucesso',
        });
      }

      resetForm();
      setDialogOpen(false);
      await fetchShifts();
    } catch (error) {
      console.error('Erro ao salvar plantão:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar plantão',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este plantão?')) return;

    try {
      const { error } = await supabase.from('agent_shifts').delete().eq('id', id);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Plantão deletado com sucesso',
      });
      await fetchShifts();
    } catch (error) {
      console.error('Erro ao deletar plantão:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar plantão',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      shift_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '17:00',
      team: 'ALFA',
      unit_id: '',
      description: '',
      status: 'active',
    });
    setEditingId(null);
  };

  const handleEdit = (shift: Shift) => {
    setEditingId(shift.id);
    setFormData({
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time || '17:00',
      team: shift.team,
      unit_id: shift.unit_id,
      description: shift.description || '',
      status: shift.status,
    });
    setDialogOpen(true);
  };

  const activeShifts = shifts.filter((s) => s.status === 'active').length;
  const completedShifts = shifts.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Resumo de Plantões */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Plantões Ativos</p>
              <p className="text-2xl font-bold text-blue-500">{activeShifts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Concluídos</p>
              <p className="text-2xl font-bold text-emerald-500">{completedShifts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Criar Plantão */}
      <Button
        onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}
        className="w-full"
        size="lg"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo Plantão
      </Button>

      {/* Dialog de Edição/Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Plantão' : 'Criar Novo Plantão'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do seu plantão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Data do Plantão</Label>
              <Input
                type="date"
                value={formData.shift_date}
                onChange={(e) =>
                  setFormData({ ...formData, shift_date: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hora de Início</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Hora de Fim</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Equipe</Label>
                <Select
                  value={formData.team}
                  onValueChange={(value) =>
                    setFormData({ ...formData, team: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALFA">ALFA</SelectItem>
                    <SelectItem value="BRAVO">BRAVO</SelectItem>
                    <SelectItem value="CHARLIE">CHARLIE</SelectItem>
                    <SelectItem value="DELTA">DELTA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as 'active' | 'completed' | 'cancelled',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição (Opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Plantão extraordinário"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Atualizar' : 'Criar Plantão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Plantões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meus Plantões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum plantão registrado
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {format(new Date(shift.shift_date), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {shift.start_time} - {shift.end_time || '??:??'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                        {shift.team}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          shift.status === 'active'
                            ? 'bg-blue-500/20 text-blue-500'
                            : shift.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {shift.status === 'active'
                          ? 'Ativo'
                          : shift.status === 'completed'
                          ? 'Concluído'
                          : 'Cancelado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(shift)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(shift.id)}
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
