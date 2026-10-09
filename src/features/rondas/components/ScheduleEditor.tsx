import { useMemo, useState } from 'react';
import { CalendarClock, Lock, Pencil, Plus, Save, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-provider';
import { cn } from '@/lib/utils';
import * as api from '../api';
import { acreHM, retimeSlot } from '../scheduleTime';
import type { PatrolAgentAssignment, PatrolSector, PatrolSlot, PatrolSlotStatus } from '../types';

const EDITABLE: PatrolSlotStatus[] = ['pending', 'late'];
const NONE = '__none__';

const STATUS: Record<PatrolSlotStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'border-white/15 text-slate-300' },
  late: { label: 'Atrasada', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  active: { label: 'Em andamento', cls: 'border-sky-400/40 bg-sky-400/10 text-sky-300' },
  completed: { label: 'Concluída', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  incident: { label: 'Ocorrência', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  cancelled: { label: 'Cancelada', cls: 'border-white/10 text-slate-500 line-through' },
};

interface Draft { start: string; end: string; agentId: string; sectorId: string }
interface NewRow extends Draft { key: string; baseIso: string }

interface Props {
  shiftId: string;
  slots: PatrolSlot[];
  agents: PatrolAgentAssignment[];
  sectors: PatrolSector[];
  intervalMinutes: number;
  onChanged: () => void;
}

/**
 * Programação do turno — lista cronológica de todos os quartos. Em modo de
 * edição, os quartos ainda não iniciados (pendentes/atrasados) podem ter
 * horário, agente e setor alterados, ser removidos, e novos quartos podem ser
 * adicionados ao fim. Quartos em andamento/concluídos ficam travados (o
 * histórico não se reescreve). Nada é gravado até "Salvar alterações".
 */
export function ScheduleEditor({ shiftId, slots, agents, sectors, intervalMinutes, onChanged }: Props) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [added, setAdded] = useState<NewRow[]>([]);
  const [saving, setSaving] = useState(false);

  const agentName = useMemo(() => new Map(agents.map((a) => [a.agent_id, a.agent?.name ?? 'Agente'])), [agents]);
  const sectorName = useMemo(() => new Map(sectors.map((s) => [s.id, s.name])), [sectors]);

  const original = (s: PatrolSlot): Draft => ({
    start: acreHM(s.scheduled_start),
    end: acreHM(s.scheduled_end),
    agentId: s.agent_id ?? NONE,
    sectorId: s.sector_id ?? NONE,
  });
  const draftOf = (s: PatrolSlot) => drafts[s.id] ?? original(s);
  const setDraft = (s: PatrolSlot, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [s.id]: { ...draftOf(s), ...patch } }));

  const changed = slots.filter((s) => {
    const d = drafts[s.id];
    if (!d) return false;
    const o = original(s);
    return d.start !== o.start || d.end !== o.end || d.agentId !== o.agentId || d.sectorId !== o.sectorId;
  });
  const dirty = changed.length > 0 || added.length > 0;
  const invalid = [...changed.map((s) => draftOf(s)), ...added].some((d) => !d.start || !d.end || d.start === d.end);

  const reset = () => { setDrafts({}); setAdded([]); setEditing(false); };

  const addRow = () => {
    const lastIso = added.length
      ? retimeSlot(added[added.length - 1].baseIso, added[added.length - 1].start, added[added.length - 1].end).end.toISOString()
      : slots.length
        ? slots[slots.length - 1].scheduled_end
        : new Date().toISOString();
    const startHM = acreHM(lastIso);
    const endHM = acreHM(new Date(new Date(lastIso).getTime() + intervalMinutes * 60_000).toISOString());
    setAdded((rows) => [...rows, { key: crypto.randomUUID(), baseIso: lastIso, start: startHM, end: endHM, agentId: NONE, sectorId: sectors[0]?.id ?? NONE }]);
  };

  const remove = async (s: PatrolSlot) => {
    const ok = await confirm({
      title: 'Remover este quarto?',
      description: `${acreHM(s.scheduled_start)}–${acreHM(s.scheduled_end)} · ${s.agent_id ? agentName.get(s.agent_id) : 'sem agente'}. Essa ação não pode ser desfeita.`,
      confirmText: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteSlot(s.id);
      toast.success('Quarto removido da programação.');
      onChanged();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Não foi possível remover o quarto.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const s of changed) {
        const d = draftOf(s);
        const { start, end } = retimeSlot(s.scheduled_start, d.start, d.end);
        await api.updateSlot(s.id, {
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          agent_id: d.agentId === NONE ? null : d.agentId,
          sector_id: d.sectorId === NONE ? null : d.sectorId,
        });
      }
      for (const r of added) {
        const { start, end } = retimeSlot(r.baseIso, r.start, r.end);
        await api.addSlot(shiftId, {
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          agent_id: r.agentId === NONE ? null : r.agentId,
          sector_id: r.sectorId === NONE ? null : r.sectorId,
        });
      }
      toast.success('Programação atualizada.');
      reset();
      onChanged();
    } catch (e) {
      // Parte pode ter sido gravada — recarrega para mostrar o estado real.
      toast.error((e as Error)?.message ?? 'Não foi possível salvar a programação.');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const fields = (d: Draft, onChange: (p: Partial<Draft>) => void, label: string) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Início</span>
        <input type="time" value={d.start} onChange={(e) => onChange({ start: e.target.value })} aria-label={`Início ${label}`}
          className="h-10 rounded-md border border-border bg-background px-2 font-mono text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fim</span>
        <input type="time" value={d.end} onChange={(e) => onChange({ end: e.target.value })} aria-label={`Fim ${label}`}
          className="h-10 rounded-md border border-border bg-background px-2 font-mono text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </label>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Agente</span>
        <Select value={d.agentId} onValueChange={(v) => onChange({ agentId: v })}>
          <SelectTrigger className="h-10" aria-label={`Agente ${label}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sem agente</SelectItem>
            {agents.map((a) => <SelectItem key={a.agent_id} value={a.agent_id}>{a.agent?.name ?? 'Agente'}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Setor</span>
        <Select value={d.sectorId} onValueChange={(v) => onChange({ sectorId: v })}>
          <SelectTrigger className="h-10" aria-label={`Setor ${label}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sem setor</SelectItem>
            {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="schedule-editor-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="schedule-editor-title" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          Programação do turno
          <span className="font-normal normal-case text-muted-foreground">({slots.length} quartos)</span>
        </h3>
        {!editing ? (
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setEditing(true)} disabled={slots.length === 0}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar programação
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Quartos em andamento ou concluídos ficam travados.</span>
        )}
      </div>

      {slots.length === 0 && !editing ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhum quarto programado. Use “Dividir / reprogramar” para gerar a grade do turno.
        </p>
      ) : (
        <ol className="space-y-2">
          {slots.map((s) => {
            const st = STATUS[s.status] ?? STATUS.pending;
            const canEdit = editing && EDITABLE.includes(s.status);
            const d = draftOf(s);
            const label = `${acreHM(s.scheduled_start)}–${acreHM(s.scheduled_end)}`;
            return (
              <li key={s.id} className={cn('rounded-lg border p-3', canEdit ? 'border-primary/30 bg-primary/[0.04]' : 'border-border bg-background/40')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-sm font-bold tabular-nums text-foreground">{label}</span>
                    {!canEdit && (
                      <span className="truncate text-sm text-muted-foreground">
                        {s.agent_id ? agentName.get(s.agent_id) ?? s.agent?.name ?? 'Agente' : 'Sem agente'}
                        {' · '}
                        {s.sector_id ? sectorName.get(s.sector_id) ?? s.sector?.name ?? 'Setor' : 'Sem setor'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', st.cls)}>{st.label}</span>
                    {editing && !EDITABLE.includes(s.status) && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Não editável" />}
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label={`Remover quarto ${label}`} onClick={() => remove(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {canEdit && <div className="mt-2.5">{fields(d, (p) => setDraft(s, p), label)}</div>}
              </li>
            );
          })}
          {added.map((r, i) => (
            <li key={r.key} className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">Novo quarto</span>
                <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Descartar novo quarto"
                  onClick={() => setAdded((rows) => rows.filter((x) => x.key !== r.key))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {fields(r, (p) => setAdded((rows) => rows.map((x, j) => (j === i ? { ...x, ...p } : x))), `novo quarto ${i + 1}`)}
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Button size="sm" variant="outline" className="h-10 gap-1.5" onClick={addRow}>
            <Plus className="h-4 w-4" aria-hidden /> Adicionar quarto
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-10" onClick={reset} disabled={saving}>Descartar</Button>
            <Button size="sm" className="h-10 gap-1.5" onClick={save} disabled={!dirty || invalid || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Salvar alterações{dirty ? ` (${changed.length + added.length})` : ''}
            </Button>
          </div>
        </div>
      )}
      {editing && invalid && <p role="alert" className="mt-2 text-xs text-amber-400">Início e fim de cada quarto precisam ser diferentes.</p>}
    </section>
  );
}
