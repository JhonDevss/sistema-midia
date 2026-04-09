import React, { useEffect, useMemo, useState } from 'react';
import { Shield, RefreshCcw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { AuditLog } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AuditLogsResponse = {
  logs: AuditLog[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = filter.trim() ? `?action=${encodeURIComponent(filter.trim())}` : '';
      const response = await apiFetch<AuditLogsResponse>(`/api/auth/audit-logs${query}`);
      setLogs(response.logs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os logs.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLogs = useMemo(() => logs.length > 0, [logs]);

  if (!isAdmin) {
    return (
      <div className="empty-state page-enter">
        <Shield className="empty-state-icon" />
        <p className="empty-state-title">Acesso restrito</p>
        <p className="empty-state-desc">Apenas administradores podem visualizar a auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Acompanhe ações administrativas e eventos críticos do sistema.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filtrar por ação (ex: auth.)"
              className="pl-8"
            />
          </div>
          <Button onClick={() => void loadLogs()} className="gap-2" variant="outline">
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros recentes</CardTitle>
          <CardDescription>{hasLogs ? `${logs.length} registros encontrados` : 'Sem registros para os filtros atuais'}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando logs...</p>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={() => void loadLogs()} variant="secondary" size="sm">
                Tentar novamente
              </Button>
            </div>
          ) : !hasLogs ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">Quando</th>
                    <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">Ação</th>
                    <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">Admin</th>
                    <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">Alvo</th>
                    <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 align-top">
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(log.createdAt)}</td>
                      <td className="px-3 py-3 font-medium">{log.action}</td>
                      <td className="px-3 py-3">{log.actorUsername}</td>
                      <td className="px-3 py-3">{log.targetType}{log.targetId ? ` (${log.targetId})` : ''}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '-'}</td>
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
