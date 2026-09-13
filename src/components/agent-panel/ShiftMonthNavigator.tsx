/**
 * Navegador de meses para visualizar plantões futuros e histórico
 */

import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  team: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface ShiftMonthNavigatorProps {
  shifts: Shift[];
  onMonthChange?: (date: Date) => void;
}

export function ShiftMonthNavigator({ shifts, onMonthChange }: ShiftMonthNavigatorProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => {
    const newDate = subMonths(currentMonth, 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentMonth, 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Filtrar plantões do mês atual
  const monthShifts = shifts.filter((s) => {
    const shiftDate = new Date(s.shift_date);
    return shiftDate >= monthStart && shiftDate <= monthEnd;
  });

  // Agrupar por semana
  const weeks: Shift[][] = [];
  let currentWeek: Shift[] = [];

  monthShifts.forEach((shift) => {
    const day = new Date(shift.shift_date).getDate();
    currentWeek.push(shift);

    if (day % 7 === 0 || shifts.indexOf(shift) === monthShifts.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Status badges
  const statusConfig = {
    active: { label: 'Ativo', color: 'bg-blue-500/20 text-blue-600' },
    completed: { label: 'Cumprido', color: 'bg-emerald-500/20 text-emerald-600' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-600' },
  };

  const isCurrentMonth =
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  const isFutureMonth = currentMonth > new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            {isFutureMonth && (
              <Badge variant="outline" className="ml-2">
                Futuro
              </Badge>
            )}
            {isCurrentMonth && (
              <Badge className="ml-2 bg-primary/20 text-primary">
                Atual
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {monthShifts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum plantão em {format(currentMonth, 'MMMM', { locale: ptBR })}
            </p>
          ) : (
            <>
              {/* Resumo do mês */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {monthShifts.filter((s) => s.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {monthShifts.filter((s) => s.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Cumpridos</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {monthShifts.filter((s) => s.status === 'cancelled').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Cancelados</p>
                </div>
              </div>

              {/* Lista de plantões */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {monthShifts.map((shift) => {
                  const config = statusConfig[shift.status];
                  const shiftDate = new Date(shift.shift_date);

                  return (
                    <div
                      key={shift.id}
                      className={cn(
                        'p-3 rounded-lg border border-border hover:bg-muted/50 transition',
                        shift.status === 'active' && 'border-blue-500/30 bg-blue-500/5',
                        shift.status === 'completed' && 'border-emerald-500/30 bg-emerald-500/5',
                        shift.status === 'cancelled' && 'border-red-500/30 bg-red-500/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {format(shiftDate, 'EEE, dd MMM', { locale: ptBR })}
                            </span>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                              ⏰ {shift.start_time} - {shift.end_time || '??:??'}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                              {shift.team}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
