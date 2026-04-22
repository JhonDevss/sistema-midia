import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Play, Square, Plus, Trash2, Copy, Trophy, Medal, Calendar, Users, RotateCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = { rascunho: 'Rascunho', em_andamento: 'Em andamento', encerrado: 'Encerrado' };
const statusStyles: Record<string, string> = { rascunho: 'status-badge-draft', em_andamento: 'status-badge-active', encerrado: 'status-badge-finished' };

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    events, getEventParticipants, changeEventStatus, addRound,
    addParticipant, removeParticipant, updateParticipantRole, updateScore, deleteEvent, subscribeToEvent
  } = useData();
  const { isAdmin } = useAuth();

  const event = events.find(e => e.id === id);
  const participants = event ? getEventParticipants(event.id) : [];
  const orderedParticipants = useMemo(() => {
    const list = [...participants];
    if (!event || event.status !== 'encerrado') {
      return list.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return aTime - bTime;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return list.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [event, participants]);

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDiscordId, setNewDiscordId] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newRoleId, setNewRoleId] = useState<string>('none');
  const [highlightRoleId, setHighlightRoleId] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<'start' | 'end' | 'delete' | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    return subscribeToEvent(id);
  }, [id, subscribeToEvent]);

  if (!event) {
    return (
      <div className="empty-state page-enter">
        <Calendar className="empty-state-icon" />
        <p className="empty-state-title">Evento não encontrado</p>
        <p className="empty-state-desc">O evento pode ter sido excluído.</p>
        <Button variant="outline" onClick={() => navigate('/eventos')}>Voltar aos eventos</Button>
      </div>
    );
  }

  const isEditable = event.status !== 'encerrado';
  const isSolo = event.eventType === 'solo';
  const hasRoles = event.roles.length > 0;

  const handleAddParticipant = async () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      await addParticipant(
        event.id,
        newName,
        isSolo ? newDiscordId || undefined : undefined,
        !isSolo ? newGroupDesc || undefined : undefined,
        newRoleId !== 'none' ? newRoleId : undefined
      );
      setNewName('');
      setNewDiscordId('');
      setNewGroupDesc('');
      setNewRoleId('none');
      setShowAddParticipant(false);
      toast.success('Participante adicionado');
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao adicionar participante');
    }
  };

  const scoreDraftKey = (participantId: string, columnName: string) => `${participantId}::${columnName}`;

  const handleScoreDraftChange = (participantId: string, columnName: string, value: string) => {
    const key = scoreDraftKey(participantId, columnName);
    setScoreDrafts(prev => ({ ...prev, [key]: value }));
  };

  const getInputScoreValue = (
    participantId: string,
    columnName: string,
    fallbackValue: number | string | undefined,
    type: string
  ) => {
    const key = scoreDraftKey(participantId, columnName);
    if (Object.prototype.hasOwnProperty.call(scoreDrafts, key)) {
      return scoreDrafts[key];
    }
    if (fallbackValue === undefined || fallbackValue === null) {
      return type === 'texto' ? '' : '0';
    }
    return String(fallbackValue);
  };

  const commitScoreChange = async (participantId: string, columnName: string, type: string, currentValue: number | string | undefined) => {
    const key = scoreDraftKey(participantId, columnName);
    const hasDraft = Object.prototype.hasOwnProperty.call(scoreDrafts, key);
    const rawValue = hasDraft ? scoreDrafts[key] : String(currentValue ?? (type === 'texto' ? '' : 0));

    let parsedValue: number | string;
    if (type === 'texto') {
      parsedValue = rawValue;
    } else if (type === 'decimal') {
      const parsed = Number.parseFloat(rawValue);
      parsedValue = Number.isNaN(parsed) ? 0 : parsed;
    } else {
      const parsed = Number.parseInt(rawValue, 10);
      parsedValue = Number.isNaN(parsed) ? 0 : parsed;
    }

    try {
      await updateScore(event.id, participantId, columnName, parsedValue);
      setScoreDrafts(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao atualizar pontuação');
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction === 'start') {
        await changeEventStatus(event.id, 'em_andamento');
        toast.success('Evento iniciado!');
      } else if (confirmAction === 'end') {
        await changeEventStatus(event.id, 'encerrado');
        toast.success('Evento encerrado!');
      } else if (confirmAction === 'delete') {
        await deleteEvent(event.id);
        toast.success('Evento excluído');
        navigate('/eventos');
      }
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao executar ação');
    }
    setConfirmAction(null);
  };

  const generateSummary = () => {
    const top3 = orderedParticipants.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    let text = `**${event.title}**\n`;
    text += `📋 Modelo: ${event.templateName}\n`;
    text += `👥 Participantes: ${orderedParticipants.length}\n`;
    if (event.plannedRounds) {
      text += `🔄 Rodadas: ${event.plannedRounds} planejadas | ${event.usedRounds} usadas\n`;
    }
    text += `\n🏆 **Top 3:**\n`;
    top3.forEach((p, i) => {
      const role = p.roleId ? event.roles.find(r => r.id === p.roleId) : null;
      const roleLabel = role ? ` (${role.name})` : '';
      text += `${medals[i]} ${p.name}${roleLabel} — ${p.totalScore} pts\n`;
    });
    return text;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateSummary());
    toast.success('Resumo copiado para a área de transferência!');
  };

  const top3 = orderedParticipants.slice(0, 3);
  const getRoleName = (roleId?: string) => {
    if (!roleId) return null;
    return event.roles.find(r => r.id === roleId);
  };

  const getRoleMetricWeight = (roleId: string | undefined, metricName: string) => {
    if (!roleId) return undefined;
    const role = event.roles.find(r => r.id === roleId);
    if (!role) return undefined;
    const metric = (role.roleMetrics || []).find(item => item.name === metricName);
    if (metric) return metric.weight;
    return role.columnWeights?.[metricName];
  };

  const displayedColumns = useMemo(() => {
    const cols = event.scoreColumns.map(col => ({ ...col, source: 'base' as const }));
    const knownNames = new Set(cols.map(col => col.name));

    for (const role of event.roles) {
      for (const metric of role.roleMetrics || []) {
        const name = metric.name.trim();
        if (!name || knownNames.has(name)) continue;
        knownNames.add(name);
        cols.push({
          id: `${role.id}-${metric.id}`,
          name,
          type: 'decimal' as const,
          countsForRanking: true,
          rankingWeight: 0,
          source: 'role' as const,
        });
      }
    }

    return cols;
  }, [event]);

  const highlightedRole = highlightRoleId === 'all' ? null : getRoleName(highlightRoleId) || null;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')} className="mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold truncate">{event.title}</h1>
            <Badge variant="secondary" className={statusStyles[event.status]}>
              {statusLabels[event.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span>Modelo: {event.templateName}</span>
            <span>·</span>
            <span className="capitalize">{event.eventType}</span>
            {event.discordChannel && (
              <>
                <span>·</span>
                <span>{event.discordChannel}</span>
              </>
            )}
            {event.scheduledDate && (
              <>
                <span>·</span>
                <span>{new Date(event.scheduledDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {event.status === 'rascunho' && (
            <Button onClick={() => setConfirmAction('start')} className="gap-2">
              <Play className="h-4 w-4" /> Iniciar
            </Button>
          )}
          {event.status === 'em_andamento' && (
            <Button onClick={() => setConfirmAction('end')} variant="outline" className="gap-2">
              <Square className="h-4 w-4" /> Encerrar
            </Button>
          )}
          {event.status === 'encerrado' && (
            <Button onClick={handleCopySummary} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" /> Copiar resumo
            </Button>
          )}
          {isAdmin && event.status !== 'encerrado' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmAction('delete')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir evento</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span><span className="font-medium text-foreground">{orderedParticipants.length}</span> participante{orderedParticipants.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RotateCw className="h-4 w-4" />
          <span>
            Rodadas finalizadas: <span className="font-medium text-foreground">{event.usedRounds}</span>
            {event.plannedRounds !== undefined && event.plannedRounds > 0 ? ` / ${event.plannedRounds}` : ''}
          </span>
          <span>·</span>
          <span>Rodada atual: <span className="font-medium text-foreground">{event.usedRounds + 1}</span></span>
          {isEditable && (
            <Button variant="ghost" size="sm" onClick={async () => {
              try {
                await addRound(event.id);
                toast.success('Rodada avançada. Pontuação atual foi salva e zerada para a próxima rodada.');
              } catch (error) {
                toast.error((error as Error).message || 'Erro ao passar rodada');
              }
            }} className="h-6 text-xs px-2 gap-1">
              <Plus className="h-3 w-3" /> Passar rodada
            </Button>
          )}
        </div>
        {hasRoles && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <div className="flex gap-1.5">
              {event.roles.map(r => (
                <span key={r.id} className="inline-flex items-center text-xs">
                  <span className="role-dot" style={{ backgroundColor: r.color }} />
                  {r.name}
                </span>
              ))}
            </div>
            <Select value={highlightRoleId} onValueChange={setHighlightRoleId}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Destacar métricas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sem destaque de função</SelectItem>
                {event.roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Event summary when finished */}
      {event.status === 'encerrado' && orderedParticipants.length > 0 && (
        <Card className="border-primary/20 bg-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Resultado final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold">{orderedParticipants.length}</p>
                <p className="text-xs text-muted-foreground">Participantes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold">{event.plannedRounds || '-'}</p>
                <p className="text-xs text-muted-foreground">Rodadas planejadas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-card">
                <p className="text-2xl font-bold">{event.usedRounds}</p>
                <p className="text-xs text-muted-foreground">Rodadas usadas</p>
              </div>
            </div>
            <div className="space-y-2">
              {top3.map((p, i) => {
                const role = getRoleName(p.roleId);
                return (
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-card'}`}>
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.name}</span>
                      {role && (
                        <span className="ml-2 inline-flex items-center text-xs text-muted-foreground">
                          <span className="role-dot" style={{ backgroundColor: role.color }} />
                          {role.name}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-lg">{p.totalScore} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {isSolo ? 'Participantes' : 'Grupos'}
          </CardTitle>
          {isEditable && (
            <Button variant="outline" size="sm" onClick={() => setShowAddParticipant(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="spreadsheet-header w-12 text-center">#</th>
                  <th className="spreadsheet-header min-w-[140px]">{isSolo ? 'Participante' : 'Grupo'}</th>
                  {isSolo && <th className="spreadsheet-header min-w-[110px]">Discord</th>}
                  {hasRoles && <th className="spreadsheet-header min-w-[110px]">Função</th>}
                  {displayedColumns.map(col => (
                    <th
                      key={col.id}
                      className={`spreadsheet-header min-w-[90px] text-center ${highlightedRole ? ((getRoleMetricWeight(highlightedRole.id, col.name) ?? 0) !== 0 ? 'bg-primary/10' : 'opacity-50') : ''}`}
                    >
                      <div>{col.name}</div>
                      {col.source === 'base' && col.countsForRanking && (
                        <span
                          className="text-[10px] font-normal"
                          style={{ color: highlightedRole?.color || 'hsl(var(--primary))' }}
                        >
                          ×{col.rankingWeight}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="spreadsheet-header min-w-[80px] text-center">Total</th>
                  {isEditable && <th className="spreadsheet-header w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {orderedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={100} className="text-center py-12 text-muted-foreground text-sm">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                      Nenhum participante adicionado.
                      {isEditable && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => setShowAddParticipant(true)} className="gap-1">
                            <Plus className="h-3 w-3" /> Adicionar participante
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  orderedParticipants.map((p, i) => {
                    const role = getRoleName(p.roleId);
                    const displayedPosition = event.status === 'encerrado' ? p.position : i + 1;
                    return (
                      <tr key={p.id} className={`${i % 2 === 0 ? 'spreadsheet-row-even' : 'spreadsheet-row-odd'} transition-colors`}>
                        <td className="spreadsheet-cell text-center font-bold text-muted-foreground">
                          {displayedPosition <= 3 && event.status === 'encerrado' ? (
                            <span>{displayedPosition === 1 ? '🥇' : displayedPosition === 2 ? '🥈' : '🥉'}</span>
                          ) : displayedPosition}
                        </td>
                        <td className="spreadsheet-cell font-medium">{p.name}</td>
                        {isSolo && (
                          <td className="spreadsheet-cell text-muted-foreground text-xs font-mono">{p.discordId || '-'}</td>
                        )}
                        {hasRoles && (
                          <td className="spreadsheet-cell p-0">
                            {isEditable ? (
                              <Select
                                value={p.roleId || 'none'}
                                onValueChange={v => {
                                  void updateParticipantRole(event.id, p.id, v === 'none' ? undefined : v);
                                }}
                              >
                                <SelectTrigger className="h-8 border-0 rounded-none bg-transparent text-xs px-3 focus:ring-1 focus:ring-primary">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <span className="text-muted-foreground">Sem função</span>
                                  </SelectItem>
                                  {event.roles.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                                        {r.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              role ? (
                                <span className="flex items-center gap-1 px-3">
                                  <span className="role-dot" style={{ backgroundColor: role.color }} />
                                  <span className="text-xs">{role.name}</span>
                                </span>
                              ) : (
                                <span className="px-3 text-xs text-muted-foreground">-</span>
                              )
                            )}
                          </td>
                        )}
                        {displayedColumns.map(col => {
                          const roleWeight = getRoleMetricWeight(p.roleId, col.name);
                          const highlightedWeight = highlightedRole ? (getRoleMetricWeight(highlightedRole.id, col.name) ?? 0) : null;
                          const dimByHighlight = highlightedRole ? highlightedWeight === 0 : false;
                          const showOverride = roleWeight !== undefined && roleWeight !== col.rankingWeight;
                          return (
                            <td
                              key={col.id}
                              className={`spreadsheet-cell p-0 relative ${dimByHighlight ? 'opacity-45' : ''} ${highlightedRole && !dimByHighlight ? 'bg-primary/5' : ''}`}
                            >
                              {isEditable ? (
                                <Input
                                  type={col.type === 'texto' ? 'text' : 'number'}
                                  value={getInputScoreValue(p.id, col.name, p.scores[col.name], col.type)}
                                  onChange={e => handleScoreDraftChange(p.id, col.name, e.target.value)}
                                  onBlur={() => {
                                    void commitScoreChange(p.id, col.name, col.type, p.scores[col.name]);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="h-8 border-0 rounded-none text-sm px-3 text-center focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-accent/50 bg-transparent"
                                />
                              ) : (
                                <span className="px-3 block text-center">
                                  {p.scores[col.name] ?? 0}
                                </span>
                              )}
                              {showOverride && (
                                <span
                                  className="absolute top-0 right-0.5 text-[8px] leading-none"
                                  style={{ color: role?.color || 'hsl(var(--primary))' }}
                                  title={`Peso da função: ×${roleWeight}`}
                                >
                                  ×{roleWeight}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="spreadsheet-cell font-bold text-center bg-muted/30">
                          {p.totalScore}
                        </td>
                        {isEditable && (
                          <td className="spreadsheet-cell p-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={async () => {
                                    try {
                                      await removeParticipant(event.id, p.id);
                                      toast.success('Removido');
                                    } catch (error) {
                                      toast.error((error as Error).message || 'Erro ao remover participante');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remover</TooltipContent>
                            </Tooltip>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add participant dialog */}
      <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar {isSolo ? 'participante' : 'grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isSolo ? 'Nome do participante' : 'Nome do grupo'}</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={isSolo ? 'Nome do jogador' : 'Ex: Time Azul'}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddParticipant(); } }}
              />
            </div>
            {isSolo && (
              <div className="space-y-2">
                <Label>Discord ID <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input value={newDiscordId} onChange={e => setNewDiscordId(e.target.value)} placeholder="usuario#1234" />
              </div>
            )}
            {!isSolo && (
              <div className="space-y-2">
                <Label>Descrição do grupo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Descrição" />
              </div>
            )}
            {hasRoles && (
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem função (peso padrão)</SelectItem>
                    {event.roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.name}
                          {r.description && <span className="text-muted-foreground text-xs">— {r.description}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddParticipant(false)}>Cancelar</Button>
            <Button onClick={handleAddParticipant}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'start' && 'Iniciar evento?'}
              {confirmAction === 'end' && 'Encerrar evento?'}
              {confirmAction === 'delete' && 'Excluir evento?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'start' && 'O evento passará para "Em andamento". Você poderá registrar pontuações.'}
              {confirmAction === 'end' && 'As pontuações serão travadas e não poderão mais ser editadas. Você poderá copiar o resumo.'}
              {confirmAction === 'delete' && 'Essa ação não pode ser desfeita. Todos os dados serão perdidos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction === 'delete' ? 'Excluir' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
