import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Copy, Trash2, Star, FileText, Shield } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { templates, deleteTemplate, duplicateTemplate } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteTemplate(deleteId);
        toast.success('Modelo excluído');
        setDeleteId(null);
      } catch (error) {
        toast.error((error as Error).message || 'Erro ao excluir modelo');
      }
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modelos de eventos</h1>
          <p className="text-sm text-muted-foreground">Configure a estrutura dos seus eventos</p>
        </div>
        <Button onClick={() => navigate('/modelos/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <p className="empty-state-title">Nenhum modelo criado</p>
              <p className="empty-state-desc">Modelos definem a estrutura de pontuação dos seus eventos.</p>
              <Button onClick={() => navigate('/modelos/novo')} className="gap-2">
                <Plus className="h-4 w-4" /> Criar modelo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <Card key={tpl.id} className="card-interactive group">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{tpl.name}</h3>
                    {tpl.isDefault && <Star className="h-4 w-4 text-primary fill-primary" />}
                  </div>
                  <Badge variant="secondary">
                    {tpl.eventType === 'solo' ? 'Solo' : 'Grupo'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tpl.description || 'Sem descrição'}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span>{tpl.scoreColumns.length} colunas</span>
                  {tpl.roles.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> {tpl.roles.length} funções
                    </span>
                  )}
                </div>
                {tpl.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tpl.roles.map(r => (
                      <span key={r.id} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted">
                        <span className="role-dot" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 border-t border-border pt-3 -mx-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/modelos/${tpl.id}/editar`)} className="text-xs">
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    try {
                      await duplicateTemplate(tpl.id);
                      toast.success('Modelo duplicado');
                    } catch (error) {
                      toast.error((error as Error).message || 'Erro ao duplicar modelo');
                    }
                  }} className="text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Duplicar
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="text-destructive text-xs ml-auto" onClick={() => setDeleteId(tpl.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Eventos já criados com este modelo não serão afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
