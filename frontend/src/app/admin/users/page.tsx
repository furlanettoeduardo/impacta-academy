'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PencilLine, Save, Trash2, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type UserInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type CurrentUser = {
  role: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('ALUNO');
  const [userActive, setUserActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('ALUNO');
  const [editActive, setEditActive] = useState(true);

  const loadUsers = async (token: string) => {
    const data = await apiRequest<UserInfo[]>('/users', { token });
    setUsers(data);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<CurrentUser>('/users/me', { token }),
      loadUsers(token),
    ])
      .then(([current]) => {
        if (current.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateUser = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      setError('Preencha nome, email e senha.');
      return;
    }

    setSavingUser(true);
    setError('');

    try {
      await apiRequest('/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          role: userRole,
          isActive: userActive,
        }),
      });
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('ALUNO');
      setUserActive(true);
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar usuário.');
    } finally {
      setSavingUser(false);
    }
  };

  const startEdit = (user: UserInfo) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditRole(user.role);
    setEditActive(user.isActive);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setEditRole('ALUNO');
    setEditActive(true);
  };

  const handleUpdate = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!editName.trim() || !editEmail.trim()) {
      setError('Preencha nome e e-mail.');
      return;
    }

    setSavingUser(true);
    setError('');

    try {
      await apiRequest(`/users/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword.trim() || undefined,
          role: editRole,
          isActive: editActive,
        }),
      });
      await loadUsers(token);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!window.confirm('Deseja remover este usuário?')) {
      return;
    }

    setSavingUser(true);
    setError('');

    try {
      await apiRequest(`/users/${id}`, {
        method: 'DELETE',
        token,
      });
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover usuário.');
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Usuários
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Cadastre alunos, professores e administradores
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Cadastrar usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  className="h-11"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  className="h-11"
                  type="email"
                  value={userEmail}
                  onChange={(event) => setUserEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  className="h-11"
                  type="password"
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={userRole}
                  onChange={(event) => setUserRole(event.target.value)}
                >
                  <option value="ALUNO">Aluno</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={userActive ? 'true' : 'false'}
                  onChange={(event) => setUserActive(event.target.value === 'true')}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>
            <Button className="gap-2" onClick={handleCreateUser} disabled={savingUser}>
              <Save className="h-4 w-4" /> Cadastrar usuário
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Usuários cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
            ) : users.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      {editingId === user.id ? (
                        <>
                          <TableCell>
                            <div className="space-y-2">
                              <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                              <Input
                                type="password"
                                placeholder="Nova senha (opcional)"
                                value={editPassword}
                                onChange={(event) => setEditPassword(event.target.value)}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="email"
                              value={editEmail}
                              onChange={(event) => setEditEmail(event.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={editRole}
                              onChange={(event) => setEditRole(event.target.value)}
                            >
                              <option value="ALUNO">Aluno</option>
                              <option value="PROFESSOR">Professor</option>
                              <option value="ADMIN">Administrador</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={editActive ? 'true' : 'false'}
                              onChange={(event) => setEditActive(event.target.value === 'true')}
                            >
                              <option value="true">Ativo</option>
                              <option value="false">Inativo</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => handleUpdate(user.id)} disabled={savingUser}>
                                <Save className="h-4 w-4" /> Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                <X className="h-4 w-4" /> Cancelar
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium text-foreground">
                            {user.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.role}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                                <PencilLine className="h-4 w-4" /> Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(user.id)}
                                disabled={savingUser}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
