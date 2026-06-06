'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  Clock,
  Send,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, ApiError, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

type AssessmentOption = {
  id: string;
  text: string;
  order: number;
  isCorrect?: boolean;
};

type AssessmentAnswer = {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  text: string | null;
  earnedPoints: number | null;
};

type AssessmentQuestion = {
  id: string;
  type: 'OBJETIVA' | 'DISSERTATIVA';
  statement: string;
  points: number;
  order: number;
  options: AssessmentOption[];
  answer?: AssessmentAnswer | null;
};

type AssessmentSubmissionInfo = {
  id: string;
  status: 'PENDENTE' | 'CORRIGIDA';
  grade: number | null;
  submittedAt: string;
  gradedAt: string | null;
};

type AssessmentView = {
  mode: 'realizar' | 'resultado' | 'professor';
  id: string;
  title: string;
  description?: string | null;
  course: { id: string; title: string };
  totalPoints: number;
  submission?: AssessmentSubmissionInfo;
  questions: AssessmentQuestion[];
};

type DraftAnswer = { selectedOptionId?: string; text?: string };

const formatGrade = (value: number) => value.toFixed(1).replace('.', ',');

const formatPoints = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace('.', ',');

export default function CourseAssessmentPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string; assessmentId: string }>();
  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;
  const assessmentId = Array.isArray(params.assessmentId)
    ? params.assessmentId[0]
    : params.assessmentId;

  const [view, setView] = useState<AssessmentView | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({});
  const [error, setError] = useState('');
  const [blockedMessage, setBlockedMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchView = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const response = await apiRequest<AssessmentView>(
          `/assessments/${assessmentId}`,
          { token },
        );
        setView(response);
        setBlockedMessage('');
        setError('');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar avaliação.';
        if (err instanceof ApiError && err.status === 403) {
          setBlockedMessage(message);
          setView(null);
          setError('');
        } else {
          setError(message);
          if (err instanceof ApiError && err.status === 401) {
            clearToken();
            router.replace('/login');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [assessmentId, router],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    void fetchView(token);
  }, [fetchView, router]);

  const setDraft = (questionId: string, draft: DraftAnswer) => {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...draft },
    }));
  };

  const handleSubmit = async () => {
    if (!view || submitting) return;
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    for (const question of view.questions) {
      const draft = drafts[question.id];
      if (question.type === 'OBJETIVA' && !draft?.selectedOptionId) {
        setError('Responda todas as questões antes de enviar.');
        return;
      }
      if (question.type === 'DISSERTATIVA' && !draft?.text?.trim()) {
        setError('Responda todas as questões antes de enviar.');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/assessments/${assessmentId}/submit`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          answers: view.questions.map((question) => {
            const draft = drafts[question.id];
            return question.type === 'OBJETIVA'
              ? {
                  questionId: question.id,
                  selectedOptionId: draft.selectedOptionId,
                }
              : { questionId: question.id, text: draft.text?.trim() };
          }),
        }),
      });
      await fetchView(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar avaliação.');
      if (isAuthError(err) && err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBanner = () => {
    if (!view || view.mode !== 'resultado' || !view.submission) return null;
    const { submission } = view;

    if (submission.status === 'CORRIGIDA' && submission.grade !== null) {
      return (
        <div className="flex items-center gap-4 rounded-xl border border-accent/30 bg-accent/10 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avaliação corrigida</p>
            <p className="text-2xl font-bold text-foreground">
              Nota: {formatGrade(submission.grade)}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Avaliação enviada
          </p>
          <p className="text-sm text-muted-foreground">
            As questões dissertativas estão aguardando a correção do professor.
          </p>
        </div>
      </div>
    );
  };

  const renderResultOption = (
    question: AssessmentQuestion,
    option: AssessmentOption,
  ) => {
    const selected = question.answer?.selectedOptionId === option.id;
    const isCorrect = option.isCorrect === true;
    return (
      <li
        key={option.id}
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
          isCorrect
            ? 'border-accent/40 bg-accent/10 text-foreground'
            : selected
              ? 'border-destructive/40 bg-destructive/5 text-foreground'
              : 'border-border bg-background/40 text-muted-foreground',
        )}
      >
        {isCorrect ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
        ) : selected ? (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        )}
        <span className="min-w-0 flex-1">{option.text}</span>
        {selected ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Sua resposta
          </span>
        ) : null}
      </li>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (blockedMessage) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Avaliação indisponível
          </h2>
          <p className="text-sm text-muted-foreground">{blockedMessage}</p>
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para o curso
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!view) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error || 'Avaliação não encontrada.'}
        </div>
      </AppLayout>
    );
  }

  const isTaking = view.mode === 'realizar';

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push(`/courses/${courseId}`)}
              className="inline-flex items-center gap-1 transition hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {view.course.title}
            </button>
            <span>/</span>
            <span className="text-foreground/80">{view.title}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{view.title}</h1>
            {view.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {view.description}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {view.questions.length} quest
              {view.questions.length === 1 ? 'ão' : 'ões'} ·{' '}
              {formatPoints(view.totalPoints)} ponto
              {view.totalPoints === 1 ? '' : 's'} · nota de 0 a 10
            </p>
          </div>
        </header>

        {renderStatusBanner()}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="space-y-4">
          {view.questions.map((question) => (
            <Card key={question.id} className="border-none shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Questão {question.order} ·{' '}
                    {question.type === 'OBJETIVA' ? 'Objetiva' : 'Dissertativa'}{' '}
                    · {formatPoints(question.points)} pt
                    {question.points === 1 ? '' : 's'}
                  </span>
                  {!isTaking && question.answer ? (
                    question.answer.earnedPoints !== null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                        {formatPoints(question.answer.earnedPoints)} /{' '}
                        {formatPoints(question.points)} pts
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Aguardando correção
                      </span>
                    )
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed text-foreground">
                  {question.statement}
                </p>

                {question.type === 'OBJETIVA' ? (
                  isTaking ? (
                    <ul className="space-y-2">
                      {question.options.map((option) => {
                        const checked =
                          drafts[question.id]?.selectedOptionId === option.id;
                        return (
                          <li key={option.id}>
                            <label
                              className={cn(
                                'flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition',
                                checked
                                  ? 'border-primary/60 bg-primary/10 text-foreground'
                                  : 'border-border bg-background/40 hover:bg-secondary/50',
                              )}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                className="h-4 w-4 accent-[hsl(262,80%,50%)]"
                                checked={checked}
                                onChange={() =>
                                  setDraft(question.id, {
                                    selectedOptionId: option.id,
                                  })
                                }
                                disabled={submitting}
                              />
                              <span>{option.text}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <ul className="space-y-2">
                      {question.options.map((option) =>
                        renderResultOption(question, option),
                      )}
                    </ul>
                  )
                ) : isTaking ? (
                  <Textarea
                    rows={5}
                    placeholder="Escreva sua resposta..."
                    value={drafts[question.id]?.text ?? ''}
                    onChange={(event) =>
                      setDraft(question.id, { text: event.target.value })
                    }
                    disabled={submitting}
                  />
                ) : (
                  <div className="rounded-md border border-border bg-background/60 p-3 text-sm text-foreground">
                    {question.answer?.text || 'Sem resposta.'}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {isTaking ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Você tem uma única tentativa. Revise as respostas antes de enviar.
            </p>
            <Button
              className="gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'Enviar avaliação'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => router.push(`/courses/${courseId}`)}
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para o curso
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
