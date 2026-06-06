'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Eye, PlayCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CourseAssessmentsTab } from '@/components/teacher/CourseAssessmentsTab';
import { CourseContentTab } from '@/components/teacher/CourseContentTab';
import { CourseDetailsTab } from '@/components/teacher/CourseDetailsTab';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Role = 'ADMIN' | 'PROFESSOR';

type User = { role: string };

type CourseModule = {
  id: string;
  title: string;
  lessons: { id: string }[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  modules: CourseModule[];
};

type TabKey = 'detalhes' | 'conteudo' | 'avaliacoes';

const TAB_VALUES: TabKey[] = ['detalhes', 'conteudo', 'avaliacoes'];
const DEFAULT_TAB: TabKey = 'conteudo';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

export default function TeacherCourseStudioPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  // A página renderiza Skeleton no primeiro paint, então ler a URL no
  // inicializador não causa divergência de hidratação.
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return DEFAULT_TAB;
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    return fromUrl && TAB_VALUES.includes(fromUrl as TabKey)
      ? (fromUrl as TabKey)
      : DEFAULT_TAB;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCourse = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const [userResponse, courseResponse] = await Promise.all([
          apiRequest<User>('/users/me', { token }),
          apiRequest<Course>(`/courses/${courseId}`, { token }),
        ]);
        if (
          userResponse.role !== 'PROFESSOR' &&
          userResponse.role !== 'ADMIN'
        ) {
          router.replace('/dashboard');
          return;
        }
        setRole(userResponse.role as Role);
        setCourse(courseResponse);
        setError('');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar o curso.',
        );
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    },
    [courseId, router],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    void loadCourse(token);
  }, [loadCourse, router]);

  const handleTabChange = useCallback((value: string) => {
    const next = (TAB_VALUES.includes(value as TabKey) ? value : DEFAULT_TAB) as TabKey;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleCourseUpdated = useCallback(
    (data: { title: string; description?: string | null }) => {
      setCourse((prev) => (prev ? { ...prev, ...data } : prev));
    },
    [],
  );

  // Refetch silencioso (sem skeleton) para manter os contadores do header em
  // dia quando a aba Conteúdo cria/exclui módulos ou aulas.
  const refreshCourse = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await apiRequest<Course>(`/courses/${courseId}`, { token });
      setCourse(response);
    } catch {
      // silencioso — os contadores apenas ficam como estavam
    }
  }, [courseId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-4 w-48" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!course || !role) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error || 'Curso não encontrado.'}
        </div>
      </AppLayout>
    );
  }

  const moduleCount = course.modules.length;
  const lessonCount = course.modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0,
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="space-y-5">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => router.push('/teacher/dashboard')}>
                    Painel
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{course.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <motion.h1
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-3xl font-bold text-foreground"
              >
                {course.title}
              </motion.h1>
              <motion.p
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="max-w-2xl text-sm text-muted-foreground"
              >
                {course.description?.trim() ||
                  'Este curso ainda não possui uma descrição.'}
              </motion.p>
            </div>

            <Button
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <Eye className="h-4 w-4" />
              Ver como aluno
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              {moduleCount} módulo{moduleCount === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <PlayCircle className="h-3.5 w-3.5" />
              {lessonCount} aula{lessonCount === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes">
            <CourseDetailsTab
              course={course}
              role={role}
              onCourseUpdated={handleCourseUpdated}
            />
          </TabsContent>
          <TabsContent value="conteudo">
            <CourseContentTab courseId={course.id} onContentChanged={refreshCourse} />
          </TabsContent>
          <TabsContent value="avaliacoes">
            <CourseAssessmentsTab courseId={course.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
