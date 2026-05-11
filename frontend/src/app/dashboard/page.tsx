'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
        setUser(userResponse);
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

  const inProgressCourse = useMemo(
    () =>
      sortedCourses.find(
        (c) => (c.progress?.percent ?? 0) > 0 && (c.progress?.percent ?? 0) < 100,
      ) ?? null,
    [sortedCourses],
  );

  const totals = courses.reduce(
    (acc, course) => {
      const progress = course.progress;
      if (!progress) return acc;
      return {
        watched: acc.watched + progress.watchedLessons,
        total: acc.total + progress.totalLessons,
      };
    },
    { watched: 0, total: 0 },
  );
  const overallPercent = totals.total > 0 ? Math.round((totals.watched / totals.total) * 100) : 0;

  const stats = [
    {
      label: 'Cursos disponíveis',
      value: String(courses.length),
      icon: BookOpen,
      tone: 'primary' as const,
    },
    {
      label: 'Aulas concluídas',
      value: `${totals.watched}/${totals.total}`,
      icon: GraduationCap,
      tone: 'accent' as const,
    },
    {
      label: 'Progresso geral',
      value: `${overallPercent}%`,
      icon: Sparkles,
      tone: 'primary' as const,
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error || 'Não foi possível carregar seus dados.'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 shadow-sm">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
          >
            Olá, {user.name.split(' ')[0]}! 👋
          </motion.h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue de onde parou. Você está indo muito bem.
          </p>

          {inProgressCourse ? (
            <button
              type="button"
              onClick={() => router.push(`/courses/${inProgressCourse.id}`)}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-4 text-left transition hover:border-primary/40 hover:bg-background"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Continuar curso
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {inProgressCourse.title}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={inProgressCourse.progress?.percent ?? 0} className="h-1.5 w-40" />
                  <span className="text-xs text-muted-foreground">
                    {inProgressCourse.progress?.percent ?? 0}%
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      s.tone === 'primary'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-accent/15 text-accent'
                    }`}
                  >
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Seus cursos</h2>
          </div>

          {sortedCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum curso cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedCourses.slice(0, 6).map((course, i) => (
                <motion.div
                  key={course.id}
                  custom={i + 3}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Card
                    className="group cursor-pointer overflow-hidden border-none shadow-md transition-all hover:shadow-lg"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
                          {course.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {course.description ?? 'Sem descrição cadastrada.'}
                      </p>
                      <div className="space-y-1.5">
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
      </div>
    </AppLayout>
  );
}
