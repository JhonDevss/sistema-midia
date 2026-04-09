import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Trash2, Calendar, Eye } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = { rascunho: 'Rascunho', em_andamento: 'Em andamento', encerrado: 'Encerrado' };
const statusStyles: Record<string, string> = { rascunho: 'status-badge-draft', em_andamento: 'status-badge-active', encerrado: 'status-badge-finished' };

export default function EventsPage() {
  const { events, deleteEvent, duplicateEvent } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = events.filter(e => statusFilter === 'all' || e.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eventos</h1>
          <p className="text-sm text-muted-foreground">{events.length} evento{events.length !== 1 ? 's' : ''} no total</p>
        </div>
        <Button onClick={() => navigate('/eventos/novo')} className="gap-2">
          <Plus className="h-4 w-4" /> Criar evento
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">Nenhum evento encontrado</p>
              <p className="empty-state-desc">
                {statusFilter !== 'all'
                  ? 'Tente alterar o filtro de status.'
                  : 'Crie seu primeiro evento para começar.'}
              </p>
              {statusFilter === 'all' && (
                <Button onClick={() => navigate('/eventos/novo')} className="gap-2">
                  <Plus className="h-4 w-4" /> Criar evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Título</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Modelo</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Criado em</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(event => (
                    <tr
                      key={event.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/eventos/${event.id}`)}
                    >
                      <td className="py-3 px-3 font-medium">{event.title}</td>
                      <td className="py-3 px-3 text-muted-foreground">{event.templateName}</td>
                      <td className="py-3 px-3 text-muted-foreground capitalize">{event.eventType}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className={statusStyles[event.status]}>{statusLabels[event.status]}</Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{new Date(event.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/eventos/${event.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                                try {
                                  await duplicateEvent(event.id);
                                  toast.success('Evento duplicado');
                                } catch (error) {
                                  toast.error((error as Error).message || 'Erro ao duplicar evento');
                                }
                              }}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(event.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Todas as pontuações serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (deleteId) {
                try {
                  await deleteEvent(deleteId);
                  toast.success('Evento excluído');
                  setDeleteId(null);
                } catch (error) {
                  toast.error((error as Error).message || 'Erro ao excluir evento');
                }
              }
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
