'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Lock,
  MoreVertical,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { apiRequest, ApiError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type QuestionType = 'OBJETIVA' | 'DISSERTATIVA';

type QuestionOption = {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

type Question = {
  id: string;
  assessmentId: string;
  type: QuestionType;
  statement: string;
  points: number;
  order: number;
  options: QuestionOption[];
};

type Assessment = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
  submissionCount: number;
  pendingCount: number;
};

type AssessmentsResponse = {
  assessmentsEnabled: boolean;
  requireAverageForCertificate: boolean;
  minAverage: number;
  assessments: Assessment[];
};

type OptionDraft = {
  text: string;
  isCorrect: boolean;
};

type AssessmentDialogState = {
  mode: 'create' | 'edit';
  assessmentId: string | null;
  title: string;
  description: string;
  order: string;
};

type QuestionDialogState = {
  mode: 'create' | 'edit';
  assessmentId: string;
  questionId: string | null;
  type: QuestionType;
  statement: string;
  points: string;
  order: string;
  options: OptionDraft[];
};

type AssessmentFieldErrors = {
  title?: string;
  order?: string;
};

type QuestionFieldErrors = {
  statement?: string;
  points?: string;
  order?: string;
  options?: (string | undefined)[];
  correct?: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

const emptyOptions = (): OptionDraft[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
];

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function CourseAssessmentsTab({ courseId }: { courseId: string }) {
  const router = useRouter();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Configuração do curso.
  const [assessmentsEnabled, setAssessmentsEnabled] = useState(false);
  const [requireAverage, setRequireAverage] = useState(false);
  const [minAverage, setMinAverage] = useState('7');
  const [minAverageError, setMinAverageError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Diálogo de avaliação (criar/editar).
  const [assessmentDialog, setAssessmentDialog] =
    useState<AssessmentDialogState | null>(null);
  const [assessmentErrors, setAssessmentErrors] =
    useState<AssessmentFieldErrors>({});
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Diálogo de questão (criar/editar).
  const [questionDialog, setQuestionDialog] =
    useState<QuestionDialogState | null>(null);
  const [questionErrors, setQuestionErrors] = useState<QuestionFieldErrors>({});
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Confirmações de exclusão.
  const [deleteAssessment, setDeleteAssessment] = useState<Assessment | null>(
    null,
  );
  const [deleteQuestion, setDeleteQuestion] = useState<{
    assessmentId: string;
    question: Question;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cards de questões expandidos (múltiplos podem ficar abertos).
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>(
    {},
  );

  const requireToken = useCallback(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return null;
    }
    return token;
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    let active = true;
    setLoading(true);
    apiRequest<AssessmentsResponse>(`/courses/${courseId}/assessments`, {
      token,
    })
      .then((response) => {
        if (!active) {
          return;
        }
        setAssessmentsEnabled(response.assessmentsEnabled);
        setRequireAverage(response.requireAverageForCertificate);
        setMinAverage(String(response.minAverage));
        setAssessments(response.assessments);
        setLoadError('');
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setLoadError(getErrorMessage(err, 'Erro ao carregar avaliações.'));
        // Apenas 401 invalida a sessão; um 403 não desloga o usuário.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [courseId, router]);

  const sortedAssessments = useMemo(
    () => [...assessments].sort((a, b) => a.order - b.order),
    [assessments],
  );

  const nextAssessmentOrder = useMemo(
    () =>
      assessments.reduce((acc, item) => Math.max(acc, item.order), 0) + 1,
    [assessments],
  );

  // ----------------------------------------------------------- configuração

  const handleSaveConfig = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    const parsed = Number.parseFloat(minAverage.replace(',', '.'));
    if (requireAverage && (!Number.isFinite(parsed) || parsed < 0 || parsed > 10)) {
      setMinAverageError('Informe uma média entre 0 e 10.');
      return;
    }
    setMinAverageError('');

    const normalizedAverage =
      Number.isFinite(parsed) && parsed >= 0 && parsed <= 10
        ? Math.round(parsed * 10) / 10
        : 7;

    setSavingConfig(true);
    try {
      const updated = await apiRequest<{
        assessmentsEnabled: boolean;
        requireAverageForCertificate: boolean;
        minAverage: number;
      }>(`/courses/${courseId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          assessmentsEnabled,
          requireAverageForCertificate: requireAverage,
          minAverage: normalizedAverage,
        }),
      });
      setAssessmentsEnabled(updated.assessmentsEnabled);
      setRequireAverage(updated.requireAverageForCertificate);
      setMinAverage(String(updated.minAverage));
      toast.success('Configuração salva com sucesso.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar a configuração.'));
    } finally {
      setSavingConfig(false);
    }
  };

  // -------------------------------------------------------- avaliação CRUD

  const openCreateAssessment = () => {
    setAssessmentErrors({});
    setAssessmentDialog({
      mode: 'create',
      assessmentId: null,
      title: '',
      description: '',
      order: String(nextAssessmentOrder),
    });
  };

  const openEditAssessment = (assessment: Assessment) => {
    setAssessmentErrors({});
    setAssessmentDialog({
      mode: 'edit',
      assessmentId: assessment.id,
      title: assessment.title,
      description: assessment.description ?? '',
      order: String(assessment.order),
    });
  };

  const handleSubmitAssessment = async () => {
    if (!assessmentDialog) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }

    const errors: AssessmentFieldErrors = {};
    const title = assessmentDialog.title.trim();
    if (!title) {
      errors.title = 'Informe o título da avaliação.';
    }
    const order = Number(assessmentDialog.order);
    if (!Number.isInteger(order) || order < 1) {
      errors.order = 'Informe uma ordem válida (número inteiro a partir de 1).';
    }
    if (Object.keys(errors).length > 0) {
      setAssessmentErrors(errors);
      return;
    }
    setAssessmentErrors({});

    const description = assessmentDialog.description.trim();
    setSavingAssessment(true);
    try {
      if (assessmentDialog.mode === 'create') {
        const created = await apiRequest<Assessment>('/assessments', {
          method: 'POST',
          token,
          body: JSON.stringify({
            courseId,
            title,
            description: description || undefined,
            order,
          }),
        });
        setAssessments((prev) => [
          ...prev,
          {
            ...created,
            questions: created.questions ?? [],
            submissionCount: created.submissionCount ?? 0,
            pendingCount: created.pendingCount ?? 0,
          },
        ]);
        toast.success('Avaliação criada com sucesso.');
      } else if (assessmentDialog.assessmentId) {
        const id = assessmentDialog.assessmentId;
        const updated = await apiRequest<Assessment>(`/assessments/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            title,
            description: description || null,
            order,
          }),
        });
        setAssessments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  title: updated.title,
                  description: updated.description,
                  order: updated.order,
                }
              : item,
          ),
        );
        toast.success('Avaliação atualizada com sucesso.');
      }
      setAssessmentDialog(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar a avaliação.'));
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!deleteAssessment) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }
    const id = deleteAssessment.id;

    setDeleting(true);
    try {
      await apiRequest(`/assessments/${id}`, { method: 'DELETE', token });
      setAssessments((prev) => prev.filter((item) => item.id !== id));
      setOpenQuestions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Avaliação excluída com sucesso.');
      setDeleteAssessment(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao excluir a avaliação.'));
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------- questão CRUD

  const openCreateQuestion = (assessment: Assessment) => {
    const maxOrder = assessment.questions.reduce(
      (acc, item) => Math.max(acc, item.order),
      0,
    );
    setQuestionErrors({});
    setQuestionDialog({
      mode: 'create',
      assessmentId: assessment.id,
      questionId: null,
      type: 'OBJETIVA',
      statement: '',
      points: '1',
      order: String(maxOrder + 1),
      options: emptyOptions(),
    });
  };

  const openEditQuestion = (assessmentId: string, question: Question) => {
    const options =
      question.type === 'OBJETIVA'
        ? [...question.options]
            .sort((a, b) => a.order - b.order)
            .map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect }))
        : emptyOptions();
    setQuestionErrors({});
    setQuestionDialog({
      mode: 'edit',
      assessmentId,
      questionId: question.id,
      type: question.type,
      statement: question.statement,
      points: String(question.points),
      order: String(question.order),
      options: options.length >= 2 ? options : emptyOptions(),
    });
  };

  const patchQuestionDialog = (patch: Partial<QuestionDialogState>) => {
    setQuestionDialog((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const addOption = () => {
    setQuestionDialog((prev) => {
      if (!prev || prev.options.length >= 10) {
        return prev;
      }
      return {
        ...prev,
        options: [...prev.options, { text: '', isCorrect: false }],
      };
    });
  };

  const removeOption = (index: number) => {
    setQuestionDialog((prev) => {
      if (!prev || prev.options.length <= 2) {
        return prev;
      }
      const next = prev.options.filter((_, i) => i !== index);
      if (!next.some((opt) => opt.isCorrect)) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return { ...prev, options: next };
    });
  };

  const setOptionText = (index: number, text: string) => {
    setQuestionDialog((prev) =>
      prev
        ? {
            ...prev,
            options: prev.options.map((opt, i) =>
              i === index ? { ...opt, text } : opt,
            ),
          }
        : prev,
    );
  };

  const setCorrectOption = (index: number) => {
    setQuestionDialog((prev) =>
      prev
        ? {
            ...prev,
            options: prev.options.map((opt, i) => ({
              ...opt,
              isCorrect: i === index,
            })),
          }
        : prev,
    );
  };

  const handleSubmitQuestion = async () => {
    if (!questionDialog) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }

    const errors: QuestionFieldErrors = {};
    const statement = questionDialog.statement.trim();
    if (!statement) {
      errors.statement = 'Informe o enunciado da questão.';
    }
    const points = Number.parseFloat(questionDialog.points.replace(',', '.'));
    if (!Number.isFinite(points) || points <= 0) {
      errors.points = 'Informe uma pontuação maior que zero.';
    }
    const order = Number(questionDialog.order);
    if (!Number.isInteger(order) || order < 1) {
      errors.order = 'Informe uma ordem válida.';
    }

    let optionsPayload: OptionDraft[] | undefined;
    if (questionDialog.type === 'OBJETIVA') {
      const optionErrors = questionDialog.options.map((opt) =>
        opt.text.trim() ? undefined : 'Informe o texto da alternativa.',
      );
      if (optionErrors.some((message) => message)) {
        errors.options = optionErrors;
      }
      if (!questionDialog.options.some((opt) => opt.isCorrect)) {
        errors.correct = 'Marque uma alternativa como correta.';
      }
      optionsPayload = questionDialog.options.map((opt) => ({
        text: opt.text.trim(),
        isCorrect: opt.isCorrect,
      }));
    }

    if (
      errors.statement ||
      errors.points ||
      errors.order ||
      errors.correct ||
      (errors.options && errors.options.some((message) => message))
    ) {
      setQuestionErrors(errors);
      return;
    }
    setQuestionErrors({});

    const roundedPoints = Math.round(points * 100) / 100;
    const { assessmentId, questionId, mode, type } = questionDialog;

    setSavingQuestion(true);
    try {
      if (mode === 'edit' && questionId) {
        const body: {
          statement: string;
          points: number;
          order: number;
          options?: OptionDraft[];
        } = { statement, points: roundedPoints, order };
        if (type === 'OBJETIVA' && optionsPayload) {
          body.options = optionsPayload;
        }
        const updated = await apiRequest<Question>(`/questions/${questionId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(body),
        });
        setAssessments((prev) =>
          prev.map((item) =>
            item.id === assessmentId
              ? {
                  ...item,
                  questions: item.questions.map((q) =>
                    q.id === questionId ? updated : q,
                  ),
                }
              : item,
          ),
        );
        toast.success('Questão atualizada com sucesso.');
      } else {
        const body: {
          type: QuestionType;
          statement: string;
          points: number;
          order: number;
          options?: OptionDraft[];
        } = { type, statement, points: roundedPoints, order };
        if (type === 'OBJETIVA' && optionsPayload) {
          body.options = optionsPayload;
        }
        const created = await apiRequest<Question>(
          `/assessments/${assessmentId}/questions`,
          { method: 'POST', token, body: JSON.stringify(body) },
        );
        setAssessments((prev) =>
          prev.map((item) =>
            item.id === assessmentId
              ? { ...item, questions: [...item.questions, created] }
              : item,
          ),
        );
        setOpenQuestions((prev) => ({ ...prev, [assessmentId]: true }));
        toast.success('Questão criada com sucesso.');
      }
      setQuestionDialog(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar a questão.'));
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestion) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }
    const { assessmentId, question } = deleteQuestion;

    setDeleting(true);
    try {
      await apiRequest(`/questions/${question.id}`, {
        method: 'DELETE',
        token,
      });
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === assessmentId
            ? {
                ...item,
                questions: item.questions.filter((q) => q.id !== question.id),
              }
            : item,
        ),
      );
      toast.success('Questão excluída com sucesso.');
      setDeleteQuestion(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao excluir a questão.'));
    } finally {
      setDeleting(false);
    }
  };

  const toggleQuestions = (id: string) => {
    setOpenQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ------------------------------------------------------------- rendering

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Não foi possível carregar as avaliações
          </CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        {/* ----------------------------------------------- configuração */}
        <Card className="relative overflow-hidden border-none shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Configuração
            </CardTitle>
            <CardDescription>
              Defina como as avaliações afetam o curso e a emissão do
              certificado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="space-y-1">
                <Label htmlFor="assessments-enabled" className="text-sm font-medium">
                  Avaliações habilitadas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, os alunos podem realizar as avaliações deste
                  curso.
                </p>
              </div>
              <Switch
                id="assessments-enabled"
                checked={assessmentsEnabled}
                onCheckedChange={(checked) => {
                  setAssessmentsEnabled(checked);
                  if (!checked) {
                    setRequireAverage(false);
                  }
                }}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="space-y-1">
                <Label htmlFor="require-average" className="text-sm font-medium">
                  Exigir média para certificado
                </Label>
                <p className="text-xs text-muted-foreground">
                  O certificado só é emitido quando a média das avaliações
                  atinge a nota mínima.
                </p>
              </div>
              <Switch
                id="require-average"
                checked={requireAverage}
                disabled={!assessmentsEnabled}
                onCheckedChange={setRequireAverage}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-average" className="text-sm font-medium">
                Média mínima (0 a 10)
              </Label>
              <Input
                id="min-average"
                className="max-w-[160px]"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 7,0"
                value={minAverage}
                disabled={!assessmentsEnabled || !requireAverage}
                onChange={(event) => {
                  setMinAverage(event.target.value);
                  setMinAverageError('');
                }}
              />
              {minAverageError ? (
                <p className="text-xs text-destructive">{minAverageError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nota mínima exigida na média das avaliações corrigidas.
                </p>
              )}
            </div>

            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? 'Salvando...' : 'Salvar configuração'}
            </Button>
          </CardContent>
        </Card>

        {/* ------------------------------------------------ cabeçalho lista */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="text-xl font-semibold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Avaliações do curso
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie avaliações, monte as questões e acompanhe as correções.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateAssessment}>
            <Plus className="h-4 w-4" /> Nova avaliação
          </Button>
        </div>

        <Separator />

        {/* --------------------------------------------------- estado vazio */}
        {sortedAssessments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-7 w-7" />
              </span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {assessmentsEnabled
                    ? 'Nenhuma avaliação cadastrada'
                    : 'As avaliações estão desabilitadas'}
                </p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {assessmentsEnabled
                    ? 'Crie a primeira avaliação deste curso para começar a montar as questões.'
                    : 'Ative o interruptor "Avaliações habilitadas" na configuração acima para liberar as avaliações aos alunos.'}
                </p>
              </div>
              {assessmentsEnabled ? (
                <Button className="gap-2" onClick={openCreateAssessment}>
                  <Plus className="h-4 w-4" /> Criar primeira avaliação
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedAssessments.map((assessment, index) => {
              const locked = assessment.submissionCount > 0;
              const isOpen = Boolean(openQuestions[assessment.id]);
              const sortedQuestions = [...assessment.questions].sort(
                (a, b) => a.order - b.order,
              );
              // Arredonda a soma de Floats (0.1 + 0.2 → 0.30000000000000004).
              const totalPoints = Number(
                assessment.questions
                  .reduce((acc, q) => acc + q.points, 0)
                  .toFixed(2),
              );
              return (
                <motion.div
                  key={assessment.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                >
                  <Card className="relative overflow-hidden border-none shadow-md transition-shadow hover:shadow-lg">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
                    <CardContent className="space-y-4 p-5">
                      {/* cabeçalho da avaliação */}
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Avaliação {assessment.order}
                          </span>
                          <h3 className="text-base font-semibold text-foreground">
                            {assessment.title}
                          </h3>
                          {assessment.description ? (
                            <p className="text-sm text-muted-foreground">
                              {assessment.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="secondary">
                              {assessment.questions.length}{' '}
                              {assessment.questions.length === 1
                                ? 'questão'
                                : 'questões'}
                            </Badge>
                            {totalPoints > 0 ? (
                              <Badge variant="secondary">
                                {totalPoints}{' '}
                                {totalPoints === 1 ? 'ponto' : 'pontos'}
                              </Badge>
                            ) : null}
                            <Badge variant="secondary">
                              {assessment.submissionCount}{' '}
                              {assessment.submissionCount === 1
                                ? 'envio'
                                : 'envios'}
                            </Badge>
                            {assessment.pendingCount > 0 ? (
                              <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
                                {assessment.pendingCount} aguardando correção
                              </Badge>
                            ) : null}
                            {locked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="gap-1 border-amber-300 text-amber-700"
                                  >
                                    <Lock className="h-3 w-3" /> Travada
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Questões não podem ser alteradas enquanto
                                  houver envios. Libere as tentativas na tela de
                                  correções.
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>

                        {/* ações da avaliação */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              router.push(
                                `/teacher/assessments/${assessment.id}/submissions`,
                              )
                            }
                          >
                            <ClipboardCheck className="h-4 w-4" /> Correções
                            {assessment.pendingCount > 0 ? (
                              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                                {assessment.pendingCount}
                              </span>
                            ) : null}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Mais ações da avaliação"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => openEditAssessment(assessment)}
                              >
                                <PencilLine className="h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() =>
                                  setDeleteAssessment(assessment)
                                }
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <Separator />

                      {/* toggle de questões */}
                      <button
                        type="button"
                        onClick={() => toggleQuestions(assessment.id)}
                        className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        Questões ({assessment.questions.length})
                      </button>

                      {isOpen ? (
                        <div className="space-y-3">
                          {sortedQuestions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                              Nenhuma questão cadastrada nesta avaliação.
                            </div>
                          ) : (
                            sortedQuestions.map((question) => (
                              <div
                                key={question.id}
                                className="space-y-2 rounded-xl border border-border bg-background/40 p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Questão {question.order} •{' '}
                                        {question.points}{' '}
                                        {question.points === 1
                                          ? 'pt'
                                          : 'pts'}
                                      </span>
                                      <Badge
                                        variant={
                                          question.type === 'OBJETIVA'
                                            ? 'secondary'
                                            : 'outline'
                                        }
                                      >
                                        {question.type === 'OBJETIVA'
                                          ? 'Objetiva'
                                          : 'Dissertativa'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-foreground">
                                      {question.statement}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <QuestionActionButton
                                      locked={locked}
                                      label="Editar questão"
                                      onClick={() =>
                                        openEditQuestion(
                                          assessment.id,
                                          question,
                                        )
                                      }
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </QuestionActionButton>
                                    <QuestionActionButton
                                      locked={locked}
                                      destructive
                                      label="Excluir questão"
                                      onClick={() =>
                                        setDeleteQuestion({
                                          assessmentId: assessment.id,
                                          question,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </QuestionActionButton>
                                  </div>
                                </div>

                                {question.type === 'OBJETIVA' ? (
                                  <ul className="space-y-1.5 pt-1">
                                    {[...question.options]
                                      .sort((a, b) => a.order - b.order)
                                      .map((option) => (
                                        <li
                                          key={option.id}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          {option.isCorrect ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                                          ) : (
                                            <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                                          )}
                                          <span
                                            className={
                                              option.isCorrect
                                                ? 'font-medium text-foreground'
                                                : 'text-muted-foreground'
                                            }
                                          >
                                            {option.text}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                ) : null}
                              </div>
                            ))
                          )}

                          <div>
                            {locked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-2"
                                      disabled
                                    >
                                      <Plus className="h-4 w-4" /> Nova questão
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Questões não podem ser alteradas enquanto
                                  houver envios. Libere as tentativas na tela de
                                  correções.
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => openCreateQuestion(assessment)}
                              >
                                <Plus className="h-4 w-4" /> Nova questão
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------- diálogo criar/editar avaliação */}
      <Dialog
        open={Boolean(assessmentDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setAssessmentDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assessmentDialog?.mode === 'edit'
                ? 'Editar avaliação'
                : 'Nova avaliação'}
            </DialogTitle>
            <DialogDescription>
              Informe o título, uma descrição opcional e a ordem de exibição.
            </DialogDescription>
          </DialogHeader>
          {assessmentDialog ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assessment-title">Título</Label>
                <Input
                  id="assessment-title"
                  placeholder="Ex.: Avaliação final"
                  value={assessmentDialog.title}
                  onChange={(event) =>
                    setAssessmentDialog((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev,
                    )
                  }
                />
                {assessmentErrors.title ? (
                  <p className="text-xs text-destructive">
                    {assessmentErrors.title}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-description">Descrição</Label>
                <Textarea
                  id="assessment-description"
                  placeholder="Descrição opcional da avaliação..."
                  value={assessmentDialog.description}
                  onChange={(event) =>
                    setAssessmentDialog((prev) =>
                      prev
                        ? { ...prev, description: event.target.value }
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-order">Ordem</Label>
                <Input
                  id="assessment-order"
                  type="number"
                  min={1}
                  className="max-w-[140px]"
                  value={assessmentDialog.order}
                  onChange={(event) =>
                    setAssessmentDialog((prev) =>
                      prev ? { ...prev, order: event.target.value } : prev,
                    )
                  }
                />
                {assessmentErrors.order ? (
                  <p className="text-xs text-destructive">
                    {assessmentErrors.order}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssessmentDialog(null)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitAssessment} disabled={savingAssessment}>
              {savingAssessment ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------ diálogo criar/editar questão */}
      <Dialog
        open={Boolean(questionDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setQuestionDialog(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {questionDialog?.mode === 'edit'
                ? 'Editar questão'
                : 'Nova questão'}
            </DialogTitle>
            <DialogDescription>
              Defina o tipo, a pontuação e o enunciado. Questões objetivas
              precisam de uma alternativa correta.
            </DialogDescription>
          </DialogHeader>
          {questionDialog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px_120px]">
                <div className="space-y-2">
                  <Label htmlFor="question-type">Tipo</Label>
                  <Select
                    value={questionDialog.type}
                    disabled={questionDialog.mode === 'edit'}
                    onValueChange={(value) =>
                      patchQuestionDialog({
                        type: value as QuestionType,
                        options:
                          value === 'OBJETIVA'
                            ? questionDialog.options.length >= 2
                              ? questionDialog.options
                              : emptyOptions()
                            : questionDialog.options,
                      })
                    }
                  >
                    <SelectTrigger id="question-type">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OBJETIVA">Objetiva</SelectItem>
                      <SelectItem value="DISSERTATIVA">Dissertativa</SelectItem>
                    </SelectContent>
                  </Select>
                  {questionDialog.mode === 'edit' ? (
                    <p className="text-xs text-muted-foreground">
                      O tipo não pode ser alterado após a criação.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-points">Pontos</Label>
                  <Input
                    id="question-points"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 2,5"
                    value={questionDialog.points}
                    onChange={(event) =>
                      patchQuestionDialog({ points: event.target.value })
                    }
                  />
                  {questionErrors.points ? (
                    <p className="text-xs text-destructive">
                      {questionErrors.points}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-order">Ordem</Label>
                  <Input
                    id="question-order"
                    type="number"
                    min={1}
                    value={questionDialog.order}
                    onChange={(event) =>
                      patchQuestionDialog({ order: event.target.value })
                    }
                  />
                  {questionErrors.order ? (
                    <p className="text-xs text-destructive">
                      {questionErrors.order}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-statement">Enunciado</Label>
                <Textarea
                  id="question-statement"
                  placeholder="Descreva a questão..."
                  value={questionDialog.statement}
                  onChange={(event) =>
                    patchQuestionDialog({ statement: event.target.value })
                  }
                />
                {questionErrors.statement ? (
                  <p className="text-xs text-destructive">
                    {questionErrors.statement}
                  </p>
                ) : null}
              </div>

              {questionDialog.type === 'OBJETIVA' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Alternativas</Label>
                    <span className="text-xs text-muted-foreground">
                      Marque a alternativa correta
                    </span>
                  </div>
                  {questionErrors.correct ? (
                    <p className="text-xs text-destructive">
                      {questionErrors.correct}
                    </p>
                  ) : null}
                  <RadioGroup
                    value={String(
                      questionDialog.options.findIndex((opt) => opt.isCorrect),
                    )}
                    onValueChange={(value) => setCorrectOption(Number(value))}
                    className="gap-3"
                  >
                    {questionDialog.options.map((option, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={String(index)}
                            id={`option-correct-${index}`}
                            aria-label={`Marcar alternativa ${index + 1} como correta`}
                          />
                          <Input
                            className="flex-1"
                            placeholder={`Alternativa ${index + 1}`}
                            value={option.text}
                            onChange={(event) =>
                              setOptionText(index, event.target.value)
                            }
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeOption(index)}
                            disabled={questionDialog.options.length <= 2}
                            aria-label={`Remover alternativa ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {questionErrors.options?.[index] ? (
                          <p className="pl-7 text-xs text-destructive">
                            {questionErrors.options[index]}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </RadioGroup>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={addOption}
                    disabled={questionDialog.options.length >= 10}
                  >
                    <Plus className="h-4 w-4" /> Adicionar alternativa
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitQuestion} disabled={savingQuestion}>
              {savingQuestion ? 'Salvando...' : 'Salvar questão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------- confirmação excluir avaliação */}
      <AlertDialog
        open={Boolean(deleteAssessment)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAssessment(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir &ldquo;{deleteAssessment?.title}&rdquo; também remove as
              questões, os envios e as notas dos alunos. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAssessment();
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------- confirmação excluir questão */}
      <AlertDialog
        open={Boolean(deleteQuestion)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteQuestion(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão?</AlertDialogTitle>
            <AlertDialogDescription>
              A questão {deleteQuestion?.question.order} será removida
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteQuestion();
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function QuestionActionButton({
  locked,
  destructive,
  label,
  onClick,
  children,
}: {
  locked: boolean;
  destructive?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const button = (
    <Button
      size="icon"
      variant="ghost"
      className={destructive ? 'text-destructive hover:text-destructive' : ''}
      onClick={onClick}
      disabled={locked}
      aria-label={label}
    >
      {children}
    </Button>
  );

  if (!locked) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Questões não podem ser alteradas enquanto houver envios. Libere as
        tentativas na tela de correções.
      </TooltipContent>
    </Tooltip>
  );
}
