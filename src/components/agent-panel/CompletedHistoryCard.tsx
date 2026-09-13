/**
 * Histórico de Plantões Cumpridos + Banco de Horas
 * Uma única área para guardar histórico completo de trabalho
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

interface CompletedShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  team: string;
  duration_hours: number;
  completed_at: string;
}

interface BankEntry {
  id: string;
  hours: number;
  operation_type: 'credit' | 'debit';
  description: string | null;
  created_at: string;
}

export function CompletedHistoryCard() {
  const { user } = useAuth();
  const [completedShifts, setCompletedShifts] = useState<CompletedShift[]>([]);
  const [bankHistory, setBankHistory] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        // Buscar plantões cumpridos
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('agent_shifts')
          .select('*')
          .eq('agent_id', user.id)
          .eq('status', 'completed')
          .order('shift_date', { ascending: false })
          .limit(100);

        if (shiftsError) throw shiftsError;
        setCompletedShifts(shiftsData || []);

        // Buscar histórico de banco de horas
        const { data: bhData, error: bhError } = await supabase
          .from('overtime_bank')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (bhError) throw bhError;
        setBankHistory(bhData || []);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // Calcular estatísticas
  const totalCompletedShifts = completedShifts.length;
  const totalHoursWorked = completedShifts.reduce(
    (sum, s) => sum + (s.duration_hours || 0),
    0
  );
  const totalBHCredits = bankHistory
    .filter((b) => b.operation_type === 'credit')
    .reduce((sum, b) => sum + b.hours, 0);
  const totalBHDebits = bankHistory
    .filter((b) => b.operation_type === 'debit')
    .reduce((sum, b) => sum + b.hours, 0);

  const ShiftsTab = () => (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-blue-500/10 p-3">
          <p className="text-2xl font-bold text-blue-600">{totalCompletedShifts}</p>
          <p className="text-xs text-muted-foreground">Plantões Cumpridos</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-3">
          <p className="text-2xl font-bold text-emerald-600">
            {totalHoursWorked.toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground">Total Trabalhado</p>
        </div>
      </div>

      {/* Lista de plantões */}
      <ScrollArea className="h-96 border rounded-lg p-3">
        {completedShifts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhum plantão cumprido no histórico
          </p>
        ) : (
          <div className="space-y-2">
            {completedShifts.map((shift) => (
              <div
                key={shift.id}
                className="p-3 rounded-lg border border-border bg-emerald-500/5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        {format(parseISO(shift.shift_date), 'dd MMM yyyy', {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {shift.start_time} - {shift.end_time}
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600">
                    {shift.duration_hours || 12}h
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  {shift.team}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const BankTab = () => (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">
            {totalBHCredits.toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground">Créditos</p>
        </div>
        <div className="rounded-lg bg-red-500/10 p-3 text-center">
          <p className="text-lg font-bold text-red-600">
            {totalBHDebits.toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground">Débitos</p>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">
            {(totalBHCredits - totalBHDebits).toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground">Saldo</p>
        </div>
      </div>

      {/* Lista de movimentações */}
      <ScrollArea className="h-96 border rounded-lg p-3">
        {bankHistory.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma movimentação no banco de horas
          </p>
        ) : (
          <div className="space-y-2">
            {bankHistory.map((entry) => (
              <div
                key={entry.id}
                className={`p-3 rounded-lg border border-border ${
                  entry.operation_type === 'credit'
                    ? 'bg-emerald-500/5'
                    : 'bg-red-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">
                    {entry.operation_type === 'credit' ? '+' : '-'}
                    {entry.hours.toFixed(1)}h
                  </span>
                  <Badge
                    className={
                      entry.operation_type === 'credit'
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-red-500/20 text-red-600'
                    }
                  >
                    {entry.operation_type === 'credit' ? 'Crédito' : 'Débito'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.description || 'Sem descrição'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(entry.created_at), 'dd MMM yyyy HH:mm', {
                    locale: ptBR,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Histórico Completo</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="shifts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shifts">
              <Calendar className="h-4 w-4 mr-2" />
              Plantões Cumpridos
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Clock className="h-4 w-4 mr-2" />
              Banco de Horas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shifts" className="mt-4">
            <ShiftsTab />
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <BankTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
