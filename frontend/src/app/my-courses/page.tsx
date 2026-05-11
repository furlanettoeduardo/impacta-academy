'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap, Search, ShoppingBag } from 'lucide-react';
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
  enrolled?: boolean;
  progress?: CourseProgress;
};

export default function MyCoursesPage() {
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
        setCourses(response.filter((c) => c.enrolled));
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
      courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [courses, search],
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-3xl font-bold text-foreground"
          >
            <GraduationCap className="h-7 w-7 text-primary" />
            Meus cursos
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe o progresso dos cursos em que você está matriculado.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nos seus cursos..."
            className="h-12 pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {courses.length === 0
                  ? 'Você ainda não está matriculado em nenhum curso.'
                  : 'Nenhum curso corresponde à busca.'}
              </p>
              {courses.length === 0 ? (
                <Button onClick={() => router.push('/courses')} className="gap-1">
                  <ShoppingBag className="h-4 w-4" /> Ver loja de cursos
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <Card
                  className="group flex h-full cursor-pointer flex-col overflow-hidden border-none shadow-md transition-all hover:shadow-lg"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
                        {course.title}
                      </h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {course.description ?? 'Sem descrição cadastrada.'}
                    </p>
                    <div className="mt-auto space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {course.progress?.watchedLessons ?? 0}/
                          {course.progress?.totalLessons ?? 0} aulas
                        </span>
                        <span className="font-semibold text-foreground">
                          {course.progress?.percent ?? 0}%
                        </span>
                      </div>
                      <Progress value={course.progress?.percent ?? 0} className="h-1.5" />
                    </div>
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
