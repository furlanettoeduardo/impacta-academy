'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Download,
  GraduationCap,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { downloadFile, sanitizeFileName } from '@/lib/download';

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
  enrolled?: boolean;
  progress?: CourseProgress;
};

type Certificate = {
  id: string;
  code: string;
  issuedAt: string;
  course: { id: string; title: string };
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);
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
      apiRequest<Certificate[]>('/me/certificates', { token }),
    ])
      .then(([userResponse, coursesResponse, certificatesResponse]) => {
        setUser(userResponse);
        setCourses(coursesResponse.filter((c) => c.enrolled));
        setCertificates(certificatesResponse);
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

  const handleDownloadCertificate = async (certificate: Certificate) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setDownloadingCertificateId(certificate.id);
    setError('');
    try {
      await downloadFile(
        `/certificates/${certificate.id}/pdf`,
        `certificado-${sanitizeFileName(certificate.course.title)}.pdf`,
        token,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar certificado.');
    } finally {
      setDownloadingCertificateId(null);
    }
  };

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
      label: 'Cursos matriculados',
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
              <CardContent className="space-y-3 p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Você ainda não está matriculado em nenhum curso.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/courses')}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-95"
                >
                  <ShoppingBag className="h-4 w-4" /> Ver loja de cursos
                </button>
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

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Meus certificados</h2>

          {certificates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="space-y-3 p-8 text-center">
                <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Conclua todas as aulas de um curso para emitir seu certificado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((certificate, i) => (
                <motion.div
                  key={certificate.id}
                  custom={i + 6}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-foreground">
                            {certificate.course.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Emitido em{' '}
                            {new Date(certificate.issuedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Código: {certificate.code}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={() => handleDownloadCertificate(certificate)}
                        disabled={downloadingCertificateId === certificate.id}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingCertificateId === certificate.id
                          ? 'Baixando...'
                          : 'Baixar PDF'}
                      </Button>
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
