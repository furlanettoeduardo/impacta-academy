'use client';

import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Eye,
  GraduationCap,
  Layers,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = { role: 'ADMIN' | 'PROFESSOR' | 'ALUNO' };

type CourseProgress = {
  totalLessons: number;
  watchedLessons: number;
  percent: number;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  progress?: CourseProgress;
};

type CourseModule = { id: string };

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<User['role'] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [moduleCountById, setModuleCountById] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      .then(async ([userResponse, coursesResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setRole(userResponse.role);
        setCourses(coursesResponse);
        setError('');

        const counts = await Promise.all(
          coursesResponse.map(async (course) => {
            try {
              const modules = await apiRequest<CourseModule[]>(
                `/courses/${course.id}/modules`,
                { token },
              );
              return [course.id, modules.length] as const;
            } catch {
              return [course.id, 0] as const;
            }
          }),
        );
        setModuleCountById(Object.fromEntries(counts));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const sortedCourses = useMemo(
    () =>
      [...courses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [courses],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const totalLessons = courses.reduce(
    (acc, course) => acc + (course.progress?.totalLessons ?? 0),
    0,
  );

  const totalModules = useMemo(
    () => Object.values(moduleCountById).reduce((acc, count) => acc + count, 0),
    [moduleCountById],
  );

  const stats = [
    {
      label: 'Cursos',
      value: String(courses.length),
      icon: BookOpen,
      tone: 'primary' as const,
    },
    {
      label: 'Módulos totais',
      value: String(totalModules),
      icon: Layers,
      tone: 'accent' as const,
    },
    {
      label: 'Aulas publicadas',
      value: String(totalLessons),
      icon: GraduationCap,
      tone: 'primary' as const,
    },
  ];

  const handleCreate = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast.error('Informe o título do curso.');
      return;
    }

    setCreating(true);
    try {
      const created = await apiRequest<Course>('/courses', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: trimmedTitle,
          description: newDescription.trim() || undefined,
        }),
      });
      toast.success('Curso criado com sucesso.');
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/teacher/courses/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar curso.');
    } finally {
      setCreating(false);
    }
  };

  const refetchCourses = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const list = await apiRequest<Course[]>('/courses', { token });
      setCourses(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
    }
  };

  const handleDelete = async () => {
    if (!courseToDelete) {
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setDeleting(true);
    try {
      await apiRequest(`/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        token,
      });
      toast.success('Curso excluído com sucesso.');
      setCourseToDelete(null);
      await refetchCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir o curso.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-foreground"
              >
                Painel do Professor
              </motion.h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie e gerencie seus cursos, módulos, aulas e avaliações.
              </p>
            </div>
            <Button
              className="gap-2 bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground hover:opacity-95"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Novo curso
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      stat.tone === 'primary'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-accent/15 text-accent'
                    }`}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Seus cursos</h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          ) : sortedCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="space-y-3 p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Você ainda não criou nenhum curso.
                </p>
                <Button
                  className="gap-2 bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground hover:opacity-95"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Crie seu primeiro curso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedCourses.map((course, i) => {
                const moduleCount = moduleCountById[course.id] ?? 0;
                const lessonCount = course.progress?.totalLessons ?? 0;
                return (
                  <motion.div
                    key={course.id}
                    custom={i + 3}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card
                      className="group flex h-full cursor-pointer flex-col overflow-hidden border-none shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      onClick={() => router.push(`/teacher/courses/${course.id}`)}
                    >
                      <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                      <CardContent className="flex flex-1 flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
                            {course.title}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                                aria-label="Mais ações do curso"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onSelect={() => router.push(`/courses/${course.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Ver como aluno
                              </DropdownMenuItem>
                              {role === 'ADMIN' ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setCourseToDelete(course)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir curso
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {course.description ?? 'Sem descrição cadastrada.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                            <Layers className="h-3 w-3" /> {moduleCount} módulos
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                            <GraduationCap className="h-3 w-3" /> {lessonCount} aulas
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Criado em {formatDate(course.createdAt)}</span>
                        </div>

                        <div className="mt-auto pt-1">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/teacher/courses/${course.id}`);
                            }}
                          >
                            Gerenciar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo curso</DialogTitle>
            <DialogDescription>
              Defina um título e uma descrição. Você poderá adicionar módulos, aulas e
              avaliações em seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="course-title">Título</Label>
              <Input
                id="course-title"
                placeholder="Ex: React Avançado"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-description">Descrição</Label>
              <Textarea
                id="course-description"
                placeholder="Descreva o conteúdo do curso..."
                className="min-h-[110px]"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button className="gap-2" onClick={handleCreate} disabled={creating}>
              <Plus className="h-4 w-4" /> {creating ? 'Criando...' : 'Criar curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={courseToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCourseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o curso{' '}
              <span className="font-semibold text-foreground">
                {courseToDelete?.title}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
