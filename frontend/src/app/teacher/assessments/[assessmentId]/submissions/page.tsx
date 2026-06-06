'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiRequest, ApiError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type User = {
  role: string;
};

type QuestionType = 'OBJETIVA' | 'DISSERTATIVA';

type SubmissionStatus = 'PENDENTE' | 'CORRIGIDA';

type AssessmentHeader = {
  id: string;
  title: string;
  description: string | null;
  course: { id: string; title: string };
  totalPoints: number;
};

type SubmissionRow = {
  id: string;
  status: SubmissionStatus;
  grade: number | null;
  submittedAt: string;
  gradedAt: string | null;
  user: { id: string; name: string; email: string };
  pendingAnswers: number;
};

type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

type SubmissionAnswer = {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  text: string | null;
  earnedPoints: number | null;
  question: {
    id: string;
    type: QuestionType;
    statement: string;
    points: number;
    order: number;
    options: AnswerOption[];
  };
  selectedOption: { id: string; text: string; isCorrect: boolean } | null;
};

type SubmissionDetail = {
  id: string;
  status: SubmissionStatus;
  grade: number | null;
  submittedAt: string;
  gradedAt: string | null;
  userId: string;
  assessmentId: string;
  user: { id: string; name: string; email: string };
  assessment: { id: string; title: string; courseId: string; course: { title: string } };
  answers: SubmissionAnswer[];
};

const pillBase =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatGrade(grade: number | null): string {
  return grade != null ? grade.toFixed(1).replace('.', ',') : '—';
}

