import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SplitSquareHorizontal, Users, MapPin } from 'lucide-react';
import { generateSlotPreview } from '../api';
import type { DistributionStrategy, PatrolAgentAssignment, PatrolSector } from '../types';
import { AgentScheduleTimeline, buildAgentWindows } from './AgentScheduleTimeline';

interface ShiftDividerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: Date;
  endAt: Date;
  intervalMinutes: number;
  agents: PatrolAgentAssignment[];
  sectors: PatrolSector[];
  onConfirm: (input: { strategy: DistributionStrategy; agentIds: string[]; sectorIds: string[] }) => Promise<void>;
}

const STRATEGIES: { value: DistributionStrategy; label: string; hint: string }[] = [
  { value: 'blocks', label: 'Blocos', hint: 'Cada agente cobre um bloco contínuo do turno' },
  { value: 'rotative', label: 'Rotativo', hint: 'Os agentes se revezam a cada quarto de hora' },
  { value: 'manual', label: 'Manual', hint: 'Cria a grade de horários; você atribui agente depois' },
];

/** Divide o turno em quartos de hora e distribui agentes. Mostra preview
 * antes de gravar (Seção 25). */
export function ShiftDivider({ open, onOpenChange, startAt, endAt, intervalMinutes, agents, sectors, onConfirm }: ShiftDividerProps) {
  const [strategy, setStrategy] = useState<DistributionStrategy>('blocks');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents.map((a) => a.agent_id));
  const [selectedSectors, setSelectedSectors] = useState<string[]>(sectors.map((s) => s.id));
  const [saving, setSaving] = useState(false);

  // agents/sectors chegam de forma assíncrona (query separada) — re-sincroniza
  // a seleção sempre que o diálogo abre com uma lista nova (Seção 25).
  useEffect(() => {
    if (!open) return;
    setSelectedAgents(agents.map((a) => a.agent_id));
    setSelectedSectors(sectors.map((s) => s.id));
  }, [open, agents, sectors]);

  const preview = useMemo(
    () => generateSlotPreview({ shiftId: '', startAt, endAt, intervalMinutes, sectorIds: selectedSectors, agentIds: selectedAgents, strategy }),
    [startAt, endAt, intervalMinutes, selectedSectors, selectedAgents, strategy],
  );

  const agentMetaById = useMemo(
    () => new Map(agents.map((a) => [a.agent_id, { name: a.agent?.name ?? 'Agente', avatarUrl: a.agent?.avatar_url }])),
    [agents],
  );
  const previewWindows = useMemo(
    () => buildAgentWindows(preview, (id) => (id ? agentMetaById.get(id) ?? { name: 'Agente' } : { name: 'Sem agente' })),
    [preview, agentMetaById],
  );

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({ strategy, agentIds: selectedAgents, sectorIds: selectedSectors });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 border-b border-border bg-primary/[0.06] px-5 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <SplitSquareHorizontal className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-sm">Dividir turno</DialogTitle>
            <DialogDescription className="text-xs">Gera os quartos de hora e distribui os agentes escalados.</DialogDescription>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3.5 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estratégia</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as DistributionStrategy)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{STRATEGIES.find((s) => s.value === strategy)?.hint}</p>
          </div>

          {agents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" /> Agentes ({selectedAgents.length} selecionados)
              </Label>
              <div className="max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5">
                {agents.map((a) => (
                  <label key={a.agent_id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-background">
                    <Checkbox checked={selectedAgents.includes(a.agent_id)} onCheckedChange={() => toggle(selectedAgents, setSelectedAgents, a.agent_id)} />
                    <span className="truncate text-foreground">{a.agent?.name ?? a.agent_id}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {sectors.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Setores ({selectedSectors.length} selecionados)
              </Label>
              <div className="max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5">
                {sectors.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-background">
                    <Checkbox checked={selectedSectors.includes(s.id)} onCheckedChange={() => toggle(selectedSectors, setSelectedSectors, s.id)} />
                    <span className="truncate text-foreground">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{preview.length}</span> slots serão criados
            {preview.length > 0 && (
              <>
                {' '}({preview[0].scheduled_start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' })} até{' '}
                {preview[preview.length - 1].scheduled_end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' })})
              </>
            )}</span>
          </div>

          {previewWindows.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévia — tempo de cada agente</Label>
              <AgentScheduleTimeline
                rangeStart={startAt}
                rangeEnd={endAt}
                windows={previewWindows}
                title="Divisão prevista"
              />
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-5 py-3.5">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving || preview.length === 0} className="gap-1.5">
            {saving ? 'Gerando...' : `Gerar ${preview.length} slots`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
