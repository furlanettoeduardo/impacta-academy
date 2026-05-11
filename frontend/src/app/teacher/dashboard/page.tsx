'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, GraduationCap, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = { role: string };

type CourseProgress = { totalLessons: number; watchedLessons: number; percent: number };

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  progress?: CourseProgress;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    (acc, c) => acc + (c.progress?.totalLessons ?? 0),
    0,
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
            >
              Painel do Professor
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie seus cursos, módulos e aulas.
            </p>
          </div>
          <Button
            className="gap-2 bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground hover:opacity-95"
            onClick={() => router.push('/teacher/courses/manage')}
          >
            <Plus className="h-4 w-4" /> Novo curso
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Cursos cadastrados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalLessons}</p>
                <p className="text-xs text-muted-foreground">Aulas publicadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Cursos cadastrados</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => router.push('/teacher/courses/manage')}
            >
              Gerenciar <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : sortedCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum curso cadastrado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedCourses.map((course, i) => (
                <motion.div
                  key={course.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="group border-none shadow-md transition-all hover:shadow-lg">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          {course.progress?.totalLessons ?? 0} aulas
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {course.description ?? 'Sem descrição cadastrada.'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Criado em {formatDate(course.createdAt)}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            router.push(`/teacher/courses/${course.id}/modules`)
                          }
                        >
                          Gerenciar módulos
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/courses/${course.id}`)}
                        >
                          Visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
