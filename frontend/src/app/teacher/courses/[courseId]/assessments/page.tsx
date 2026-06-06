'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardList,
  PencilLine,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, ApiError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  role: string;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  assessmentsEnabled: boolean;
  requireAverageForCertificate: boolean;
  minAverage: number;
};

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

type QuestionFormTarget = {
  assessmentId: string;
  questionId: string | null;
};

const pillBase =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';

export default function CourseAssessmentsPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuration card state.
  const [assessmentsEnabled, setAssessmentsEnabled] = useState(false);
  const [requireAverage, setRequireAverage] = useState(false);
  const [minAverage, setMinAverage] = useState('0');

  // New assessment form.
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOrder, setNewOrder] = useState(1);

  // Inline edit of an assessment.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrder, setEditOrder] = useState(1);

  // Collapsible questions area.
  const [openAssessmentId, setOpenAssessmentId] = useState<string | null>(null);

  // Question form state.
  const [questionFormFor, setQuestionFormFor] =
    useState<QuestionFormTarget | null>(null);
  const [qType, setQType] = useState<QuestionType>('OBJETIVA');
  const [qStatement, setQStatement] = useState('');
  const [qPoints, setQPoints] = useState('1');
  const [qOrder, setQOrder] = useState(1);
  const [qOptions, setQOptions] = useState<OptionDraft[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<User>('/users/me', { token }),
      apiRequest<Course>(`/courses/${courseId}`, { token }),
      apiRequest<AssessmentsResponse>(`/courses/${courseId}/assessments`, {
        token,
      }),
    ])
      .then(([userResponse, courseResponse, assessmentsResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setCourse(courseResponse);
        setAssessmentsEnabled(assessmentsResponse.assessmentsEnabled);
        setRequireAverage(assessmentsResponse.requireAverageForCertificate);
        setMinAverage(String(assessmentsResponse.minAverage));
        const list = assessmentsResponse.assessments;
        setAssessments(list);
        const maxOrder = list.reduce((acc, item) => Math.max(acc, item.order), 0);
        setNewOrder(maxOrder + 1);
        setError('');
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar avaliacoes.',
        );
        // Apenas 401 invalida a sessão; um 403 não deve deslogar o usuário.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [courseId, router]);

  const sortedAssessments = useMemo(
    () => [...assessments].sort((a, b) => a.order - b.order),
    [assessments],
  );

  const handleSaveConfig = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const parsed = Number.parseFloat(minAverage.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
      setError('Informe uma media minima entre 0 e 10.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await apiRequest<Course>(`/courses/${courseId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          assessmentsEnabled,
          requireAverageForCertificate: requireAverage,
          minAverage: Math.round(parsed * 10) / 10,
        }),
      });
      setCourse(updated);
      setAssessmentsEnabled(updated.assessmentsEnabled);
      setRequireAverage(updated.requireAverageForCertificate);
      setMinAverage(String(updated.minAverage));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar configuracao.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssessment = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmed = newTitle.trim();
    if (!trimmed) {
      setError('Informe o titulo da avaliacao.');
      return;
    }

    const parsedOrder = Number(newOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Informe uma ordem valida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await apiRequest<Assessment>('/assessments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: trimmed,
          description: newDescription.trim() || undefined,
          order: parsedOrder,
          courseId,
        }),
      });
      setAssessments((prev) => [
        ...prev,
        { ...created, questions: created.questions ?? [] },
      ]);
      setNewTitle('');
      setNewDescription('');
      setNewOrder(parsedOrder + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar avaliacao.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (assessment: Assessment) => {
    setEditingId(assessment.id);
    setEditTitle(assessment.title);
    setEditDescription(assessment.description ?? '');
    setEditOrder(assessment.order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setEditOrder(1);
  };

  const handleUpdateAssessment = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('Informe o titulo da avaliacao.');
      return;
    }

    const parsedOrder = Number(editOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Informe uma ordem valida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await apiRequest<Assessment>(`/assessments/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          title: trimmed,
          description: editDescription.trim() || null,
          order: parsedOrder,
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
      cancelEdit();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar avaliacao.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (
      !window.confirm(
        'Excluir esta avaliacao tambem remove os envios e notas dos alunos. Continuar?',
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/assessments/${id}`, { method: 'DELETE', token });
      setAssessments((prev) => prev.filter((item) => item.id !== id));
      if (openAssessmentId === id) {
        setOpenAssessmentId(null);
      }
      if (questionFormFor?.assessmentId === id) {
        setQuestionFormFor(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover avaliacao.');
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestions = (id: string) => {
    setOpenAssessmentId((prev) => (prev === id ? null : id));
  };

  const resetQuestionForm = () => {
    setQType('OBJETIVA');
    setQStatement('');
    setQPoints('1');
    setQOrder(1);
    setQOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ]);
  };

  const openNewQuestionForm = (assessment: Assessment) => {
    const maxOrder = assessment.questions.reduce(
      (acc, item) => Math.max(acc, item.order),
      0,
    );
    setQType('OBJETIVA');
    setQStatement('');
    setQPoints('1');
    setQOrder(maxOrder + 1);
    setQOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ]);
    setQuestionFormFor({ assessmentId: assessment.id, questionId: null });
  };

  const openEditQuestionForm = (assessmentId: string, question: Question) => {
    setQType(question.type);
    setQStatement(question.statement);
    setQPoints(String(question.points));
    setQOrder(question.order);
    if (question.type === 'OBJETIVA') {
      const drafts = [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect }));
      setQOptions(
        drafts.length >= 2
          ? drafts
          : [
              { text: '', isCorrect: true },
              { text: '', isCorrect: false },
            ],
      );
    } else {
      setQOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ]);
    }
    setQuestionFormFor({ assessmentId, questionId: question.id });
  };

  const closeQuestionForm = () => {
    setQuestionFormFor(null);
    resetQuestionForm();
  };

  const addOption = () => {
    setQOptions((prev) =>
      prev.length >= 10 ? prev : [...prev, { text: '', isCorrect: false }],
    );
  };

  const removeOption = (index: number) => {
    setQOptions((prev) => {
      if (prev.length <= 2) {
        return prev;
      }
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((opt) => opt.isCorrect)) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return next;
    });
  };

  const setOptionText = (index: number, text: string) => {
    setQOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt)),
    );
  };

  const setCorrectOption = (index: number) => {
    setQOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, isCorrect: i === index })),
    );
  };

  const handleSubmitQuestion = async () => {
    if (!questionFormFor) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const statement = qStatement.trim();
    if (!statement) {
      setError('Informe o enunciado da questao.');
      return;
    }

    const parsedPoints = Number.parseFloat(qPoints.replace(',', '.'));
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      setError('Informe uma pontuacao maior que zero.');
      return;
    }

    const parsedOrder = Number(qOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Informe uma ordem valida.');
      return;
    }

    let optionsPayload: OptionDraft[] | undefined;
    if (qType === 'OBJETIVA') {
      if (qOptions.some((opt) => !opt.text.trim())) {
        setError('Preencha o texto de todas as alternativas.');
        return;
      }
      if (!qOptions.some((opt) => opt.isCorrect)) {
        setError('Marque uma alternativa como correta.');
        return;
      }
      optionsPayload = qOptions.map((opt) => ({
        text: opt.text.trim(),
        isCorrect: opt.isCorrect,
      }));
    }

    const roundedPoints = Math.round(parsedPoints * 100) / 100;

    setSaving(true);
    setError('');

    const { assessmentId, questionId } = questionFormFor;

    try {
      if (questionId) {
        const body: {
          statement: string;
          points: number;
          order: number;
          options?: OptionDraft[];
        } = {
          statement,
          points: roundedPoints,
          order: parsedOrder,
        };
        if (qType === 'OBJETIVA' && optionsPayload) {
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
      } else {
        const body: {
          type: QuestionType;
          statement: string;
          points: number;
          order: number;
          options?: OptionDraft[];
        } = {
          type: qType,
          statement,
          points: roundedPoints,
          order: parsedOrder,
        };
        if (qType === 'OBJETIVA' && optionsPayload) {
          body.options = optionsPayload;
        }
        const created = await apiRequest<Question>(
          `/assessments/${assessmentId}/questions`,
          {
            method: 'POST',
            token,
            body: JSON.stringify(body),
          },
        );
        setAssessments((prev) =>
          prev.map((item) =>
            item.id === assessmentId
              ? { ...item, questions: [...item.questions, created] }
              : item,
          ),
        );
      }
      closeQuestionForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar questao.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (
    assessmentId: string,
    questionId: string,
  ) => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!window.confirm('Excluir esta questao? Essa acao nao pode ser desfeita.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/questions/${questionId}`, { method: 'DELETE', token });
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === assessmentId
            ? {
                ...item,
                questions: item.questions.filter((q) => q.id !== questionId),
              }
            : item,
        ),
      );
      if (questionFormFor?.questionId === questionId) {
        closeQuestionForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover questao.');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionForm = (assessment: Assessment) => {
    const isEditing = Boolean(questionFormFor?.questionId);
    return (
      <div className="space-y-4 rounded-md border border-border bg-background/60 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px_140px]">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={qType}
              onChange={(event) =>
                setQType(event.target.value as QuestionType)
              }
              disabled={isEditing}
            >
              <option value="OBJETIVA">Objetiva</option>
              <option value="DISSERTATIVA">Dissertativa</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Pontos</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 2,5"
              value={qPoints}
              onChange={(event) => setQPoints(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ordem</Label>
            <Input
              type="number"
              min={1}
              value={qOrder}
              onChange={(event) => setQOrder(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Enunciado</Label>
          <Textarea
            placeholder="Descreva a questao..."
            value={qStatement}
            onChange={(event) => setQStatement(event.target.value)}
          />
        </div>

        {qType === 'OBJETIVA' ? (
          <div className="space-y-3">
            <Label>Alternativas</Label>
            {qOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  className="flex-1"
                  placeholder={`Alternativa ${index + 1}`}
                  value={option.text}
                  onChange={(event) => setOptionText(index, event.target.value)}
                />
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name={`correct-${assessment.id}-${questionFormFor?.questionId ?? 'new'}`}
                    checked={option.isCorrect}
                    onChange={() => setCorrectOption(index)}
                  />
                  Correta
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeOption(index)}
                  disabled={qOptions.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={addOption}
              disabled={qOptions.length >= 10}
            >
              <Plus className="h-4 w-4" /> Adicionar alternativa
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={handleSubmitQuestion}
            disabled={saving}
          >
            <Save className="h-4 w-4" /> Salvar questao
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={closeQuestionForm}
          >
            <X className="h-4 w-4" /> Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.push('/teacher/courses/manage')}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {course?.title ?? 'Curso'}
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie as avaliacoes deste curso
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Configuracao das avaliacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="assessments-enabled">Curso com avaliacoes</Label>
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
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="require-average">
                Exigir media para emitir o certificado
              </Label>
              <Switch
                id="require-average"
                checked={requireAverage}
                disabled={!assessmentsEnabled}
                onCheckedChange={setRequireAverage}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-average">Media minima (0 a 10)</Label>
              <Input
                id="min-average"
                className="h-11 max-w-[160px]"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 7,0"
                value={minAverage}
                disabled={!assessmentsEnabled || !requireAverage}
                onChange={(event) => setMinAverage(event.target.value)}
              />
            </div>
            <Button className="gap-2" onClick={handleSaveConfig} disabled={saving}>
              <Save className="h-4 w-4" /> Salvar configuracao
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Nova avaliacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input
                  className="h-11"
                  placeholder="Ex: Avaliacao final"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  value={newOrder}
                  onChange={(event) => setNewOrder(Number(event.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Descricao opcional da avaliacao..."
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <Button
              className="gap-2"
              onClick={handleCreateAssessment}
              disabled={saving || loading}
            >
              <Plus className="h-4 w-4" /> Criar avaliacao
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Avaliacoes do curso
            </h2>
          </div>
          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : sortedAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma avaliacao cadastrada.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedAssessments.map((assessment) => {
                const isEditing = editingId === assessment.id;
                const isOpen = openAssessmentId === assessment.id;
                const sortedQuestions = [...assessment.questions].sort(
                  (a, b) => a.order - b.order,
                );
                const showForm =
                  questionFormFor?.assessmentId === assessment.id;
                return (
                  <Card key={assessment.id} className="border-none shadow-md">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-2">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            AVALIACAO {assessment.order}
                          </span>
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                                <Input
                                  className="h-9"
                                  value={editTitle}
                                  onChange={(event) =>
                                    setEditTitle(event.target.value)
                                  }
                                />
                                <Input
                                  className="h-9"
                                  type="number"
                                  min={1}
                                  value={editOrder}
                                  onChange={(event) =>
                                    setEditOrder(Number(event.target.value))
                                  }
                                />
                              </div>
                              <Textarea
                                placeholder="Descricao opcional..."
                                value={editDescription}
                                onChange={(event) =>
                                  setEditDescription(event.target.value)
                                }
                              />
                            </div>
                          ) : (
                            <>
                              <h3 className="text-base font-semibold text-foreground">
                                {assessment.title}
                              </h3>
                              {assessment.description ? (
                                <p className="text-sm text-muted-foreground">
                                  {assessment.description}
                                </p>
                              ) : null}
                            </>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span
                              className={`${pillBase} bg-secondary text-muted-foreground`}
                            >
                              {assessment.questions.length} questoes
                            </span>
                            <span
                              className={`${pillBase} bg-secondary text-muted-foreground`}
                            >
                              {assessment.submissionCount} envios
                            </span>
                            {assessment.pendingCount > 0 ? (
                              <span
                                className={`${pillBase} bg-primary/15 text-primary`}
                              >
                                {assessment.pendingCount} aguardando correcao
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() =>
                                  handleUpdateAssessment(assessment.id)
                                }
                                disabled={saving}
                              >
                                <Save className="h-4 w-4" /> Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" /> Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => startEdit(assessment)}
                              >
                                <PencilLine className="h-4 w-4" /> Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() =>
                                  router.push(
                                    `/teacher/assessments/${assessment.id}/submissions`,
                                  )
                                }
                              >
                                <ClipboardList className="h-4 w-4" /> Correcoes
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-2 text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDeleteAssessment(assessment.id)
                                }
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => toggleQuestions(assessment.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Questoes ({assessment.questions.length})
                      </Button>

                      {isOpen ? (
                        <div className="space-y-4">
                          {sortedQuestions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma questao cadastrada.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {sortedQuestions.map((question) => (
                                <div
                                  key={question.id}
                                  className="space-y-2 rounded-md border border-border p-4"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Questao {question.order} •{' '}
                                        {question.points} pt(s) •{' '}
                                        {question.type === 'OBJETIVA'
                                          ? 'Objetiva'
                                          : 'Dissertativa'}
                                      </span>
                                      <p className="text-sm text-foreground">
                                        {question.statement}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() =>
                                          openEditQuestionForm(
                                            assessment.id,
                                            question,
                                          )
                                        }
                                      >
                                        <PencilLine className="h-4 w-4" /> Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-2 text-destructive hover:text-destructive"
                                        onClick={() =>
                                          handleDeleteQuestion(
                                            assessment.id,
                                            question.id,
                                          )
                                        }
                                        disabled={saving}
                                      >
                                        <Trash2 className="h-4 w-4" /> Excluir
                                      </Button>
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
                                              <CheckCircle2 className="h-4 w-4 text-accent" />
                                            ) : (
                                              <CircleDot className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span
                                              className={
                                                option.isCorrect
                                                  ? 'text-foreground'
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
                              ))}
                            </div>
                          )}

                          {showForm ? (
                            renderQuestionForm(assessment)
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => openNewQuestionForm(assessment)}
                            >
                              <Plus className="h-4 w-4" /> Nova questao
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
