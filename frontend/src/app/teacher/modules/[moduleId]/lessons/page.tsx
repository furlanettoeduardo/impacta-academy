'use client';

import { useEffect, useMemo, useState } from 'react';
import { PencilLine, Plus, Save, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type ModuleInfo = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type User = {
  role: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  moduleId: string;
  createdAt: string;
  updatedAt: string;
};

export default function ModuleLessonsPage() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;

  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOrder, setNewOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
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
      apiRequest<ModuleInfo>(`/modules/${moduleId}`, { token }),
      apiRequest<Lesson[]>(`/modules/${moduleId}/lessons`, { token }),
    ])
      .then(([userResponse, moduleResponse, lessonsResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setModuleInfo(moduleResponse);
        setLessons(lessonsResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aulas.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [moduleId, router]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.order - b.order),
    [lessons],
  );

  const handleAdd = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmed = newTitle.trim();
    if (!trimmed) {
      setError('Informe o titulo da aula.');
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
      const created = await apiRequest<Lesson>('/lessons', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: trimmed,
          description: newDescription.trim() || undefined,
          order: parsedOrder,
          moduleId,
        }),
      });
      setLessons((prev) => [...prev, created]);
      setNewTitle('');
      setNewDescription('');
      setNewOrder(created.order + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar aula.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description ?? '');
    setEditOrder(lesson.order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
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
      setError('Informe o titulo da aula.');
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
      const updated = await apiRequest<Lesson>(`/lessons/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          title: trimmed,
          description: editDescription.trim() || undefined,
          order: parsedOrder,
        }),
      });
      setLessons((prev) => prev.map((item) => (item.id === id ? updated : item)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aula.');
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
      await apiRequest(`/lessons/${id}`, {
        method: 'DELETE',
        token,
      });
      setLessons((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover aula.');
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
              {moduleInfo?.title ?? 'Modulo'}
            </h1>
            <p className="mt-1 text-muted-foreground">Gerencie as aulas deste modulo</p>
          </div>
          <Button className="gap-2" onClick={handleAdd} disabled={saving || loading}>
            <Plus className="h-4 w-4" /> Add Lesson
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Nova aula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Titulo</label>
                <Input
                  className="h-11"
                  placeholder="Ex: useState"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descricao</label>
                <Textarea
                  placeholder="Resumo da aula..."
                  className="min-h-[110px]"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:max-w-[160px]">
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
              <Plus className="h-4 w-4" /> Adicionar aula
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Lessons List</h2>
          </div>
          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando aulas...</p>
          ) : sortedLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {sortedLessons.map((lesson) => {
                const isEditing = editingId === lesson.id;
                return (
                  <Card key={lesson.id} className="border-none shadow-md">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Aula {lesson.order}
                        </span>
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-3">
                            <Input
                              className="h-9"
                              value={editTitle}
                              onChange={(event) => setEditTitle(event.target.value)}
                            />
                            <Textarea
                              className="min-h-[90px]"
                              value={editDescription}
                              onChange={(event) => setEditDescription(event.target.value)}
                            />
                            <Input
                              className="h-9 sm:max-w-[160px]"
                              type="number"
                              min={1}
                              value={editOrder}
                              onChange={(event) => setEditOrder(Number(event.target.value))}
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-base font-semibold text-foreground">{lesson.title}</h3>
                            {lesson.description ? (
                              <p className="text-sm text-muted-foreground">{lesson.description}</p>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" className="gap-2" onClick={() => handleUpdate(lesson.id)} disabled={saving}>
                              <Save className="h-4 w-4" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2" onClick={cancelEdit}>
                              <X className="h-4 w-4" /> Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => startEdit(lesson)}>
                              <PencilLine className="h-4 w-4" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(lesson.id)}
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
