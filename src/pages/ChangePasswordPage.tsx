import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

export default function ChangePasswordPage() {
  const { changePassword, user } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  const isForced = user?.mustChangePassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPwd.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (await changePassword(current, newPwd)) {
      toast.success('Senha alterada com sucesso!');
      setCurrent('');
      setNewPwd('');
      setConfirm('');
    } else {
      toast.error('Senha atual incorreta');
    }
  };

  return (
    <div className={`max-w-md mx-auto page-enter ${isForced ? 'min-h-screen flex items-center' : ''}`}>
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>{isForced ? 'Defina sua nova senha' : 'Alterar senha'}</CardTitle>
          {isForced && (
            <CardDescription>Sua senha atual é temporária. Por segurança, defina uma nova senha para continuar.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              {isForced ? 'Definir senha e entrar' : 'Alterar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
