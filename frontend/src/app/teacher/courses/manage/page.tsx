'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Eye, Plus, Save, Upload } from 'lucide-react';
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

type CourseModule = {
  id: string;
  title: string;
  order: number;
  courseId: string;
};

type Lesson = {
  id: string;
  title: string;
  order: number;
  moduleId: string;
  videoUrl?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function TeacherCourseManagePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [price, setPrice] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId('');
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<CourseModule[]>(`/courses/${selectedCourseId}/modules`, { token })
      .then((response) => {
        setModules(response);
        setSelectedModuleId(response[0]?.id ?? '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar modulos.');
      });
  }, [router, selectedCourseId]);

  useEffect(() => {
    if (!selectedModuleId) {
      setLessons([]);
      setSelectedLessonId('');
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<Lesson[]>(`/modules/${selectedModuleId}/lessons`, { token })
      .then((response) => {
        setLessons(response);
        setSelectedLessonId(response[0]?.id ?? '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aulas.');
      });
  }, [router, selectedModuleId]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses],
  );

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
      setSelectedCourseId(created.id);
      setTitle('');
      setCategory('');
      setDescription('');
      setLevel('');
      setPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar curso.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!uploadFile) {
      setError('Selecione um arquivo de video.');
      return;
    }

    if (!selectedLessonId) {
      setError('Selecione uma aula para anexar o video.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadUrl('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${API_URL}/upload/video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.message ?? 'Erro ao enviar o video.';
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const url = data.url as string;
      await apiRequest<Lesson>(`/lessons/${selectedLessonId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ videoUrl: url }),
      });

      setUploadUrl(url);
      setUploadFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o video.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Gerenciar Curso
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Crie ou edite um curso e faca upload das aulas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/courses')}>
              <Eye className="h-4 w-4" /> Pre-visualizar
            </Button>
            <Button
              className="gap-2 font-semibold"
              onClick={handleCreate}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
            >
              <Save className="h-4 w-4" /> Publicar Curso
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Informacoes do Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Titulo do Curso</Label>
                <Input
                  placeholder="Ex: React Avancado"
                  className="h-11"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  placeholder="Ex: Desenvolvimento"
                  className="h-11"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  placeholder="Descreva o conteudo do curso..."
                  className="min-h-[120px]"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Input
                  placeholder="Iniciante, Intermediario ou Avancado"
                  className="h-11"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preco (R$)</Label>
                <Input
                  type="number"
                  placeholder="0 para gratuito"
                  className="h-11"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Thumbnail do Curso</Label>
              <div className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste ou clique para enviar a imagem de capa
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG ate 5MB - Recomendado: 1280x720
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Aulas do Curso</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (selectedCourseId) {
                  router.push(`/teacher/courses/${selectedCourseId}/modules`);
                }
              }}
              disabled={!selectedCourseId || loading}
            >
              <Plus className="h-4 w-4" /> Adicionar Aula
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Curso selecionado</Label>
              <select
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={loading}
              >
                {sortedCourses.length === 0 ? (
                  <option value="">Nenhum curso cadastrado</option>
                ) : (
                  sortedCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modulo</Label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedModuleId}
                  onChange={(event) => setSelectedModuleId(event.target.value)}
                  disabled={loading || modules.length === 0}
                >
                  {modules.length === 0 ? (
                    <option value="">Nenhum modulo cadastrado</option>
                  ) : (
                    modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Aula</Label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedLessonId}
                  onChange={(event) => setSelectedLessonId(event.target.value)}
                  disabled={loading || lessons.length === 0}
                >
                  {lessons.length === 0 ? (
                    <option value="">Nenhuma aula cadastrada</option>
                  ) : (
                    lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Arraste arquivos de video ou documentos aqui
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                MP4, MOV, PDF, DOCX - ate 500MB por arquivo
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  className="max-w-xs"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Enviar video'}
                </Button>
              </div>
              {uploadUrl ? (
                <p className="mt-3 text-xs text-muted-foreground break-all">
                  URL gerada: {uploadUrl}
                </p>
              ) : null}
            </div>

            {sortedCourses.length === 0 ? (
              <div className="py-4 text-center">
                <BookOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum curso cadastrado ainda</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
