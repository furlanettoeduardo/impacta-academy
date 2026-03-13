'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  role: string;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

export default function TeacherCourseManagePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<User>('/users/me', { token }),
      apiRequest<Course[]>('/courses', { token }),
    ])
      .then(([userResponse, coursesResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setCourses(coursesResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [courses],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const handleCreate = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Informe o titulo do curso.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await apiRequest<Course>('/courses', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || undefined,
        }),
      });
      setCourses((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar curso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Gerenciar Cursos
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Crie cursos e organize seus modulos
            </p>
          </div>
          <Button
            className="gap-2 font-semibold"
            onClick={handleCreate}
            disabled={saving}
            style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
          >
            <Plus className="h-4 w-4" /> Criar Curso
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Novo curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Titulo do Curso</Label>
              <Input
                placeholder="Ex: React Avançado"
                className="h-11"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Descreva o conteúdo do curso..."
                className="min-h-[120px]"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <Button className="gap-2" onClick={handleCreate} disabled={saving}>
              <Plus className="h-4 w-4" /> Criar curso
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cursos cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando cursos...</p>
            ) : sortedCourses.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum curso cadastrado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedCourses.map((course) => (
                  <Card key={course.id} className="border-none bg-secondary/40">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {course.description ?? 'Sem descricao cadastrada.'}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Criado em {formatDate(course.createdAt)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/teacher/courses/${course.id}/modules`)}
                      >
                        Gerenciar modulos
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
