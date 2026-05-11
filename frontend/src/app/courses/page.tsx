'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react';
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

type EnrollResponse = { id: string; userId: string; courseId: string };

export default function StorePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'available' | 'enrolled'>('all');

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

  const handleEnroll = async (courseId: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setEnrolling(courseId);
    setError('');
    try {
      await apiRequest<EnrollResponse>(`/courses/${courseId}/enroll`, {
        method: 'POST',
        token,
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, enrolled: true } : c)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao matricular.');
    } finally {
      setEnrolling(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: courses.length,
      available: courses.filter((c) => !c.enrolled).length,
      enrolled: courses.filter((c) => c.enrolled).length,
    }),
    [courses],
  );

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return courses
      .filter((course) => {
        if (tab === 'available' && course.enrolled) return false;
        if (tab === 'enrolled' && !course.enrolled) return false;
        return course.title.toLowerCase().includes(lower);
      })
      .sort((a, b) => Number(a.enrolled ?? false) - Number(b.enrolled ?? false));
  }, [courses, search, tab]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-3xl font-bold text-foreground"
            >
              <ShoppingBag className="h-7 w-7 text-primary" />
              Loja de cursos
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Explore os cursos disponíveis e matricule-se nos que mais te interessam.
            </p>
          </div>
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
          <div className="inline-flex rounded-lg border border-border bg-card p-1 text-xs font-medium">
            {([
              { key: 'all', label: 'Todos' },
              { key: 'available', label: 'Disponíveis' },
              { key: 'enrolled', label: 'Matriculado' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTab(opt.key)}
                className={`rounded-md px-3 py-2 transition ${
                  tab === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
                <span className="ml-1.5 text-[10px] opacity-70">{counts[opt.key]}</span>
              </button>
            ))}
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
                <Card className="group flex h-full flex-col overflow-hidden border-none shadow-md transition-all hover:shadow-xl">
                  <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-primary via-primary to-accent">
                    <BookOpen className="h-10 w-10 text-primary-foreground/70" />
                    {course.enrolled ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-medium text-accent">
                        <CheckCircle2 className="h-3 w-3" /> Matriculado
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

                    {course.enrolled ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {course.progress?.watchedLessons ?? 0}/
                            {course.progress?.totalLessons ?? 0} aulas
                          </span>
                          <span className="font-semibold text-foreground">
                            {course.progress?.percent ?? 0}%
                          </span>
                        </div>
                        <Progress value={course.progress?.percent ?? 0} className="h-1.5" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(course.createdAt)}</span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                          {course.progress?.totalLessons ?? 0} aulas
                        </span>
                      </div>
                    )}

                    {course.enrolled ? (
                      <Button
                        size="sm"
                        className="mt-1 h-9 w-full gap-1"
                        onClick={() => router.push(`/courses/${course.id}`)}
                      >
                        Acessar curso <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-9 w-full gap-1 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                        disabled={enrolling === course.id}
                        onClick={() => handleEnroll(course.id)}
                      >
                        <Plus className="h-4 w-4" />
                        {enrolling === course.id ? 'Matriculando...' : 'Matricular-se'}
                      </Button>
                    )}
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
