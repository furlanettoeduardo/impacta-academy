'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Lock,
  PlayCircle,
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  moduleId: string;
  videoUrl?: string | null;
  watched?: boolean;
};

type ModuleProgress = {
  totalLessons: number;
  watchedLessons: number;
  percent: number;
};

type CourseModule = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
  progress: ModuleProgress;
};

type CourseProgress = ModuleProgress & {
  modules: { moduleId: string; totalLessons: number; watchedLessons: number; percent: number }[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  modules: CourseModule[];
  progress: CourseProgress;
};

type WatchedResponse = {
  lessonId: string;
  watched: boolean;
  watchedAt?: string | null;
};

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const searchParams = useSearchParams();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
  const lessonFromUrl = searchParams.get('lesson');

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [videoError, setVideoError] = useState<Record<string, string>>({});
  const [autoCompleted, setAutoCompleted] = useState<Record<string, boolean>>({});
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const fetchCourse = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const response = await apiRequest<Course>(`/courses/${courseId}`, { token });
        setCourse(response);
        setEnrollmentRequired(false);
        setError('');

        const flatLessons = response.modules.flatMap((m) =>
          m.lessons.map((l) => ({ ...l, moduleId: m.id })),
        );

        const preferred =
          (lessonFromUrl && flatLessons.find((l) => l.id === lessonFromUrl)) ||
          flatLessons.find((l) => !l.watched) ||
          flatLessons[0] ||
          null;

        if (preferred) {
          setSelectedLessonId(preferred.id);
          setOpenModuleId(preferred.moduleId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar curso.';
        if (err instanceof ApiError && err.status === 403) {
          setEnrollmentRequired(true);
          setCourse(null);
          setError('');
        } else {
          setError(message);
          if (isAuthError(err)) {
            clearToken();
            router.replace('/login');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [courseId, lessonFromUrl, router],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    void fetchCourse(token);
  }, [fetchCourse, router]);

  const handleEnroll = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setEnrolling(true);
    setError('');
    try {
      await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST', token });
      await fetchCourse(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao matricular.');
    } finally {
      setEnrolling(false);
    }
  };

  const flatLessons = useMemo<Lesson[]>(
    () =>
      course?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id }))) ?? [],
    [course],
  );

  const currentLesson = useMemo(
    () => flatLessons.find((l) => l.id === selectedLessonId) ?? flatLessons[0] ?? null,
    [flatLessons, selectedLessonId],
  );

  const currentIndex = currentLesson
    ? flatLessons.findIndex((l) => l.id === currentLesson.id)
    : -1;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  const markWatched = useCallback(
    async (lessonId: string) => {
      if (marking) return;
      const target = flatLessons.find((l) => l.id === lessonId);
      if (!target || target.watched) return;

      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      setMarking(true);
      try {
        const res = await apiRequest<WatchedResponse>(`/lessons/${lessonId}/watch`, {
          method: 'POST',
          token,
        });

        setCourse((prev) => {
          if (!prev) return prev;
          let watchedDelta = 0;
          const modules = prev.modules.map((m) => {
            let moduleDelta = 0;
            const lessons = m.lessons.map((l) => {
              if (l.id !== res.lessonId) return l;
              if (l.watched === res.watched) return l;
              moduleDelta = res.watched ? 1 : -1;
              return { ...l, watched: res.watched };
            });
            if (moduleDelta === 0) return { ...m, lessons };
            watchedDelta += moduleDelta;
            const watchedLessons = m.progress.watchedLessons + moduleDelta;
            const total = m.progress.totalLessons;
            return {
              ...m,
              lessons,
              progress: {
                totalLessons: total,
                watchedLessons,
                percent: total > 0 ? Math.round((watchedLessons / total) * 100) : 0,
              },
            };
          });

          const watchedLessons = prev.progress.watchedLessons + watchedDelta;
          const total = prev.progress.totalLessons;

          return {
            ...prev,
            modules,
            progress: {
              ...prev.progress,
              watchedLessons,
              percent: total > 0 ? Math.round((watchedLessons / total) * 100) : 0,
              modules: modules.map((m) => ({
                moduleId: m.id,
                totalLessons: m.progress.totalLessons,
                watchedLessons: m.progress.watchedLessons,
                percent: m.progress.percent,
              })),
            },
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao confirmar aula assistida.');
      } finally {
        setMarking(false);
      }
    },
    [flatLessons, marking, router],
  );

  const handlePlaybackProgress = (lessonId: string, ratio: number) => {
    if (ratio < 0.98 || autoCompleted[lessonId]) return;
    setAutoCompleted((prev) => ({ ...prev, [lessonId]: true }));
    void markWatched(lessonId);
  };

  const goTo = (lesson: Lesson | null) => {
    if (!lesson) return;
    setSelectedLessonId(lesson.id);
    setOpenModuleId(lesson.moduleId);
    const url = new URL(window.location.href);
    url.searchParams.set('lesson', lesson.id);
    window.history.replaceState({}, '', url.toString());
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (enrollmentRequired) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Curso bloqueado
          </h2>
          <p className="text-sm text-muted-foreground">
            Você precisa se matricular para acessar este curso.
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={handleEnroll} disabled={enrolling} className="gap-1">
              {enrolling ? 'Matriculando...' : 'Matricular-se agora'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/courses')}>
              Voltar para a loja
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error || 'Curso não encontrado.'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push('/courses')}
              className="inline-flex items-center gap-1 transition hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Catálogo
            </button>
            <span>/</span>
            <span className="text-foreground/80">{course.title}</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
              {course.description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {course.description}
                </p>
              ) : null}
            </div>

            <div className="min-w-[14rem] rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso do curso</span>
                <span className="font-semibold text-foreground">{course.progress.percent}%</span>
              </div>
              <Progress value={course.progress.percent} className="mt-2 h-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {course.progress.watchedLessons}/{course.progress.totalLessons} aulas concluídas
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-4">
            <Card className="overflow-hidden border-none shadow-lg">
              <div className="relative aspect-video w-full bg-[radial-gradient(circle_at_top_left,hsl(262_80%_18%),hsl(220_30%_8%))]">
                {currentLesson?.videoUrl ? (
                  <video
                    key={currentLesson.id}
                    className="h-full w-full"
                    controls
                    playsInline
                    preload="metadata"
                    src={currentLesson.videoUrl}
                    onEnded={() => handlePlaybackProgress(currentLesson.id, 1)}
                    onTimeUpdate={(event) => {
                      const { currentTime, duration } = event.currentTarget;
                      if (!Number.isFinite(duration) || duration <= 0) return;
                      handlePlaybackProgress(currentLesson.id, currentTime / duration);
                    }}
                    onError={() =>
                      setVideoError((prev) => ({
                        ...prev,
                        [currentLesson.id]:
                          'Não foi possível reproduzir o vídeo. Verifique a URL.',
                      }))
                    }
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-primary-foreground/70">
                    <PlayCircle className="h-14 w-14" />
                    <p className="text-sm">
                      {currentLesson ? 'Esta aula ainda não possui vídeo.' : 'Selecione uma aula.'}
                    </p>
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                {currentLesson ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          Aula {currentLesson.order}
                        </span>
                        <h2 className="text-xl font-semibold text-foreground">
                          {currentLesson.title}
                        </h2>
                      </div>
                      {currentLesson.watched ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                          <CircleDot className="h-3.5 w-3.5" /> Pendente
                        </span>
                      )}
                    </div>

                    {videoError[currentLesson.id] ? (
                      <p className="text-xs text-destructive">{videoError[currentLesson.id]}</p>
                    ) : null}

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {currentLesson.description?.trim() ||
                        'O professor ainda não adicionou descrição para esta aula.'}
                    </p>

                    <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {currentLesson.watched
                          ? 'Aula concluída — marcada automaticamente ao final do vídeo.'
                          : 'A aula será marcada como concluída ao terminar o vídeo.'}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goTo(prevLesson)}
                          disabled={!prevLesson}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => goTo(nextLesson)}
                          disabled={!nextLesson}
                          className="gap-1"
                        >
                          Próxima <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma aula cadastrada neste curso ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Conteúdo do curso</p>
              <p className="text-xs text-muted-foreground">
                {course.modules.length} módulo{course.modules.length === 1 ? '' : 's'} ·{' '}
                {course.progress.totalLessons} aula
                {course.progress.totalLessons === 1 ? '' : 's'}
              </p>
            </div>

            <div className="space-y-2">
              {course.modules.map((module) => {
                const isOpen = openModuleId === module.id;
                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-secondary/50"
                      onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Módulo {module.order}
                        </span>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {module.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${module.progress.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {module.progress.watchedLessons}/{module.progress.totalLessons}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          isOpen && 'rotate-90',
                        )}
                      />
                    </button>

                    {isOpen ? (
                      <ul className="divide-y divide-border border-t border-border bg-background/40">
                        {module.lessons.length === 0 ? (
                          <li className="px-4 py-3 text-xs text-muted-foreground">
                            Sem aulas cadastradas.
                          </li>
                        ) : (
                          module.lessons.map((lesson) => {
                            const isActive = lesson.id === currentLesson?.id;
                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                                    isActive
                                      ? 'bg-primary/10 text-foreground'
                                      : 'hover:bg-secondary/50',
                                  )}
                                  onClick={() =>
                                    goTo({ ...lesson, moduleId: module.id } as Lesson)
                                  }
                                >
                                  {lesson.watched ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                                  ) : isActive ? (
                                    <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                  ) : (
                                    <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-xs">
                                    <span className="text-muted-foreground">
                                      {lesson.order}.
                                    </span>{' '}
                                    {lesson.title}
                                  </span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    ) : null}
                  </div>
                );
              })}

              {course.modules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  Este curso ainda não possui módulos.
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
