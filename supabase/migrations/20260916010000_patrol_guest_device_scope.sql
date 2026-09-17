-- Isola a "ronda avulsa" por dispositivo do visitante sem login. Antes, o
-- Gestor de Rondas identificava o turno ativo só por unit_id + team — então
-- qualquer visitante que escolhesse a mesma equipe/unidade (o padrão é
-- sempre ALFA/CS Feijó) via e podia mexer no MESMO turno de outro visitante
-- qualquer, ou pior: no turno real de uma equipe autenticada em operação.
-- Cada dispositivo passa a ter sua própria ronda avulsa, identificada por um
-- UUID gerado e guardado no localStorage do navegador (nunca depende de
-- login). Turnos de agentes autenticados (guest_device_id NULL) continuam
-- compartilhados normalmente entre a equipe — isso nunca muda.
ALTER TABLE public.patrol_shifts ADD COLUMN IF NOT EXISTS guest_device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_patrol_shifts_guest_device
  ON public.patrol_shifts(guest_device_id)
  WHERE guest_device_id IS NOT NULL;
