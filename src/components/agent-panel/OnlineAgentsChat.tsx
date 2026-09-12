/**
 * Chat de Agentes Online
 * Organizado por: Equipe > Unidade > Todos Online
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Users, Building2, Globe, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlineAgent {
  id: string;
  name: string;
  team: string;
  unit_id: string;
  unit_name?: string;
  status: 'online' | 'away' | 'busy';
  last_seen: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

export function OnlineAgentsChat() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const [onlineAgents, setOnlineAgents] = useState<OnlineAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<OnlineAgent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Monitorar usuários online
  useEffect(() => {
    if (!user || !agent) return;

    const fetchOnlineAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_presence')
          .select(`
            id,
            user_id,
            agent:agents(id, name, team, unit_id,
              unit:units(id, name))
          `)
          .eq('status', 'online')
          .neq('user_id', user.id)
          .limit(100);

        if (error) throw error;

        const formattedAgents: OnlineAgent[] = (data || []).map((item: any) => ({
          id: item.agent?.id || '',
          name: item.agent?.name || 'Desconhecido',
          team: item.agent?.team || '',
          unit_id: item.agent?.unit_id || '',
          unit_name: item.agent?.unit?.name || '',
          status: 'online',
          last_seen: item.updated_at || new Date().toISOString(),
        }));

        setOnlineAgents(formattedAgents);
      } catch (error) {
        console.error('Erro ao buscar agentes online:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlineAgents();

    // Re-sincronizar a cada 30 segundos
    const interval = setInterval(fetchOnlineAgents, 30000);
    return () => clearInterval(interval);
  }, [user, agent]);

  // Buscar mensagens com agente selecionado
  useEffect(() => {
    if (!selectedAgent || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${selectedAgent.id}),` +
          `and(sender_id.eq.${selectedAgent.id},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();
  }, [selectedAgent, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedAgent || !user || !agent) return;

    try {
      const { error } = await supabase.from('agent_messages').insert({
        sender_id: user.id,
        sender_name: agent.name || 'Agente',
        recipient_id: selectedAgent.id,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      setMessages([
        ...messages,
        {
          id: crypto.randomUUID(),
          sender_id: user.id,
          sender_name: agent.name || 'Agente',
          recipient_id: selectedAgent.id,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  // Agrupar agentes por equipe/unidade
  const sameTeam = onlineAgents.filter((a) => a.team === agent?.team);
  const sameUnit = onlineAgents.filter((a) => a.unit_id === agent?.unit_id);
  const allAgents = onlineAgents;

  const AgentsList = ({ agents, label }: { agents: OnlineAgent[]; label: string }) => (
    <ScrollArea className="h-72 border rounded-lg p-2">
      {agents.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          Nenhum {label} online
        </p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'w-full p-3 rounded-lg border border-border text-left transition hover:bg-muted',
                selectedAgent?.id === agent.id && 'border-primary bg-primary/10'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Dot className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    <span className="font-medium truncate">{agent.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {agent.team} • {agent.unit_name || 'Unidade desconhecida'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle>Chat de Agentes Online</CardTitle>
          <Badge variant="outline">{onlineAgents.length} online</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-96">
          {/* Lista de agentes */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="team" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="team" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Equipe
                </TabsTrigger>
                <TabsTrigger value="unit" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Unidade
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Todos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="flex-1 mt-2">
                <AgentsList agents={sameTeam} label="agente da equipe" />
              </TabsContent>

              <TabsContent value="unit" className="flex-1 mt-2">
                <AgentsList agents={sameUnit} label="agente da unidade" />
              </TabsContent>

              <TabsContent value="all" className="flex-1 mt-2">
                <AgentsList agents={allAgents} label="agente online" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 flex flex-col border border-border rounded-lg">
            {selectedAgent ? (
              <>
                {/* Header */}
                <div className="border-b border-border p-3">
                  <div className="flex items-center gap-2">
                    <Dot className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    <div>
                      <p className="font-semibold">{selectedAgent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAgent.team} • {selectedAgent.unit_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensagens */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma mensagem. Inicie uma conversa!
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2',
                            msg.sender_id === user?.id && 'justify-end'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-xs rounded-lg p-2 text-sm',
                              msg.sender_id === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p>{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t border-border p-3 flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-center">
                  Selecione um agente para iniciar uma conversa
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
