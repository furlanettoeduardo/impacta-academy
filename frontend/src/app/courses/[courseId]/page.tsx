'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  PlayCircle,
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, ApiError, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { downloadFile, sanitizeFileName } from '@/lib/download';
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

type StudentAssessmentSummary = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  questionCount: number;
  submission: {
    id: string;
    status: 'PENDENTE' | 'CORRIGIDA';
    grade: number | null;
    submittedAt: string;
  } | null;
};

type CourseAssessmentsInfo = {
  assessmentsEnabled: boolean;
  requireAverageForCertificate: boolean;
  minAverage: number;
  lessonsCompleted?: boolean;
  pendingAssessments?: number;
  average?: number | null;
  assessments: StudentAssessmentSummary[];
};

const formatGrade = (value: number) => value.toFixed(1).replace('.', ',');

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
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
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const [assessmentsInfo, setAssessmentsInfo] = useState<CourseAssessmentsInfo | null>(null);

  // Timer do avanço automático ao fim do vídeo — limpo ao trocar de aula/desmontar.
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAssessments = useCallback(
    async (token: string) => {
      try {
        const assessmentsResponse = await apiRequest<CourseAssessmentsInfo>(
          `/courses/${courseId}/assessments`,
          { token },
        );
        setAssessmentsInfo(assessmentsResponse);
      } catch {
        // Avaliações são opcionais; falhas aqui não bloqueiam o curso.
        setAssessmentsInfo(null);
      }
    },
    [courseId],
  );

  const fetchCourse = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const response = await apiRequest<Course>(`/courses/${courseId}`, { token });
        setCourse(response);
        setEnrollmentRequired(false);
        setError('');
        await refreshAssessments(token);

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
    [courseId, lessonFromUrl, refreshAssessments, router],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    void fetchCourse(token);
  }, [fetchCourse, router]);

  useEffect(
    () => () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    },
    [],
  );

  const handleEnroll = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setEnrolling(true);
    try {
      await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST', token });
      toast.success('Matrícula realizada com sucesso!');
      await fetchCourse(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao matricular.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!course || downloadingCertificate) return;
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setDownloadingCertificate(true);
    try {
      const certificate = await apiRequest<{ id: string }>(
        `/courses/${courseId}/certificate`,
        { method: 'POST', token },
      );
      await downloadFile(
        `/certificates/${certificate.id}/pdf`,
        `certificado-${sanitizeFileName(course.title)}.pdf`,
        token,
      );
      toast.success('Certificado gerado com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao emitir certificado.');
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
      }
    } finally {
      setDownloadingCertificate(false);
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

  const goTo = useCallback((lesson: Lesson | null) => {
    if (!lesson) return;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSelectedLessonId(lesson.id);
    setOpenModuleId(lesson.moduleId);
    const url = new URL(window.location.href);
    url.searchParams.set('lesson', lesson.id);
    window.history.replaceState({}, '', url.toString());
  }, []);

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
        // Última aula concluída: o servidor passa a liberar as avaliações,
        // então atualizamos o status delas.
        const remaining = flatLessons.filter(
          (l) => !l.watched && l.id !== lessonId,
        ).length;
        if (remaining === 0) {
          void refreshAssessments(token);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao confirmar aula assistida.');
      } finally {
        setMarking(false);
      }
    },
    [flatLessons, marking, refreshAssessments, router],
  );

  const handlePlaybackProgress = (lessonId: string, ratio: number) => {
    if (ratio < 0.98 || autoCompleted[lessonId]) return;
    setAutoCompleted((prev) => ({ ...prev, [lessonId]: true }));
    void markWatched(lessonId);
  };

  // Ao terminar o vídeo: marca como assistida e agenda avanço automático.
  const handleVideoEnded = (lessonId: string) => {
    handlePlaybackProgress(lessonId, 1);
    if (lessonId !== currentLesson?.id) return;
    const upcoming = nextLesson;
    if (!upcoming) return;
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    toast.info(`Próxima aula: ${upcoming.title}`);
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      goTo(upcoming);
    }, 1500);
  };

  const enabledAssessments =
    assessmentsInfo?.assessmentsEnabled &&
    assessmentsInfo.lessonsCompleted !== undefined &&
    assessmentsInfo.assessments.length > 0;
  const assessmentCount = enabledAssessments
    ? assessmentsInfo!.assessments.length
    : 0;

  const totalLessons = course?.progress.totalLessons ?? 0;
  const watchedLessons = course?.progress.watchedLessons ?? 0;
  const coursePercent = course?.progress.percent ?? 0;
  const allLessonsDone = totalLessons > 0 && coursePercent === 100;
  const requireAverage = assessmentsInfo?.requireAverageForCertificate ?? false;
  const currentAverage = assessmentsInfo?.average;
  const averageOk =
    requireAverage &&
    currentAverage !== null &&
    currentAverage !== undefined &&
    (assessmentsInfo?.pendingAssessments ?? 0) === 0 &&
    currentAverage >= (assessmentsInfo?.minAverage ?? 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (enrollmentRequired) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center shadow-sm"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Curso bloqueado</h2>
          <p className="text-sm text-muted-foreground">
            Você precisa se matricular para acessar este curso.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={handleEnroll} disabled={enrolling} className="gap-1">
              {enrolling ? 'Matriculando...' : 'Matricular-se agora'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/courses')}>
              Voltar para a loja
            </Button>
          </div>
        </motion.div>
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

  const aboutTab = currentLesson ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Aula {currentLesson.order}
          </span>
          <h2 className="text-xl font-semibold text-foreground">{currentLesson.title}</h2>
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
            ? currentLesson.videoUrl
              ? 'Aula concluída — marcada automaticamente ao final do vídeo.'
              : 'Aula concluída.'
            : currentLesson.videoUrl
              ? 'A aula será marcada como concluída ao terminar o vídeo.'
              : 'Marque a aula como concluída para registrar seu progresso.'}
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
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      Nenhuma aula cadastrada neste curso ainda.
    </p>
  );

  const assessmentsTab = enabledAssessments ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {assessmentsInfo!.requireAverageForCertificate
            ? `Média mínima de ${formatGrade(assessmentsInfo!.minAverage)} nas avaliações para emitir o certificado.`
            : 'As avaliações deste curso não interferem na emissão do certificado.'}
        </p>
        {assessmentsInfo!.average !== null && assessmentsInfo!.average !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              (assessmentsInfo!.pendingAssessments ?? 0) > 0
                ? 'bg-secondary text-muted-foreground'
                : !assessmentsInfo!.requireAverageForCertificate ||
                    assessmentsInfo!.average >= assessmentsInfo!.minAverage
                  ? 'bg-accent/15 text-accent'
                  : 'bg-destructive/10 text-destructive',
            )}
          >
            {(assessmentsInfo!.pendingAssessments ?? 0) > 0
              ? `Média parcial: ${formatGrade(assessmentsInfo!.average)}`
              : `Média final: ${formatGrade(assessmentsInfo!.average)}`}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {assessmentsInfo!.assessments.map((assessment, i) => {
          // Flag exata do servidor (assistiu todas as aulas), evitando
          // divergência com o arredondamento do percentual.
          const unlocked = assessmentsInfo!.lessonsCompleted === true;
          const submission = assessment.submission;

          return (
            <motion.div
              key={assessment.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="h-full border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {assessment.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {assessment.questionCount} quest
                          {assessment.questionCount === 1 ? 'ão' : 'ões'}
                        </p>
                      </div>
                    </div>

                    {submission ? (
                      submission.status === 'CORRIGIDA' && submission.grade !== null ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Nota:{' '}
                          {formatGrade(submission.grade)}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Aguardando correção
                        </span>
                      )
                    ) : !unlocked ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Bloqueada
                      </span>
                    ) : null}
                  </div>

                  {assessment.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {assessment.description}
                    </p>
                  ) : null}

                  {submission ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={() =>
                        router.push(`/courses/${courseId}/assessments/${assessment.id}`)
                      }
                    >
                      {submission.status === 'CORRIGIDA' ? 'Ver resultado' : 'Ver envio'}
                    </Button>
                  ) : unlocked && assessment.questionCount > 0 ? (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() =>
                        router.push(`/courses/${courseId}/assessments/${assessment.id}`)
                      }
                    >
                      Realizar avaliação
                    </Button>
                  ) : unlocked ? (
                    <p className="text-xs text-muted-foreground">
                      Esta avaliação ainda não possui questões.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Conclua todas as aulas do curso para liberar esta avaliação.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <p className="mt-3 text-sm text-muted-foreground">
        Este curso não possui avaliações disponíveis.
      </p>
    </div>
  );

  const certificateTab = (
    <div className="space-y-4">
      <Card className="border-none shadow-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Certificado de conclusão</h3>
              <p className="text-xs text-muted-foreground">
                Conclua os requisitos abaixo para emitir o seu certificado.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            <li className="flex items-center gap-2.5 text-sm">
              {allLessonsDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={cn(
                  allLessonsDone ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                Concluir todas as aulas ({watchedLessons}/{totalLessons})
              </span>
            </li>

            {requireAverage ? (
              <li className="flex items-center gap-2.5 text-sm">
                {averageOk ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                )}
                <span className={cn(averageOk ? 'text-foreground' : 'text-muted-foreground')}>
                  Média ≥ {formatGrade(assessmentsInfo?.minAverage ?? 0)}
                  {currentAverage !== null && currentAverage !== undefined
                    ? ` (média atual: ${formatGrade(currentAverage)})`
                    : ' (média atual: —)'}
                </span>
              </li>
            ) : null}
          </ul>

          <Button
            className="w-full gap-1.5"
            onClick={handleDownloadCertificate}
            disabled={!allLessonsDone || downloadingCertificate}
          >
            <Award className="h-4 w-4" />
            {downloadingCertificate ? 'Gerando certificado...' : 'Baixar certificado'}
          </Button>

          {!allLessonsDone ? (
            <p className="text-center text-xs text-muted-foreground">
              Conclua todas as aulas para liberar a emissão do certificado.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <header className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button
                    type="button"
                    onClick={() => router.push('/courses')}
                    className="inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Catálogo
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{course.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

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
                <span className="font-semibold text-foreground">{coursePercent}%</span>
              </div>
              <Progress value={coursePercent} className="mt-2 h-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {watchedLessons}/{totalLessons} aulas concluídas
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
          <section className="space-y-6">
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
                    onEnded={() => handleVideoEnded(currentLesson.id)}
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
                ) : currentLesson ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-primary-foreground/70">
                    {currentLesson.watched ? (
                      <>
                        <CheckCircle2 className="h-14 w-14 text-accent" />
                        <p className="text-sm">Esta aula não possui vídeo.</p>
                        <p className="text-xs">Aula concluída.</p>
                      </>
                    ) : (
                      <>
                        <FileText className="h-14 w-14" />
                        <p className="text-sm">Esta aula não possui vídeo.</p>
                        <p className="text-xs">
                          Leia o conteúdo e marque como concluída para registrar seu
                          progresso.
                        </p>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void markWatched(currentLesson.id)}
                          disabled={marking}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {marking ? 'Marcando...' : 'Marcar aula como concluída'}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-primary-foreground/70">
                    <PlayCircle className="h-14 w-14" />
                    <p className="text-sm">Selecione uma aula.</p>
                  </div>
                )}
              </div>
            </Card>

            <Tabs defaultValue="sobre" className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                <TabsTrigger value="sobre">Sobre</TabsTrigger>
                <TabsTrigger value="avaliacoes" className="gap-1.5">
                  Avaliações
                  {assessmentCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                      {assessmentCount}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="certificado">Certificado</TabsTrigger>
              </TabsList>

              <TabsContent value="sobre" className="mt-4">
                <Card className="border-none shadow-md">
                  <CardContent className="p-5">{aboutTab}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="avaliacoes" className="mt-4">
                {assessmentsTab}
              </TabsContent>

              <TabsContent value="certificado" className="mt-4">
                {certificateTab}
              </TabsContent>
            </Tabs>
          </section>

          <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Conteúdo do curso</p>
              <p className="text-xs text-muted-foreground">
                {course.modules.length} módulo{course.modules.length === 1 ? '' : 's'} ·{' '}
                {totalLessons} aula{totalLessons === 1 ? '' : 's'}
              </p>
            </div>

            <div className="space-y-2">
              {course.modules.map((module) => {
                const isOpen = openModuleId === module.id;
                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
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
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
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
                                      ? 'border-l-2 border-primary bg-primary/10 text-foreground'
                                      : 'border-l-2 border-transparent hover:bg-secondary/50 hover:pl-5',
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
      </motion.div>
    </AppLayout>
  );
}
