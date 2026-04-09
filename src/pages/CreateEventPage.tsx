import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { EventType } from '@/types';

export default function CreateEventPage() {
  const { templates, createEvent } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [templateId, setTemplateId] = useState(templates.find(t => t.isDefault)?.id || '');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>(templates.find(t => t.isDefault)?.eventType || 'solo');
  const [plannedRounds, setPlannedRounds] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [discordChannel, setDiscordChannel] = useState('');

  const selectedTemplate = templates.find(t => t.id === templateId);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) setEventType(tpl.eventType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !selectedTemplate) { toast.error('Selecione um modelo'); return; }
    if (!title.trim()) { toast.error('Título é obrigatório'); return; }

    const event = await createEvent({
      title,
      templateId,
      templateName: selectedTemplate.name,
      eventType,
      status: 'rascunho',
      scheduledDate: scheduledDate || undefined,
      discordChannel: discordChannel || undefined,
      plannedRounds: plannedRounds ? parseInt(plannedRounds) : undefined,
      scoreColumns: selectedTemplate.scoreColumns.map(c => ({ ...c, id: crypto.randomUUID() })),
      roles: selectedTemplate.roles.map(r => ({ ...r, id: crypto.randomUUID() })),
      createdBy: user?.discordUsername || '',
    });

    toast.success('Evento criado!');
    navigate(`/eventos/${event.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Criar evento</h1>
          <p className="text-sm text-muted-foreground">Selecione um modelo e configure o evento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Selecione o modelo</CardTitle></CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhum modelo disponível.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/modelos/novo')}>Criar modelo</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateChange(tpl.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      templateId === tpl.id
                        ? 'border-primary bg-accent ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{tpl.name}</span>
                      {tpl.isDefault && <Star className="h-3 w-3 text-primary fill-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {tpl.eventType} · {tpl.scoreColumns.length} colunas
                      {tpl.roles.length > 0 && ` · ${tpl.roles.length} funções`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados do evento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título do evento</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Cidade Dorme #42" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Rodadas planejadas</Label>
                <Input type="number" value={plannedRounds} onChange={e => setPlannedRounds(e.target.value)} placeholder="Opcional" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data/hora prevista</Label>
                <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Canal do Discord</Label>
                <Input value={discordChannel} onChange={e => setDiscordChannel(e.target.value)} placeholder="#eventos-texto" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/eventos')}>Cancelar</Button>
          <Button type="submit">Criar evento</Button>
        </div>
      </form>
    </div>
  );
}
