import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, Users, TrendingUp, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { TopParticipantByDiscordId } from '@/types';

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  em_andamento: 'Em andamento',
  encerrado: 'Encerrado',
};

const statusStyles: Record<string, string> = {
  rascunho: 'status-badge-draft',
  em_andamento: 'status-badge-active',
  encerrado: 'status-badge-finished',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { events, templates } = useData();
  const navigate = useNavigate();
  const [topParticipants, setTopParticipants] = React.useState<TopParticipantByDiscordId[]>([]);

  React.useEffect(() => {
    let mounted = true;
    apiFetch<{ topParticipants: TopParticipantByDiscordId[] }>('/api/data/top-participants')
      .then((response) => {
        if (mounted) setTopParticipants(response.topParticipants);
      })
      .catch(() => {
        if (mounted) setTopParticipants([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const recentEvents = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  const activeEvents = events.filter(e => e.status === 'em_andamento').length;
  const draftEvents = events.filter(e => e.status === 'rascunho').length;
  const finishedEvents = events.filter(e => e.status === 'encerrado').length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {user?.discordUsername}! 👋</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus eventos e acompanhe pontuações</p>
        </div>
        <Button onClick={() => navigate('/eventos/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar evento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-interactive cursor-pointer" onClick={() => navigate('/eventos')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-xs text-muted-foreground">Total de eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive cursor-pointer" onClick={() => navigate('/eventos')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEvents}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftEvents}</p>
                <p className="text-xs text-muted-foreground">Rascunhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive cursor-pointer" onClick={() => navigate('/modelos')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Modelos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Eventos recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/eventos')}>Ver todos →</Button>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">Nenhum evento ainda</p>
              <p className="empty-state-desc">Crie seu primeiro evento para começar a gerenciar pontuações.</p>
              <Button onClick={() => navigate('/eventos/novo')} className="gap-2">
                <Plus className="h-4 w-4" /> Criar evento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Título</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Modelo</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map(event => (
                    <tr
                      key={event.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/eventos/${event.id}`)}
                    >
                      <td className="py-3 px-3 font-medium">{event.title}</td>
                      <td className="py-3 px-3 text-muted-foreground">{event.templateName}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className={statusStyles[event.status]}>
                          {statusLabels[event.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuários que mais participam (Discord ID)</CardTitle>
        </CardHeader>
        <CardContent>
          {topParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há participação com Discord ID registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Discord ID</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Participações</th>
                  </tr>
                </thead>
                <tbody>
                  {topParticipants.map((item) => (
                    <tr key={item.discordId} className="border-b last:border-0">
                      <td className="py-3 px-3 font-mono text-xs">{item.discordId}</td>
                      <td className="py-3 px-3 font-medium">{item.participations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
