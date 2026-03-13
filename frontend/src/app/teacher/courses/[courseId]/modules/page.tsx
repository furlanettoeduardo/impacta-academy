'use client';

import { useEffect, useMemo, useState } from 'react';
import { PencilLine, Plus, Save, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
};

type User = {
  role: string;
};

type CourseModule = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

export default function CourseModulesPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState('');
  const [newOrder, setNewOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOrder, setEditOrder] = useState(1);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<User>('/users/me', { token }),
      apiRequest<Course>(`/courses/${courseId}`, { token }),
      apiRequest<CourseModule[]>(`/courses/${courseId}/modules`, { token }),
    ])
      .then(([userResponse, courseResponse, modulesResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setCourse(courseResponse);
        setModules(modulesResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar modulos.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [courseId, router]);

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  );

  const handleAdd = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmed = newTitle.trim();
    if (!trimmed) {
      setError('Informe o titulo do modulo.');
      return;
    }

    const parsedOrder = Number(newOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Informe uma ordem valida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await apiRequest<CourseModule>('/modules', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: trimmed,
          order: parsedOrder,
          courseId,
        }),
      });
      setModules((prev) => [...prev, created]);
      setNewTitle('');
      setNewOrder(created.order + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar modulo.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (module: CourseModule) => {
    setEditingId(module.id);
    setEditTitle(module.title);
    setEditOrder(module.order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditOrder(1);
  };

  const handleUpdate = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('Informe o titulo do modulo.');
      return;
    }

    const parsedOrder = Number(editOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Informe uma ordem valida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await apiRequest<CourseModule>(`/modules/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ title: trimmed, order: parsedOrder }),
      });
      setModules((prev) => prev.map((item) => (item.id === id ? updated : item)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar modulo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/modules/${id}`, {
        method: 'DELETE',
        token,
      });
      setModules((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover modulo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {course?.title ?? 'Curso'}
            </h1>
            <p className="mt-1 text-muted-foreground">Gerencie os modulos deste curso</p>
          </div>
          <Button className="gap-2" onClick={handleAdd} disabled={saving || loading}>
            <Plus className="h-4 w-4" /> Add Module
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Novo modulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Titulo</label>
                <Input
                  className="h-11"
                  placeholder="Ex: Fundamentos"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ordem</label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  value={newOrder}
                  onChange={(event) => setNewOrder(Number(event.target.value))}
                />
              </div>
            </div>
            <Button className="gap-2" onClick={handleAdd} disabled={saving || loading}>
              <Plus className="h-4 w-4" /> Adicionar modulo
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Modules List</h2>
          </div>
          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando modulos...</p>
          ) : sortedModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modulo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {sortedModules.map((module) => {
                const isEditing = editingId === module.id;
                return (
                  <Card key={module.id} className="border-none shadow-md">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Modulo {module.order}
                        </span>
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                            <Input
                              className="h-9"
                              value={editTitle}
                              onChange={(event) => setEditTitle(event.target.value)}
                            />
                            <Input
                              className="h-9"
                              type="number"
                              min={1}
                              value={editOrder}
                              onChange={(event) => setEditOrder(Number(event.target.value))}
                            />
                          </div>
                        ) : (
                          <h3 className="text-base font-semibold text-foreground">{module.title}</h3>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" className="gap-2" onClick={() => handleUpdate(module.id)} disabled={saving}>
                              <Save className="h-4 w-4" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2" onClick={cancelEdit}>
                              <X className="h-4 w-4" /> Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => startEdit(module)}>
                              <PencilLine className="h-4 w-4" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(module.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
