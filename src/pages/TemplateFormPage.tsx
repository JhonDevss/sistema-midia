import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ScoreColumn, ColumnType, EventType, EventRole, RoleMetric, ROLE_COLORS } from '@/types';

function normalizeRole(role: EventRole): EventRole {
  if (Array.isArray(role.roleMetrics) && role.roleMetrics.length > 0) {
    return role;
  }

  const legacyWeights = role.columnWeights || {};
  return {
    ...role,
    roleMetrics: Object.entries(legacyWeights).map(([name, weight]) => ({
      id: crypto.randomUUID(),
      name,
      weight,
    })),
  };
}

export default function TemplateFormPage() {
  const { id } = useParams();
  const { templates, createTemplate, updateTemplate } = useData();
  const navigate = useNavigate();
  const isEditing = !!id;
  const existing = id ? templates.find(t => t.id === id) : null;

  const [name, setName] = useState(existing?.name || '');
  const [eventType, setEventType] = useState<EventType>(existing?.eventType || 'solo');
  const [description, setDescription] = useState(existing?.description || '');
  const [internalNotes, setInternalNotes] = useState(existing?.internalNotes || '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault || false);
  const [columns, setColumns] = useState<ScoreColumn[]>(
    existing?.scoreColumns || [{ id: crypto.randomUUID(), name: '', type: 'inteiro', countsForRanking: true, rankingWeight: 1 }]
  );
  const [roles, setRoles] = useState<EventRole[]>(existing?.roles?.map(normalizeRole) || []);

  const addColumn = () => {
    setColumns(c => [...c, { id: crypto.randomUUID(), name: '', type: 'inteiro', countsForRanking: true, rankingWeight: 1 }]);
  };

  const removeColumn = (colId: string) => {
    setColumns(c => c.filter(x => x.id !== colId));
  };

  const updateColumn = (colId: string, updates: Partial<ScoreColumn>) => {
    setColumns(c => c.map(x => x.id === colId ? { ...x, ...updates } : x));
  };

  const addRole = () => {
    const colorIdx = roles.length % ROLE_COLORS.length;
    const newRole: EventRole = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      color: ROLE_COLORS[colorIdx],
      roleMetrics: [],
    };
    setRoles(r => [...r, newRole]);
  };

  const removeRole = (roleId: string) => {
    setRoles(r => r.filter(x => x.id !== roleId));
  };

  const updateRole = (roleId: string, updates: Partial<EventRole>) => {
    setRoles(r => r.map(x => x.id === roleId ? { ...x, ...updates } : x));
  };

  const addRoleMetric = (roleId: string) => {
    setRoles(r => r.map(x => {
      if (x.id !== roleId) return x;
      return {
        ...x,
        roleMetrics: [...(x.roleMetrics || []), { id: crypto.randomUUID(), name: '', weight: 1 }],
      };
    }));
  };

  const updateRoleMetric = (roleId: string, metricId: string, updates: Partial<RoleMetric>) => {
    setRoles(r => r.map(x => {
      if (x.id !== roleId) return x;
      return {
        ...x,
        roleMetrics: (x.roleMetrics || []).map(metric => metric.id === metricId ? { ...metric, ...updates } : metric),
      };
    }));
  };

  const removeRoleMetric = (roleId: string, metricId: string) => {
    setRoles(r => r.map(x => {
      if (x.id !== roleId) return x;
      return {
        ...x,
        roleMetrics: (x.roleMetrics || []).filter(metric => metric.id !== metricId),
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (columns.some(c => !c.name.trim())) { toast.error('Todas as colunas precisam de um nome'); return; }
    if (roles.some(r => !r.name.trim())) { toast.error('Todas as funções precisam de um nome'); return; }
    if (roles.some(r => (r.roleMetrics || []).some(m => !m.name.trim()))) {
      toast.error('Todas as métricas das funções precisam de nome');
      return;
    }

    const data = { name, eventType, description, internalNotes, isDefault, scoreColumns: columns, roles };
    try {
      if (isEditing && id) {
        await updateTemplate(id, data);
        toast.success('Modelo atualizado');
      } else {
        await createTemplate(data);
        toast.success('Modelo criado');
      }
      navigate('/modelos');
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao salvar modelo');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/modelos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{isEditing ? 'Editar modelo' : 'Novo modelo'}</h1>
          <p className="text-sm text-muted-foreground">Configure a estrutura do evento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do modelo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cidade Dorme" required />
              </div>
              <div className="space-y-2">
                <Label>Tipo de evento</Label>
                <Select value={eventType} onValueChange={v => setEventType(v as EventType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="grupo">Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição curta" />
            </div>
            <div className="space-y-2">
              <Label>Observações internas</Label>
              <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Anotações para a equipe" rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="default" checked={isDefault} onCheckedChange={v => setIsDefault(!!v)} />
              <Label htmlFor="default" className="text-sm">Definir como modelo padrão</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Colunas de pontuação</CardTitle>
              <CardDescription>Defina as métricas que serão registradas</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} className="gap-1">
              <Plus className="h-3 w-3" /> Coluna
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {columns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Adicione pelo menos uma coluna de pontuação.</p>
            )}
            {columns.map((col, i) => (
              <div key={col.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <span className="text-xs font-mono text-muted-foreground w-6 text-center">{i + 1}</span>
                <Input
                  value={col.name}
                  onChange={e => updateColumn(col.id, { name: e.target.value })}
                  placeholder="Nome da coluna"
                  className="flex-1"
                />
                <Select value={col.type} onValueChange={v => updateColumn(col.id, { type: v as ColumnType })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inteiro">Inteiro</SelectItem>
                    <SelectItem value="decimal">Decimal</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={col.countsForRanking}
                    onCheckedChange={v => updateColumn(col.id, { countsForRanking: !!v })}
                  />
                  <Label className="text-xs whitespace-nowrap">Ranking</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Peso</Label>
                  <Input
                    type="number"
                    value={col.rankingWeight}
                    onChange={e => updateColumn(col.id, { rankingWeight: parseFloat(e.target.value) || 0 })}
                    className="w-20"
                    step="any"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeColumn(col.id)} className="text-destructive h-8 w-8 flex-shrink-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Roles / Functions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Funções dos participantes
              </CardTitle>
              <CardDescription>
                Defina métricas próprias de cada função com nome e peso.
                Quando o participante tiver função, apenas as métricas dessa função contam no total.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRole} className="gap-1">
              <Plus className="h-3 w-3" /> Função
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma função configurada. Todos os participantes usarão os pesos padrão das colunas.
              </p>
            )}
            {roles.map((role) => (
              <div key={role.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer"
                    style={{ backgroundColor: role.color }}
                    title="Cor da função"
                  />
                  <Input
                    value={role.name}
                    onChange={e => updateRole(role.id, { name: e.target.value })}
                    placeholder="Nome da função (ex: Assassino)"
                    className="flex-1"
                  />
                  <Input
                    value={role.description}
                    onChange={e => updateRole(role.id, { description: e.target.value })}
                    placeholder="Descrição curta"
                    className="flex-1"
                  />
                  <Select value={role.color} onValueChange={v => updateRole(role.id, { color: v })}>
                    <SelectTrigger className="w-24">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="text-xs">Cor</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_COLORS.map(c => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                            <span className="text-xs">{c}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRole(role.id)} className="text-destructive h-8 w-8 flex-shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="pl-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Métricas da função (nome + peso)</p>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addRoleMetric(role.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Métrica
                    </Button>
                  </div>
                  {(role.roleMetrics || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma métrica configurada para esta função.</p>
                  ) : (
                    <div className="space-y-2">
                      {(role.roleMetrics || []).map(metric => (
                        <div key={metric.id} className="flex items-center gap-2">
                          <Input
                            value={metric.name}
                            onChange={e => updateRoleMetric(role.id, metric.id, { name: e.target.value })}
                            placeholder="Nome da métrica"
                            className="h-8"
                          />
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground">Peso</Label>
                            <Input
                              type="number"
                              value={metric.weight}
                              onChange={e => updateRoleMetric(role.id, metric.id, { weight: parseFloat(e.target.value) || 0 })}
                              className="w-24 h-8"
                              step="any"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeRoleMetric(role.id, metric.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        {columns.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Pré-visualização da planilha</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="spreadsheet-header">#</th>
                      <th className="spreadsheet-header">Nome</th>
                      {roles.length > 0 && <th className="spreadsheet-header">Função</th>}
                      {columns.map(c => (
                        <th key={c.id} className="spreadsheet-header">
                          {c.name || '(sem nome)'}
                          {c.countsForRanking && <span className="ml-1 text-[10px] text-primary font-normal">×{c.rankingWeight}</span>}
                        </th>
                      ))}
                      <th className="spreadsheet-header">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(roles.length > 0 ? roles : [null]).map((role, idx) => (
                      <tr key={role?.id || 'default'} className={idx % 2 === 0 ? 'spreadsheet-row-even' : 'spreadsheet-row-odd'}>
                        <td className="spreadsheet-cell text-muted-foreground">{idx + 1}</td>
                        <td className="spreadsheet-cell text-muted-foreground italic">{role ? `Jogador (${role.name})` : 'Exemplo'}</td>
                        {roles.length > 0 && (
                          <td className="spreadsheet-cell">
                            {role && (
                              <span className="flex items-center gap-1">
                                <span className="role-dot" style={{ backgroundColor: role.color }} />
                                <span className="text-xs">{role.name}</span>
                              </span>
                            )}
                          </td>
                        )}
                        {columns.map(c => (
                          <td key={c.id} className="spreadsheet-cell text-muted-foreground">
                            {c.type === 'texto' ? '-' : '0'}
                          </td>
                        ))}
                        <td className="spreadsheet-cell font-medium text-muted-foreground">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/modelos')}>Cancelar</Button>
          <Button type="submit">{isEditing ? 'Salvar alterações' : 'Criar modelo'}</Button>
        </div>
      </form>
    </div>
  );
}
