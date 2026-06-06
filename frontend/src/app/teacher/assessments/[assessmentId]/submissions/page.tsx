'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  Inbox,
  MoreVertical,
  RotateCcw,
  Save,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest, ApiError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

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
  assessment: {
    id: string;
    title: string;
    courseId: string;
    course: { title: string };
  };
  answers: SubmissionAnswer[];
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

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

function parseScore(raw: string): number {
  return Number.parseFloat((raw ?? '').replace(',', '.'));
}

function isScoreValid(raw: string, max: number): boolean {
  const parsed = parseScore(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max;
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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<SubmissionRow | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Pontuação editável por resposta (campo controlado).
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  // Quais respostas objetivas tiveram o ajuste manual revelado.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Marca campos que falharam na validação para destacá-los inline.
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const loadSubmissions = useCallback(
    async (token: string) => {
      const data = await apiRequest<SubmissionRow[]>(
        `/assessments/${assessmentId}/submissions`,
        { token },
      );
      setSubmissions(data);
    },
    [assessmentId],
  );

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
        setError(err instanceof Error ? err.message : 'Erro ao carregar envios.');
        // Apenas 401 invalida a sessão; um 403 não deve deslogar o usuário.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [assessmentId, router, loadSubmissions]);

  const sortedSubmissions = useMemo(
    () =>
      [...submissions].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      ),
    [submissions],
  );

  const stats = useMemo(() => {
    const total = submissions.length;
    const corrected = submissions.filter(
      (item) => item.status === 'CORRIGIDA',
    ).length;
    const pending = total - corrected;
    const graded = submissions
      .map((item) => item.grade)
      .filter((grade): grade is number => grade != null);
    const average =
      graded.length > 0
        ? graded.reduce((acc, grade) => acc + grade, 0) / graded.length
        : null;
    return { total, corrected, pending, average };
  }, [submissions]);

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

  const openDetail = async (submissionId: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setSheetOpen(true);
    setDetail(null);
    setLoadingDetail(true);
    setOverrides({});
    setInvalid({});

    try {
      const data = await apiRequest<SubmissionDetail>(
        `/submissions/${submissionId}`,
        { token },
      );
      setDetail(data);
      setScoreInputs(buildScoreInputs(data));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar envio.';
      toast.error(message);
      setSheetOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleScoreChange = (answerId: string, value: string, max: number) => {
    setScoreInputs((prev) => ({ ...prev, [answerId]: value }));
    // Limpa o destaque de erro assim que o campo volta a ser válido.
    setInvalid((prev) => {
      if (!prev[answerId]) {
        return prev;
      }
      if (isScoreValid(value, max)) {
        const next = { ...prev };
        delete next[answerId];
        return next;
      }
      return prev;
    });
  };

  const toggleOverride = (answerId: string) => {
    setOverrides((prev) => ({ ...prev, [answerId]: !prev[answerId] }));
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

    const nextInvalid: Record<string, boolean> = {};
    const payload: { answerId: string; earnedPoints: number }[] = [];
    for (const answer of detail.answers) {
      const raw = scoreInputs[answer.id] ?? '';
      if (!isScoreValid(raw, answer.question.points)) {
        nextInvalid[answer.id] = true;
        continue;
      }
      payload.push({
        answerId: answer.id,
        earnedPoints: Math.round(parseScore(raw) * 100) / 100,
      });
    }

    if (Object.keys(nextInvalid).length > 0) {
      setInvalid(nextInvalid);
      toast.error('Revise os campos destacados antes de salvar.');
      return;
    }

    setInvalid({});
    setSavingGrade(true);

    try {
      const updated = await apiRequest<SubmissionDetail>(
        `/submissions/${detail.id}/grade`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ answers: payload }),
        },
      );
      setSubmissions((prev) =>
        prev.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                status: updated.status,
                grade: updated.grade,
                gradedAt: updated.gradedAt,
                pendingAnswers: updated.answers.filter(
                  (item) => item.earnedPoints == null,
                ).length,
              }
            : row,
        ),
      );
      if (updated.status === 'CORRIGIDA') {
        toast.success(
          `Correção salva. Nota final: ${formatGrade(updated.grade)}.`,
        );
      } else {
        toast.success('Correção salva. Ainda há respostas a corrigir.');
      }
      setSheetOpen(false);
      setDetail(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar correção.';
      toast.error(message);
    } finally {
      setSavingGrade(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseTarget) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setReleasing(true);

    try {
      await apiRequest<{ released: true }>(
        `/submissions/${releaseTarget.id}`,
        {
          method: 'DELETE',
          token,
        },
      );
      if (detail?.id === releaseTarget.id) {
        setSheetOpen(false);
        setDetail(null);
      }
      await loadSubmissions(token);
      toast.success('Nova tentativa liberada para o aluno.');
      setReleaseTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao liberar tentativa.';
      toast.error(message);
    } finally {
      setReleasing(false);
    }
  };

  const statChips = [
    {
      label: 'Total de envios',
      value: String(stats.total),
      icon: ClipboardList,
      tone: 'primary' as const,
    },
    {
      label: 'Corrigidas',
      value: String(stats.corrected),
      icon: CheckCircle2,
      tone: 'accent' as const,
    },
    {
      label: 'Aguardando correção',
      value: String(stats.pending),
      icon: Clock,
      tone: 'primary' as const,
    },
    {
      label: 'Média da turma',
      value: formatGrade(stats.average),
      icon: TrendingUp,
      tone: 'accent' as const,
    },
  ];

  const courseHref = assessment
    ? `/teacher/courses/${assessment.course.id}?tab=avaliacoes`
    : '/teacher/dashboard';

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/teacher/dashboard">Painel</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {assessment ? (
                  <BreadcrumbLink asChild>
                    <Link href={courseHref}>{assessment.course.title}</Link>
                  </BreadcrumbLink>
                ) : (
                  <Skeleton className="h-3 w-24" />
                )}
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Correções</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
            >
              {assessment?.title ?? 'Avaliação'}
            </motion.h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Corrija os envios dos alunos e libere novas tentativas quando
              necessário.
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statChips.map((chip, i) => (
              <motion.div
                key={chip.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        chip.tone === 'primary'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-accent/15 text-accent'
                      }`}
                    >
                      <chip.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold text-foreground">
                        {chip.value}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {chip.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Card className="overflow-hidden border-none shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sortedSubmissions.length === 0 ? (
              <div className="p-6">
                <Card className="border-dashed bg-transparent shadow-none">
                  <CardContent className="space-y-3 p-10 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum envio recebido ainda.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="w-48 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubmissions.map((submission) => {
                    const pending = submission.status === 'PENDENTE';
                    return (
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
                          {pending ? (
                            <Badge variant="secondary">Aguardando correção</Badge>
                          ) : (
                            <Badge className="border-transparent bg-accent/15 text-accent hover:bg-accent/20">
                              Corrigida
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatGrade(submission.grade)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={pending ? 'default' : 'outline'}
                              onClick={() => openDetail(submission.id)}
                            >
                              {pending ? 'Corrigir' : 'Revisar'}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Mais ações"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setReleaseTarget(submission);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Liberar nova tentativa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setDetail(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          {loadingDetail || !detail ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Separator />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <SheetHeader className="border-b border-border p-6 text-left">
                <SheetTitle>{detail.user.name}</SheetTitle>
                <SheetDescription>{detail.user.email}</SheetDescription>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {detail.status === 'CORRIGIDA' ? (
                    <Badge className="border-transparent bg-accent/15 text-accent hover:bg-accent/20">
                      Corrigida
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Aguardando correção</Badge>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Nota atual: {formatGrade(detail.grade)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Enviado em {formatDateTime(detail.submittedAt)}
                  </span>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {detail.answers.map((answer, index) => {
                  const { question } = answer;
                  const correctOption = question.options.find(
                    (opt) => opt.isCorrect,
                  );
                  const isObjective = question.type === 'OBJETIVA';
                  const selectedCorrect = Boolean(
                    answer.selectedOption?.isCorrect,
                  );
                  const showOverride = overrides[answer.id] ?? false;
                  const fieldInvalid = invalid[answer.id] ?? false;

                  return (
                    <div key={answer.id} className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Questão {index + 1}
                          </span>
                          <Badge variant="outline">
                            {isObjective ? 'Objetiva' : 'Dissertativa'}
                          </Badge>
                          <Badge variant="secondary">
                            {question.points}{' '}
                            {question.points === 1 ? 'ponto' : 'pontos'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {question.statement}
                        </p>
                      </div>

                      {isObjective ? (
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                            <Sparkles className="h-3.5 w-3.5" />
                            Corrigida automaticamente
                          </div>

                          <div className="space-y-2">
                            <div
                              className={`rounded-lg border p-3 text-sm ${
                                answer.selectedOption
                                  ? selectedCorrect
                                    ? 'border-accent/40 bg-accent/10'
                                    : 'border-destructive/40 bg-destructive/10'
                                  : 'border-border bg-muted/40'
                              }`}
                            >
                              <p className="text-xs font-medium text-muted-foreground">
                                Resposta do aluno
                              </p>
                              <p className="mt-0.5 text-foreground">
                                {answer.selectedOption?.text ??
                                  'Nenhuma alternativa selecionada.'}
                              </p>
                            </div>

                            {!selectedCorrect ? (
                              <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Alternativa correta
                                </p>
                                <p className="mt-0.5 text-foreground">
                                  {correctOption?.text ?? '—'}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              Pontos atribuídos:{' '}
                              <span className="font-semibold text-foreground">
                                {scoreInputs[answer.id] ?? '0'} / {question.points}
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground"
                              onClick={() => toggleOverride(answer.id)}
                            >
                              {showOverride
                                ? 'Ocultar ajuste'
                                : 'Ajustar pontos manualmente'}
                            </Button>
                          </div>

                          {showOverride ? (
                            <div className="space-y-1.5">
                              <Label htmlFor={`score-${answer.id}`}>
                                Pontos (0 a {question.points})
                              </Label>
                              <Input
                                id={`score-${answer.id}`}
                                className={`h-10 max-w-[160px] ${
                                  fieldInvalid
                                    ? 'border-destructive focus-visible:ring-destructive'
                                    : ''
                                }`}
                                type="text"
                                inputMode="decimal"
                                value={scoreInputs[answer.id] ?? ''}
                                aria-invalid={fieldInvalid}
                                onChange={(event) =>
                                  handleScoreChange(
                                    answer.id,
                                    event.target.value,
                                    question.points,
                                  )
                                }
                              />
                              {fieldInvalid ? (
                                <p className="text-xs text-destructive">
                                  Informe um valor entre 0 e {question.points}.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                            <p className="text-xs font-medium text-muted-foreground">
                              Resposta do aluno
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                              {answer.text?.trim()
                                ? answer.text
                                : 'Sem resposta enviada.'}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor={`score-${answer.id}`}>
                              Pontos (0 a {question.points})
                            </Label>
                            <Input
                              id={`score-${answer.id}`}
                              className={`h-10 max-w-[160px] ${
                                fieldInvalid
                                  ? 'border-destructive focus-visible:ring-destructive'
                                  : ''
                              }`}
                              type="text"
                              inputMode="decimal"
                              placeholder={`0 a ${question.points}`}
                              value={scoreInputs[answer.id] ?? ''}
                              aria-invalid={fieldInvalid}
                              onChange={(event) =>
                                handleScoreChange(
                                  answer.id,
                                  event.target.value,
                                  question.points,
                                )
                              }
                            />
                            {fieldInvalid ? (
                              <p className="text-xs text-destructive">
                                Informe um valor entre 0 e {question.points}.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {index < detail.answers.length - 1 ? <Separator /> : null}
                    </div>
                  );
                })}
              </div>

              <SheetFooter className="border-t border-border p-6">
                <Button
                  className="w-full gap-2 sm:w-auto"
                  onClick={handleSaveGrade}
                  disabled={savingGrade}
                >
                  <Save className="h-4 w-4" />
                  {savingGrade ? 'Salvando...' : 'Salvar correção'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={releaseTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReleaseTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar nova tentativa?</AlertDialogTitle>
            <AlertDialogDescription>
              {releaseTarget ? (
                <>
                  O envio de{' '}
                  <span className="font-medium text-foreground">
                    {releaseTarget.user.name}
                  </span>{' '}
                  e a nota atribuída serão apagados permanentemente. O aluno
                  poderá refazer a avaliação. Esta ação não pode ser desfeita.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={releasing}
              onClick={(event) => {
                event.preventDefault();
                void handleRelease();
              }}
            >
              {releasing ? 'Liberando...' : 'Liberar tentativa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
