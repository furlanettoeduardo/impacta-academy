'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, ApiError, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type CourseDetails = {
  id: string;
  title: string;
  description?: string | null;
};

type CourseDetailsTabProps = {
  course: CourseDetails;
  role: 'ADMIN' | 'PROFESSOR';
  onCourseUpdated: (data: { title: string; description?: string | null }) => void;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

export function CourseDetailsTab({
  course,
  role,
  onCourseUpdated,
}: CourseDetailsTabProps) {
  const router = useRouter();

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isDirty = useMemo(() => {
    const normalizedDescription = (course.description ?? '').trim();
    return (
      title.trim() !== course.title.trim() ||
      description.trim() !== normalizedDescription
    );
  }, [title, description, course.title, course.description]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError('Informe o título do curso.');
      return;
    }
    setTitleError('');

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
    };

    setSaving(true);
    try {
      await apiRequest(`/courses/${course.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });
      onCourseUpdated(payload);
      toast.success('Curso atualizado com sucesso.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar alterações.';
      toast.error(message);
      if (isAuthError(err)) {
        clearToken();
        router.replace('/login');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setDeleting(true);
    try {
      await apiRequest(`/courses/${course.id}`, { method: 'DELETE', token });
      toast.success('Curso excluído.');
      setDeleteOpen(false);
      router.push('/teacher/dashboard');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao excluir curso.';
      toast.error(message);
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
          <CardHeader>
            <CardTitle className="text-xl">Informações do curso</CardTitle>
            <CardDescription>
              Atualize o título e a descrição exibidos para os alunos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="course-title">Título</Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (titleError) setTitleError('');
                  }}
                  placeholder="Ex.: Introdução ao Desenvolvimento Web"
                  aria-invalid={titleError ? true : undefined}
                  disabled={saving}
                />
                {titleError ? (
                  <p className="text-sm text-destructive">{titleError}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-description">Descrição</Label>
                <Textarea
                  id="course-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva o que os alunos vão aprender neste curso."
                  rows={5}
                  disabled={saving}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={saving || !isDirty}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {role === 'ADMIN' ? (
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Card className="border-destructive/30 bg-destructive/5 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona de perigo
              </CardTitle>
              <CardDescription>
                A exclusão é permanente e não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Ao excluir este curso, todos os módulos, aulas, matrículas e
                avaliações associados serão removidos definitivamente.
              </p>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0 gap-2">
                    <Trash2 className="h-4 w-4" />
                    Excluir curso
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os módulos, aulas,
                      matrículas de alunos e avaliações deste curso serão
                      removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDelete();
                      }}
                    >
                      {deleting ? 'Excluindo...' : 'Excluir curso'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
