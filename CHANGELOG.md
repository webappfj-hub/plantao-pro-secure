# Changelog - Sessão de Correções

## Correções Implementadas

### 1. Diálogos de BH e Folga
- **Problema:** Diálogos fechavam ao clicar acidentalmente fora deles
- **Solução:** Apenas os botões Cancelar/X/Esc agora fecham os diálogos

### 2. Folgas Editáveis
- **Problema:** Não era possível editar folgas, apenas cancelar e recriar
- **Solução:** Adicionado fluxo completo de edição de folgas

### 3. Opção Redundante no Seletor de Período
- **Problema:** Opção "12 horas" era idêntica a "Diurno" (07h→19h)
- **Solução:** Removida opção duplicada "12 horas"

### 4. Navegação Presa no Painel Admin/Master
- **Problema:** Botão "Início"/"Voltar"/"Fechar" redirecionava para / puro, que automaticamente jogava de volta pro painel
- **Solução:** Redirecionamento alterado para `/?home=1`

### 5. Gestor de Rondas Duplicado
- **Problema:** Homepage/painel do agente usava sistema antigo (round_sessions) desconectado do real
- **Solução:** Integrado com o Gestor de Rondas real (/rondas, schema patrol_*); verificado no navegador

### 6. Aviso Falso de "BH não registrado hoje"
- **Problema:** Checagem comparava texto livre da descrição
- **Solução:** Trocado para verificar pela data real do registro (created_at)

### 7. Permutas Não Detectando Agentes
- **Problema:** 22 políticas RLS em 10 tabelas (incluindo shift_swaps) ainda comparavam com CPF, mas login mudou para matrícula
- **Solução:** Confirmado que RLS foi corrigida no banco; documentado em migrations versionadas; histórico de migrations ressincronizado entre local e remoto

---

**Data:** 2026-09-13  
**Status:** ✅ Todas as correções implementadas e verificadas
