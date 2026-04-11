'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type ModuleInfo = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  moduleId: string;
  videoUrl?: string | null;
  watched?: boolean;
  createdAt: string;
  updatedAt: string;
};

type WatchedResponse = {
  lessonId: string;
  watched: boolean;
  watchedAt?: string | null;
};

export default function ModuleLessonsPage() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;

  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [videoFinishedByLessonId, setVideoFinishedByLessonId] = useState<Record<string, boolean>>({});
  const [videoErrorByLessonId, setVideoErrorByLessonId] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [watchingRequest, setWatchingRequest] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<ModuleInfo>(`/modules/${moduleId}`, { token }),
      apiRequest<Lesson[]>(`/modules/${moduleId}/lessons`, { token }),
    ])
      .then(([moduleResponse, lessonsResponse]) => {
        const sorted = [...lessonsResponse].sort((a, b) => a.order - b.order);
        const firstUnwatched = sorted.find((lesson) => !lesson.watched);

        setModuleInfo(moduleResponse);
        setLessons(lessonsResponse);
        setSelectedLessonId(firstUnwatched?.id ?? sorted[0]?.id ?? null);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aulas.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [moduleId, router]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.order - b.order),
    [lessons],
  );

  const currentLesson = useMemo(
    () => sortedLessons.find((lesson) => lesson.id === selectedLessonId) ?? sortedLessons[0] ?? null,
    [selectedLessonId, sortedLessons],
  );

  const currentLessonIndex = useMemo(
    () => (currentLesson ? sortedLessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1),
    [currentLesson, sortedLessons],
  );

  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < sortedLessons.length - 1
      ? sortedLessons[currentLessonIndex + 1]
      : null;

  const canGoToNextLesson = Boolean(currentLesson?.watched && nextLesson);

  const handlePlaybackCompletion = (lessonId: string) => {
    if (videoFinishedByLessonId[lessonId]) {
      return;
    }

    setVideoFinishedByLessonId((prev) => ({
      ...prev,
      [lessonId]: true,
    }));
    void markLessonWatched(lessonId);
  };

  const markLessonWatched = async (lessonId: string) => {
    if (watchingRequest) {
      return;
    }

    const lesson = sortedLessons.find((item) => item.id === lessonId);
    if (!lesson || lesson.watched) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setWatchingRequest(true);
    setError('');

    try {
      const response = await apiRequest<WatchedResponse>(`/lessons/${lessonId}/watch`, {
        method: 'POST',
        token,
      });

      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === response.lessonId
            ? {
                ...lesson,
                watched: response.watched,
              }
            : lesson,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar aula assistida.');
    } finally {
      setWatchingRequest(false);
    }
  };

  const handleGoToNextLesson = () => {
    if (!canGoToNextLesson || !nextLesson) {
      return;
    }

    setSelectedLessonId(nextLesson.id);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {moduleInfo?.title ?? 'Modulo'}
          </h1>
          <p className="mt-1 text-muted-foreground">Aulas deste modulo</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lista de aulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando aulas...</p>
            ) : sortedLessons.length === 0 ? (
              <div className="py-8 text-center">
                <Play className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {sortedLessons.map((lesson) => {
                    const isActive = currentLesson?.id === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-secondary/30 hover:border-primary/40'
                        }`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              Aula {lesson.order}
                            </span>
                            <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                          </div>
                          {lesson.watched ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Assistida
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pendente</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {currentLesson ? (
                  <Card className="border-none bg-secondary/40">
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Aula {currentLesson.order}
                        </span>
                        <h2 className="text-xl font-semibold text-foreground">{currentLesson.title}</h2>
                      </div>

                      {currentLesson.videoUrl ? (
                        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-black/95">
                          <div className="relative aspect-video w-full">
                            <video
                              key={currentLesson.id}
                              className="h-full w-full object-contain"
                              controls
                              playsInline
                              preload="metadata"
                              src={currentLesson.videoUrl}
                              onEnded={() => handlePlaybackCompletion(currentLesson.id)}
                              onTimeUpdate={(event) => {
                                const { currentTime, duration } = event.currentTarget;
                                if (!Number.isFinite(duration) || duration <= 0) {
                                  return;
                                }

                                const progress = currentTime / duration;
                                if (progress >= 0.98) {
                                  handlePlaybackCompletion(currentLesson.id);
                                }
                              }}
                              onError={() =>
                                setVideoErrorByLessonId((prev) => ({
                                  ...prev,
                                  [currentLesson.id]:
                                    'Nao foi possivel reproduzir este link. Use uma URL direta de arquivo de video (ex: .mp4, .webm, .ogg).',
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Video nao informado para esta aula.</p>
                      )}

                      {currentLesson.videoUrl && videoErrorByLessonId[currentLesson.id] ? (
                        <p className="text-xs text-destructive">{videoErrorByLessonId[currentLesson.id]}</p>
                      ) : null}

                      <div className="rounded-md border border-border bg-background/80 p-4">
                        <p className="text-sm font-medium text-foreground">Descricao da aula</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {currentLesson.description?.trim() || 'Professor nao adicionou descricao para esta aula.'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4" />
                          {currentLesson.watched
                            ? 'Aula concluida automaticamente ao terminar o video.'
                            : 'A aula sera marcada como assistida automaticamente ao final do video.'}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGoToNextLesson}
                          disabled={!canGoToNextLesson}
                          className="gap-2"
                        >
                          Proxima aula <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
            <Separator />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
