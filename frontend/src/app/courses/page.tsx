'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

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

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    apiRequest<Course[]>('/courses', { token })
      .then((response) => {
        setCourses(response);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar cursos.');
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(
    () =>
      courses.filter((course) =>
        course.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [courses, search],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
          >
            Catálogo de cursos
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Explore os cursos disponíveis e continue aprendendo.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              className="h-12 pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum curso encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <Card className="group flex h-full cursor-pointer flex-col overflow-hidden border-none shadow-md transition-all hover:shadow-xl">
                  <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-primary via-primary to-accent">
                    <BookOpen className="h-10 w-10 text-primary-foreground/70" />
                    {(course.progress?.percent ?? 0) > 0 ? (
                      <span className="absolute right-3 top-3 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {course.progress?.percent}%
                      </span>
                    ) : null}
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex-1 space-y-1">
                      <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                        {course.title}
                      </h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {course.description ?? 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {course.progress?.watchedLessons ?? 0}/
                          {course.progress?.totalLessons ?? 0} aulas
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(course.createdAt)}
                        </span>
                      </div>
                      <Progress value={course.progress?.percent ?? 0} className="h-1.5" />
                    </div>

                    <Button
                      size="sm"
                      className="mt-1 h-9 w-full gap-1"
                      onClick={() => router.push(`/courses/${course.id}`)}
                    >
                      Acessar curso <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
