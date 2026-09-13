/**
 * Cadastro de Agentes por Admin
 * Reutiliza os mesmos critérios de validação da homepage
 * Permite admin criar agentes diretamente sem esperar aprovação
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import {
  validateCPF,
  formatCPF,
  formatMatricula,
  formatBirthDate,
  parseBirthDate,
  calculateAge,
  formatPhone,
} from '@/lib/validators';

interface AgentFormData {
  name: string;
  cpf: string;
  matricula: string;
  unit_id: string;
  team: string;
  birth_date: string;
  phone: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

export function AdminAgentRegistration() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [successDialog, setSuccessDialog] = useState(false);
  const [successAgent, setSuccessAgent] = useState<{ name: string; email: string } | null>(null);

  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    cpf: '',
    matricula: '',
    unit_id: '',
    team: 'ALFA',
    birth_date: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  // Carregar unidades ao montar
  useState(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('units').select('id, name, municipality').order('name');
      if (data) setUnits(data);
    };
    fetchUnits();
  });

  // Calcular idade quando data muda
  useState(() => {
    if (formData.birth_date.length === 10) {
      const date = parseBirthDate(formData.birth_date);
      if (date) {
        setCalculatedAge(calculateAge(date));
      }
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (/\d/.test(formData.name)) {
      newErrors.name = 'Nome não pode conter números';
    }

    // CPF
    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    // Matrícula (opcional)
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (matriculaNumbers && matriculaNumbers.length !== 8) {
      newErrors.matricula = 'Matrícula deve ter 8 dígitos';
    }

    // Unidade
    if (!formData.unit_id) {
      newErrors.unit_id = 'Selecione uma unidade';
    }

    // Data de nascimento
    if (formData.birth_date) {
      if (formData.birth_date.length !== 10) {
        newErrors.birth_date = 'Data incompleta (DD-MM-AAAA)';
      } else {
        const d = parseBirthDate(formData.birth_date);
        if (!d) {
          newErrors.birth_date = 'Data inválida';
        } else {
          const age = calculateAge(d);
          if (age < 18) newErrors.birth_date = 'Idade mínima: 18 anos';
          else if (age > 100) newErrors.birth_date = 'Data de nascimento improvável';
          else if (d > new Date()) newErrors.birth_date = 'Data não pode ser futura';
        }
      }
    }

    // Senha
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (!/^\d{6}$/.test(formData.password)) {
      newErrors.password = 'Senha deve ter exatamente 6 dígitos numéricos';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanCpf = formData.cpf.replace(/\D/g, '');
      const matriculaClean = formData.matricula ? getMatriculaNumbers(formData.matricula) : null;

      let birthDate: string | null = null;
      let age: number | null = null;
      if (formData.birth_date.length === 10) {
        const date = parseBirthDate(formData.birth_date);
        if (date) {
          birthDate = date.toISOString().split('T')[0];
          age = calculateAge(date);
        }
      }

      const authEmail = formData.email || `${cleanCpf}@agent.plantaopro.com`;

      // 1. Criar usuário de autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: formData.password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Falha ao criar usuário de autenticação');

      // 2. Criar registro do agente
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

      const { error: agentError } = await supabase.from('agents').insert({
        id: userId,
        name: formData.name.toUpperCase().trim(),
        cpf: cleanCpf,
        matricula: matriculaClean || null,
        unit_id: formData.unit_id,
        team: formData.team,
        birth_date: birthDate,
        age: age,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        approval_status: 'approved', // Admin aprova automaticamente
        is_active: true,
        license_status: 'trial',
        license_expires_at: trialExpiresAt.toISOString(),
        license_notes: 'Cadastrado pelo administrador - 30 dias de teste',
      });

      if (agentError) throw agentError;

      // 3. Garantir papel padrão
      await supabase.from('user_roles').insert({ user_id: userId, role: 'user' });

      // Sucesso!
      setSuccessAgent({
        name: formData.name,
        email: authEmail,
      });
      setSuccessDialog(true);

      // Limpar formulário
      setFormData({
        name: '',
        cpf: '',
        matricula: '',
        unit_id: '',
        team: 'ALFA',
        birth_date: '',
        phone: '',
        address: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setCalculatedAge(null);

      toast({
        title: 'Agente cadastrado com sucesso!',
        description: `${formData.name} está pronto para usar o sistema.`,
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar agente:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Verifique os dados e tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Cadastrar Novo Agente</CardTitle>
              <CardDescription>
                Crie um novo agente no sistema com os mesmos critérios da homepage
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção 1: Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="rounded-full bg-primary/20 w-6 h-6 flex items-center justify-center text-sm">1</span>
                Dados Pessoais
              </h3>

              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CPF *</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData({ ...formData, cpf: formatCPF(e.target.value) })
                    }
                    placeholder="000.000.000-00"
                    maxLength={14}
                    inputMode="numeric"
                    className={errors.cpf ? 'border-red-500' : ''}
                  />
                  {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                </div>

                <div>
                  <Label>Matrícula</Label>
                  <Input
                    value={formData.matricula}
                    onChange={(e) =>
                      setFormData({ ...formData, matricula: formatMatricula(e.target.value) })
                    }
                    placeholder="00000000"
                    maxLength={8}
                    inputMode="numeric"
                    className={errors.matricula ? 'border-red-500' : ''}
                  />
                  {errors.matricula && <p className="text-xs text-red-500 mt-1">{errors.matricula}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Nascimento (DD-MM-AAAA)</Label>
                  <Input
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) })
                    }
                    placeholder="01-01-1990"
                    maxLength={10}
                    inputMode="numeric"
                    className={errors.birth_date ? 'border-red-500' : ''}
                  />
                  {calculatedAge && (
                    <p className="text-xs text-emerald-600 mt-1">{calculatedAge} anos</p>
                  )}
                  {errors.birth_date && <p className="text-xs text-red-500 mt-1">{errors.birth_date}</p>}
                </div>

                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: formatPhone(e.target.value) })
                    }
                    placeholder="(68) 99999-9999"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Dados Institucionais */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="rounded-full bg-primary/20 w-6 h-6 flex items-center justify-center text-sm">2</span>
                Dados Institucionais
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unidade *</Label>
                  <Select value={formData.unit_id} onValueChange={(value) =>
                    setFormData({ ...formData, unit_id: value })
                  }>
                    <SelectTrigger className={errors.unit_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} - {unit.municipality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit_id && <p className="text-xs text-red-500 mt-1">{errors.unit_id}</p>}
                </div>

                <div>
                  <Label>Equipe *</Label>
                  <Select value={formData.team} onValueChange={(value) =>
                    setFormData({ ...formData, team: value })
                  }>
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
              </div>

              <div>
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, cidade"
                />
              </div>
            </div>

            {/* Seção 3: Credenciais de Acesso */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="rounded-full bg-primary/20 w-6 h-6 flex items-center justify-center text-sm">3</span>
                Credenciais de Acesso
              </h3>

              <div>
                <Label>Email (Opcional)</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Se vazio, será gerado automaticamente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Senha (6 dígitos numéricos) *</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="000000"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <Label>Confirmar Senha *</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="000000"
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botão Submit */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Cadastrar Agente
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog de Sucesso */}
      {successDialog && successAgent && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-600">Agente cadastrado com sucesso!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{successAgent.name}</strong> foi criado no sistema.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Email de acesso: <code className="bg-muted px-2 py-1 rounded">{successAgent.email}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Período de teste: 30 dias
                  <br />✓ Status: Ativo e aprovado
                  <br />✓ Pronto para usar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Utilitário para extrair números da matrícula
function getMatriculaNumbers(matricula: string): string {
  return matricula.replace(/\D/g, '').slice(0, 8);
}
