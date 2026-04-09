import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, UserCheck, UserX, Shield, Users, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/types';

export default function UsersPage() {
  const { user, users, createUser, updateUser, deleteUser, resetUserPassword, isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  if (!isAdmin) {
    return (
      <div className="empty-state page-enter">
        <Shield className="empty-state-icon" />
        <p className="empty-state-title">Acesso restrito</p>
        <p className="empty-state-desc">Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) { toast.error('Preencha todos os campos'); return; }
    if (newPassword.length < 8) { toast.error('A senha deve ter pelo menos 8 caracteres'); return; }
    if (users.some(u => u.discordUsername === newUsername)) { toast.error('Usuário já existe'); return; }
    try {
      await createUser(newUsername, newPassword, newRole);
      toast.success('Usuário criado! A senha deve ser alterada no primeiro login.');
      setShowCreate(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('staff');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao criar usuário'));
    }
  };

  const activeCount = users.filter(u => u.active).length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{activeCount} ativo{activeCount !== 1 ? 's' : ''} de {users.length}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Criar usuário
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Usuário Discord</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Papel</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Senha</th>
                <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {u.discordUsername.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.discordUsername}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <Select
                      value={u.role}
                      onValueChange={async (value) => {
                        try {
                          await updateUser(u.id, { role: value as UserRole });
                          toast.success('Tipo de usuário atualizado');
                        } catch (error) {
                          toast.error(getErrorMessage(error, 'Erro ao atualizar tipo de usuário'));
                        }
                      }}
                      disabled={u.id === user?.id}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.active ? 'text-success' : 'text-destructive'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-success' : 'bg-destructive'}`} />
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {u.mustChangePassword && (
                      <span className="text-xs text-warning">Deve alterar</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateUser(u.id, { active: !u.active });
                            toast.success(u.active ? 'Usuário desativado' : 'Usuário ativado');
                          } catch (error) {
                            toast.error(getErrorMessage(error, 'Erro ao atualizar usuário'));
                          }
                        }}
                      >
                        {u.active ? <UserX className="h-3 w-3 mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                        {u.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setResetId(u.id);
                          setResetPassword('');
                        }}
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Resetar senha
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => setDeleteId(u.id)}
                        disabled={u.id === user?.id}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário do Discord</Label>
              <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="nome_do_usuario" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Senha inicial</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Senha temporária" />
              <p className="text-xs text-muted-foreground">O usuário será obrigado a alterar a senha no primeiro login.</p>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — acesso total</SelectItem>
                  <SelectItem value="staff">Staff de Eventos — criar e gerenciar eventos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove definitivamente o usuário do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteUser(deleteId);
                  toast.success('Usuário excluído');
                  setDeleteId(null);
                } catch (error) {
                  toast.error(getErrorMessage(error, 'Erro ao excluir usuário'));
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetId} onOpenChange={(open) => { if (!open) setResetId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha do usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Nova senha temporária</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">O usuário será obrigado a trocar essa senha no próximo login.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetId(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!resetId) return;
                if (resetPassword.length < 8) {
                  toast.error('A senha deve ter pelo menos 8 caracteres');
                  return;
                }
                try {
                  await resetUserPassword(resetId, resetPassword);
                  toast.success('Senha resetada com sucesso');
                  setResetId(null);
                } catch (error) {
                  toast.error(getErrorMessage(error, 'Erro ao resetar senha'));
                }
              }}
            >
              Resetar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