export default function AssessmentSubmissionsPage() {
  const router = useRouter();
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = Array.isArray(params.assessmentId)
    ? params.assessmentId[0]
    : params.assessmentId;

  const [assessment, setAssessment] = useState<AssessmentHeader | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});

  const loadSubmissions = async (token: string) => {
    const data = await apiRequest<SubmissionRow[]>(
      `/assessments/${assessmentId}/submissions`,
      { token },
    );
    setSubmissions(data);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<User>('/users/me', { token }),
      apiRequest<AssessmentHeader>(`/assessments/${assessmentId}`, { token }),
      loadSubmissions(token),
    ])
      .then(([userResponse, assessmentResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setAssessment(assessmentResponse);
        setError('');
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar envios.',
        );
        // Apenas 401 invalida a sessão; um 403 não deve deslogar o usuário.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, router]);

  const sortedSubmissions = useMemo(
    () =>
      [...submissions].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      ),
    [submissions],
  );

  const openDetail = async (submissionId: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoadingDetail(true);
    setError('');

    try {
      const data = await apiRequest<SubmissionDetail>(
        `/submissions/${submissionId}`,
        { token },
      );
      setDetail(data);
      setScoreInputs(buildScoreInputs(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar envio.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const buildScoreInputs = (data: SubmissionDetail): Record<string, string> => {
    const next: Record<string, string> = {};
    for (const answer of data.answers) {
      if (answer.question.type === 'OBJETIVA') {
        next[answer.id] = String(answer.earnedPoints ?? 0);
      } else {
        next[answer.id] =
          answer.earnedPoints != null ? String(answer.earnedPoints) : '';
      }
    }
    return next;
  };

  const handleScoreChange = (answerId: string, value: string) => {
    setScoreInputs((prev) => ({ ...prev, [answerId]: value }));
  };

  const handleSaveGrade = async () => {
    if (!detail) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const payload: { answerId: string; earnedPoints: number }[] = [];
    for (const answer of detail.answers) {
      const raw = scoreInputs[answer.id];
      const parsed = Number.parseFloat((raw ?? '').replace(',', '.'));
      if (
        !Number.isFinite(parsed) ||
        parsed < 0 ||
        parsed > answer.question.points
      ) {
        setError(
          'Informe uma pontuacao valida para todas as respostas.',
        );
        return;
      }
      payload.push({
        answerId: answer.id,
        earnedPoints: Math.round(parsed * 100) / 100,
      });
    }

    setSavingGrade(true);
    setError('');

    try {
      const updated = await apiRequest<SubmissionDetail>(
        `/submissions/${detail.id}/grade`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ answers: payload }),
        },
      );
      setDetail(updated);
      setScoreInputs(buildScoreInputs(updated));
      setSubmissions((prev) =>
        prev.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                status: updated.status,
                grade: updated.grade,
                gradedAt: updated.gradedAt,
                pendingAnswers: updated.answers.filter(
                  (a) => a.earnedPoints == null,
                ).length,
              }
            : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar correcao.');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleRelease = async (submissionId: string) => {
    if (releasingId) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (
      !window.confirm(
        'Liberar uma nova tentativa apaga este envio e a nota. Continuar?',
      )
    ) {
      return;
    }

    setReleasingId(submissionId);
    setError('');

    try {
      await apiRequest<{ released: true }>(`/submissions/${submissionId}`, {
        method: 'DELETE',
        token,
      });
      if (detail?.id === submissionId) {
        setDetail(null);
        setScoreInputs({});
      }
      await loadSubmissions(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao liberar tentativa.');
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              assessment
                ? router.push(
                    `/teacher/courses/${assessment.course.id}/assessments`,
                  )
                : router.push('/teacher/courses/manage')
            }
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para avaliacoes
          </Button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {assessment?.title ?? 'Avaliacao'}
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Correcao de envios
              {assessment ? ` • ${assessment.course.title}` : ''}
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Envios dos alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : sortedSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum aluno enviou esta avaliacao ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="w-56"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {submission.user.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {submission.user.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(submission.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {submission.status === 'CORRIGIDA' ? (
                          <span
                            className={`${pillBase} bg-accent/15 text-accent`}
                          >
                            Corrigida
                          </span>
                        ) : (
                          <span
                            className={`${pillBase} bg-secondary text-muted-foreground`}
                          >
                            Aguardando correcao
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {formatGrade(submission.grade)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openDetail(submission.id)}
                            disabled={loadingDetail}
                          >
                            {submission.status === 'PENDENTE'
                              ? 'Corrigir'
                              : 'Revisar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={() => handleRelease(submission.id)}
                            disabled={releasingId !== null}
                          >
                            <RotateCcw className="h-4 w-4" /> Liberar refazer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {detail ? (
          <Card className="border-none shadow-md">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Correcao — {detail.user.name}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {detail.status === 'CORRIGIDA' ? (
                    <span className={`${pillBase} bg-accent/15 text-accent`}>
                      Corrigida
                    </span>
                  ) : (
                    <span
                      className={`${pillBase} bg-secondary text-muted-foreground`}
                    >
                      Aguardando correcao
                    </span>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    Nota: {formatGrade(detail.grade)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {detail.answers.map((answer) => {
                const correctOption = answer.question.options.find(
                  (opt) => opt.isCorrect,
                );
                const isCorrect = Boolean(answer.selectedOption?.isCorrect);
                return (
                  <div key={answer.id} className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Questao {answer.question.order} •{' '}
                        {answer.question.points} pt(s)
                      </span>
                      <p className="text-sm text-foreground">
                        {answer.question.statement}
                      </p>
                    </div>

                    {answer.question.type === 'OBJETIVA' ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            Resposta do aluno:
                          </span>
                          <span className="text-foreground">
                            {answer.selectedOption?.text ??
                              'Sem resposta selecionada'}
                          </span>
                          {answer.selectedOption ? (
                            isCorrect ? (
                              <span
                                className={`${pillBase} bg-accent/15 text-accent`}
                              >
                                Correta
                              </span>
                            ) : (
                              <span
                                className={`${pillBase} bg-destructive/10 text-destructive`}
                              >
                                Incorreta
                              </span>
                            )
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Alternativa correta:{' '}
                          <span className="text-foreground">
                            {correctOption?.text ?? '—'}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-background/60 p-3 text-sm">
                        {answer.text?.trim()
                          ? answer.text
                          : 'Sem resposta enviada.'}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Pontos</Label>
                      <Input
                        className="h-10 max-w-[160px]"
                        type="text"
                        inputMode="decimal"
                        value={scoreInputs[answer.id] ?? ''}
                        onChange={(event) =>
                          handleScoreChange(answer.id, event.target.value)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        0 a {answer.question.points} pontos
                      </p>
                    </div>

                    <Separator />
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="gap-2"
                  onClick={handleSaveGrade}
                  disabled={savingGrade}
                >
                  <Save className="h-4 w-4" /> Salvar correcao
                </Button>
                {detail.status === 'CORRIGIDA' && detail.grade != null ? (
                  <span className="text-sm font-medium text-accent">
                    Correcao salva. Nota final: {formatGrade(detail.grade)}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
