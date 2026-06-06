'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  FileText,
  FolderTree,
  Link2,
  MoreVertical,
  MoveDown,
  MoveUp,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { uploadFileWithProgress } from '@/lib/upload';

type CourseModule = {
  id: string;
  title: string;
  order: number;
  courseId: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  order: number;
  moduleId: string;
};

type LessonState = {
  loading: boolean;
  loaded: boolean;
  items: Lesson[];
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
};

const HEADING_FONT = { fontFamily: "'Space Grotesk', sans-serif" } as const;

function isValidHttpUrl(value: string) {
  return /^https?:\/\/\S+/i.test(value.trim());
}

// ---------------------------------------------------------------------------
// Dialog: criar/editar módulo
// ---------------------------------------------------------------------------

type ModuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CourseModule | null;
  defaultOrder: number;
  onSubmit: (data: { title: string; order: number }) => Promise<void>;
};

function ModuleDialog({ open, onOpenChange, initial, defaultOrder, onSubmit }: ModuleDialogProps) {
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setOrder(initial?.order ?? defaultOrder);
  }, [open, initial, defaultOrder]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Informe o título do módulo.');
      return;
    }
    const parsedOrder = Number(order);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      toast.error('Informe uma ordem válida (número inteiro maior ou igual a 1).');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ title: trimmed, order: parsedOrder });
      onOpenChange(false);
    } catch {
      // erro já notificado por toast no chamador
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (saving ? null : onOpenChange(value))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={HEADING_FONT}>
            {initial ? 'Editar módulo' : 'Novo módulo'}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? 'Atualize o título ou a ordem deste módulo.'
              : 'Crie um novo módulo para organizar as aulas do curso.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Título</Label>
            <Input
              id="module-title"
              placeholder="Ex: Fundamentos"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-order">Ordem</Label>
            <Input
              id="module-order"
              type="number"
              min={1}
              value={order}
              onChange={(event) => setOrder(Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Define a posição do módulo na sequência do curso.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar módulo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: criar/editar aula (com upload / URL de vídeo)
// ---------------------------------------------------------------------------

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Lesson | null;
  defaultOrder: number;
  onSubmit: (data: {
    title: string;
    description?: string;
    order: number;
    videoUrl: string | null;
  }) => Promise<void>;
};

function LessonDialog({ open, onOpenChange, initial, defaultOrder, onSubmit }: LessonDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [orderTouched, setOrderTouched] = useState(false);
  // Inicializa o formulário UMA vez por abertura — re-renders do pai (ex.: o
  // fetch lazy das aulas resolvendo) não podem apagar o que o usuário digitou.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setOrder(initial?.order ?? defaultOrder);
    setVideoUrl(initial?.videoUrl ?? null);
    setExternalUrl('');
    setUploadName('');
    setUploadProgress(null);
    setOrderTouched(false);
  }, [open, initial, defaultOrder]);

  // Quando o fetch lazy termina e o módulo ganha aulas, a ordem sugerida muda.
  // Atualiza só o campo Ordem (criação), e apenas se o usuário não o editou.
  useEffect(() => {
    if (!open || initial || orderTouched || !initializedRef.current) return;
    setOrder(defaultOrder);
  }, [open, initial, orderTouched, defaultOrder]);

  const uploading = uploadProgress !== null;

  const handleUpload = async (file: File) => {
    const token = getToken();
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    setUploadName(file.name);
    setUploadProgress(0);
    try {
      const { url } = await uploadFileWithProgress('/upload/video', file, token, (percent) =>
        setUploadProgress(percent),
      );
      setVideoUrl(url);
      setUploadProgress(100);
      toast.success('Vídeo enviado com sucesso.');
    } catch (err) {
      setUploadProgress(null);
      setUploadName('');
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar o vídeo.');
    }
  };

  const handleApplyExternalUrl = () => {
    const trimmed = externalUrl.trim();
    if (!isValidHttpUrl(trimmed)) {
      toast.error('Informe uma URL válida iniciando com http:// ou https://');
      return;
    }
    setVideoUrl(trimmed);
    setUploadName('');
    setUploadProgress(null);
    toast.success('URL do vídeo vinculada.');
  };

  const handleRemoveVideo = () => {
    setVideoUrl(null);
    setExternalUrl('');
    setUploadName('');
    setUploadProgress(null);
  };

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Informe o título da aula.');
      return;
    }
    const parsedOrder = Number(order);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      toast.error('Informe uma ordem válida (número inteiro maior ou igual a 1).');
      return;
    }
    if (uploading && uploadProgress !== 100) {
      toast.error('Aguarde o término do envio do vídeo.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: trimmed,
        description: description.trim() || undefined,
        order: parsedOrder,
        videoUrl,
      });
      onOpenChange(false);
    } catch {
      // erro já notificado por toast no chamador
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <Dialog open={open} onOpenChange={(value) => (busy ? null : onOpenChange(value))}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle style={HEADING_FONT}>{initial ? 'Editar aula' : 'Nova aula'}</DialogTitle>
          <DialogDescription>
            Defina o conteúdo da aula e, opcionalmente, vincule um vídeo por upload ou URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Título</Label>
            <Input
              id="lesson-title"
              placeholder="Ex: Introdução ao useState"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-description">Descrição</Label>
            <Textarea
              id="lesson-description"
              placeholder="Resumo da aula..."
              className="min-h-[100px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este texto será exibido abaixo do player para os alunos.
            </p>
          </div>

          <div className="space-y-2 sm:max-w-[160px]">
            <Label htmlFor="lesson-order">Ordem</Label>
            <Input
              id="lesson-order"
              type="number"
              min={1}
              value={order}
              onChange={(event) => {
                setOrderTouched(true);
                setOrder(Number(event.target.value));
              }}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Vídeo da aula</Label>
              {videoUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleRemoveVideo}
                  disabled={busy}
                >
                  <X className="h-3.5 w-3.5" /> Remover vídeo
                </Button>
              ) : null}
            </div>

            {videoUrl ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                <video
                  controls
                  preload="metadata"
                  src={videoUrl}
                  className="max-h-48 w-full rounded-md bg-black"
                />
                <p className="break-all text-xs text-muted-foreground">{videoUrl}</p>
              </div>
            ) : (
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Enviar arquivo</TabsTrigger>
                  <TabsTrigger value="url">URL externa</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-3">
                  <label
                    htmlFor="lesson-video-file"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Clique para selecionar um vídeo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Formatos de vídeo (MP4, WebM...)
                    </span>
                    <input
                      id="lesson-video-file"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(file);
                        event.target.value = '';
                      }}
                    />
                  </label>

                  {uploading ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{uploadName}</span>
                        <span className="tabular-nums">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress ?? 0} className="h-2" />
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="url" className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="lesson-video-url">Link do vídeo</Label>
                    <Input
                      id="lesson-video-url"
                      placeholder="https://..."
                      value={externalUrl}
                      onChange={(event) => setExternalUrl(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole um link direto para o arquivo de vídeo (http ou https).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleApplyExternalUrl}
                  >
                    <Link2 className="h-4 w-4" /> Vincular URL
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar aula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Linha de aula
// ---------------------------------------------------------------------------

type LessonRowProps = {
  lesson: Lesson;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
};

function LessonRow({ lesson, index, total, onEdit, onMove, onDelete }: LessonRowProps) {
  const Icon = lesson.videoUrl ? Video : FileText;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:bg-secondary/30">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {lesson.order}. {lesson.title}
        </p>
        {lesson.description ? (
          <p className="truncate text-xs text-muted-foreground">{lesson.description}</p>
        ) : null}
      </div>
      {!lesson.videoUrl ? (
        <Badge variant="secondary" className="shrink-0">
          Sem vídeo
        </Badge>
      ) : null}
      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={onEdit}>
        <PencilLine className="h-3.5 w-3.5" /> Editar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Mais ações da aula">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove('up')}>
            <MoveUp className="h-4 w-4" /> Mover para cima
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMove('down')}>
            <MoveDown className="h-4 w-4" /> Mover para baixo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

type CourseContentTabProps = {
  courseId: string;
  /** Notifica o shell quando módulos/aulas mudam (contadores do header). */
  onContentChanged?: () => void;
};

export function CourseContentTab({ courseId, onContentChanged }: CourseContentTabProps) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, LessonState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Diálogos de módulo
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

  // Diálogos de aula
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonDialogModuleId, setLessonDialogModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Confirmações destrutivas
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  );

  const loadModules = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    apiRequest<CourseModule[]>(`/courses/${courseId}/modules`, { token })
      .then((data) => {
        setModules(data);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar módulos.'))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Sequência por módulo: garante que uma resposta antiga (disparada antes de
  // uma mutação) nunca sobrescreva uma lista mais recente.
  const lessonsFetchSeq = useRef<Record<string, number>>({});

  const fetchLessons = useCallback((moduleId: string) => {
    const token = getToken();
    if (!token) return;
    const seq = (lessonsFetchSeq.current[moduleId] ?? 0) + 1;
    lessonsFetchSeq.current[moduleId] = seq;
    setLessonsByModule((prev) => ({
      ...prev,
      [moduleId]: { loading: true, loaded: prev[moduleId]?.loaded ?? false, items: prev[moduleId]?.items ?? [] },
    }));
    apiRequest<Lesson[]>(`/modules/${moduleId}/lessons`, { token })
      .then((data) => {
        if (lessonsFetchSeq.current[moduleId] !== seq) return; // resposta obsoleta
        setLessonsByModule((prev) => ({
          ...prev,
          [moduleId]: { loading: false, loaded: true, items: data },
        }));
      })
      .catch((err) => {
        if (lessonsFetchSeq.current[moduleId] !== seq) return;
        setLessonsByModule((prev) => ({
          ...prev,
          [moduleId]: { loading: false, loaded: false, items: [] },
        }));
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar aulas do módulo.');
      });
  }, []);

  const toggleModule = (moduleId: string) => {
    setExpanded((prev) => {
      const next = !prev[moduleId];
      if (next && !lessonsByModule[moduleId]?.loaded && !lessonsByModule[moduleId]?.loading) {
        fetchLessons(moduleId);
      }
      return { ...prev, [moduleId]: next };
    });
  };

  const nextModuleOrder = useMemo(
    () => (sortedModules.length ? Math.max(...sortedModules.map((m) => m.order)) + 1 : 1),
    [sortedModules],
  );

  // ---- Mutações de módulo -------------------------------------------------

  const handleCreateModule = async (data: { title: string; order: number }) => {
    const token = getToken();
    if (!token) throw new Error('Sessão expirada.');
    try {
      const created = await apiRequest<CourseModule>('/modules', {
        method: 'POST',
        token,
        body: JSON.stringify({ ...data, courseId }),
      });
      setModules((prev) => [...prev, created]);
      toast.success('Módulo criado com sucesso.');
      onContentChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar o módulo.');
      throw err;
    }
  };

  const handleUpdateModule = async (id: string, data: { title?: string; order?: number }) => {
    const token = getToken();
    if (!token) throw new Error('Sessão expirada.');
    const updated = await apiRequest<CourseModule>(`/modules/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    });
    setModules((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  };

  const handleEditModuleSubmit = async (data: { title: string; order: number }) => {
    if (!editingModule) return;
    try {
      await handleUpdateModule(editingModule.id, data);
      toast.success('Módulo atualizado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar o módulo.');
      throw err;
    }
  };

  const handleMoveModule = async (module: CourseModule, direction: 'up' | 'down') => {
    const index = sortedModules.findIndex((m) => m.id === module.id);
    const neighbor = direction === 'up' ? sortedModules[index - 1] : sortedModules[index + 1];
    if (!neighbor) return;
    try {
      // Sequencial: se o segundo PATCH falhar, o refetch do catch ressincroniza
      // sem deixar os dois requests em voo ao mesmo tempo.
      await handleUpdateModule(module.id, { order: neighbor.order });
      await handleUpdateModule(neighbor.id, { order: module.order });
      toast.success('Ordem dos módulos atualizada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reordenar os módulos.');
      loadModules();
    }
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiRequest(`/modules/${moduleToDelete.id}`, { method: 'DELETE', token });
      setModules((prev) => prev.filter((m) => m.id !== moduleToDelete.id));
      setLessonsByModule((prev) => {
        const next = { ...prev };
        delete next[moduleToDelete.id];
        return next;
      });
      toast.success('Módulo excluído com sucesso.');
      setModuleToDelete(null);
      onContentChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir o módulo.');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Mutações de aula ---------------------------------------------------

  const nextLessonOrder = (moduleId: string) => {
    const items = lessonsByModule[moduleId]?.items ?? [];
    return items.length ? Math.max(...items.map((l) => l.order)) + 1 : 1;
  };

  const openCreateLesson = (moduleId: string) => {
    if (!lessonsByModule[moduleId]?.loaded) fetchLessons(moduleId);
    setExpanded((prev) => ({ ...prev, [moduleId]: true }));
    setEditingLesson(null);
    setLessonDialogModuleId(moduleId);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonDialogModuleId(lesson.moduleId);
    setLessonDialogOpen(true);
  };

  const handleLessonSubmit = async (data: {
    title: string;
    description?: string;
    order: number;
    videoUrl: string | null;
  }) => {
    const token = getToken();
    if (!token) throw new Error('Sessão expirada.');
    const moduleId = lessonDialogModuleId;
    if (!moduleId) throw new Error('Módulo não identificado.');

    try {
      if (editingLesson) {
        const updated = await apiRequest<Lesson>(`/lessons/${editingLesson.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            title: data.title,
            // null limpa a coluna de fato (string vazia deixaria dado sujo);
            // @IsOptional() do class-validator aceita null.
            description: data.description ?? null,
            order: data.order,
            videoUrl: data.videoUrl,
          }),
        });
        setLessonsByModule((prev) => ({
          ...prev,
          [moduleId]: {
            loading: false,
            loaded: true,
            items: (prev[moduleId]?.items ?? []).map((l) => (l.id === updated.id ? updated : l)),
          },
        }));
        toast.success('Aula atualizada com sucesso.');
      } else {
        await apiRequest<Lesson>('/lessons', {
          method: 'POST',
          token,
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            order: data.order,
            moduleId,
            videoUrl: data.videoUrl ?? undefined,
          }),
        });
        toast.success('Aula criada com sucesso.');
        // Refetch (com guard de sequência): evita que um fetch lazy em voo,
        // iniciado antes do POST, sobrescreva a lista sem a aula nova.
        fetchLessons(moduleId);
        onContentChanged?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar a aula.');
      throw err;
    }
  };

  const handleMoveLesson = async (lesson: Lesson, direction: 'up' | 'down') => {
    const token = getToken();
    if (!token) return;
    const items = [...(lessonsByModule[lesson.moduleId]?.items ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const index = items.findIndex((l) => l.id === lesson.id);
    const neighbor = direction === 'up' ? items[index - 1] : items[index + 1];
    if (!neighbor) return;

    try {
      // Sequencial pelo mesmo motivo da reordenação de módulos.
      const updatedA = await apiRequest<Lesson>(`/lessons/${lesson.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ order: neighbor.order }),
      });
      const updatedB = await apiRequest<Lesson>(`/lessons/${neighbor.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ order: lesson.order }),
      });
      setLessonsByModule((prev) => ({
        ...prev,
        [lesson.moduleId]: {
          loading: false,
          loaded: true,
          items: (prev[lesson.moduleId]?.items ?? []).map((l) => {
            if (l.id === updatedA.id) return updatedA;
            if (l.id === updatedB.id) return updatedB;
            return l;
          }),
        },
      }));
      toast.success('Ordem das aulas atualizada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reordenar as aulas.');
      fetchLessons(lesson.moduleId);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiRequest(`/lessons/${lessonToDelete.id}`, { method: 'DELETE', token });
      setLessonsByModule((prev) => ({
        ...prev,
        [lessonToDelete.moduleId]: {
          loading: false,
          loaded: true,
          items: (prev[lessonToDelete.moduleId]?.items ?? []).filter(
            (l) => l.id !== lessonToDelete.id,
          ),
        },
      }));
      toast.success('Aula excluída com sucesso.');
      setLessonToDelete(null);
      onContentChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir a aula.');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Render -------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={loadModules}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dialogModuleId = lessonDialogModuleId ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground" style={HEADING_FONT}>
            Conteúdo do curso
          </h2>
          <p className="text-sm text-muted-foreground">
            Organize os módulos e as aulas em uma estrutura clara para os alunos.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingModule(null);
            setModuleDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </Button>
      </div>

      {sortedModules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <FolderTree className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Nenhum módulo ainda</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Crie o primeiro módulo para começar a organizar as aulas deste curso.
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingModule(null);
                setModuleDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Criar primeiro módulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedModules.map((module, moduleIndex) => {
            const isOpen = expanded[module.id] ?? false;
            const lessonState = lessonsByModule[module.id];
            const lessonItems = [...(lessonState?.items ?? [])].sort((a, b) => a.order - b.order);
            const lessonCount = lessonState?.loaded ? lessonItems.length : null;

            return (
              <motion.div
                key={module.id}
                custom={moduleIndex}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative h-0.5 bg-gradient-to-r from-primary to-accent" />
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-4">
                      <button
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className="flex flex-1 items-center gap-3 text-left"
                        aria-expanded={isOpen}
                      >
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            Módulo {module.order} — {module.title}
                          </p>
                        </div>
                      </button>

                      <Badge variant="secondary" className="shrink-0">
                        {lessonCount === null
                          ? '— aulas'
                          : `${lessonCount} ${lessonCount === 1 ? 'aula' : 'aulas'}`}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => openCreateLesson(module.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Nova aula
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label="Mais ações do módulo"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingModule(module);
                              setModuleDialogOpen(true);
                            }}
                          >
                            <PencilLine className="h-4 w-4" /> Editar módulo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={moduleIndex === 0}
                            onSelect={() => handleMoveModule(module, 'up')}
                          >
                            <MoveUp className="h-4 w-4" /> Mover para cima
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={moduleIndex === sortedModules.length - 1}
                            onSelect={() => handleMoveModule(module, 'down')}
                          >
                            <MoveDown className="h-4 w-4" /> Mover para baixo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setModuleToDelete(module)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir módulo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {isOpen ? (
                      <div className="border-t border-border/60 bg-secondary/10 p-4">
                        {lessonState?.loading ? (
                          <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                              <Skeleton key={i} className="h-12 w-full rounded-lg" />
                            ))}
                          </div>
                        ) : lessonItems.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma aula neste módulo ainda.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openCreateLesson(module.id)}
                            >
                              <Plus className="h-3.5 w-3.5" /> Adicionar aula
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {lessonItems.map((lesson, lessonIndex) => (
                              <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                index={lessonIndex}
                                total={lessonItems.length}
                                onEdit={() => openEditLesson(lesson)}
                                onMove={(direction) => handleMoveLesson(lesson, direction)}
                                onDelete={() => setLessonToDelete(lesson)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog de módulo */}
      <ModuleDialog
        open={moduleDialogOpen}
        onOpenChange={(value) => {
          setModuleDialogOpen(value);
          if (!value) setEditingModule(null);
        }}
        initial={editingModule}
        defaultOrder={nextModuleOrder}
        onSubmit={editingModule ? handleEditModuleSubmit : handleCreateModule}
      />

      {/* Dialog de aula */}
      <LessonDialog
        open={lessonDialogOpen}
        onOpenChange={(value) => {
          setLessonDialogOpen(value);
          if (!value) {
            setEditingLesson(null);
            setLessonDialogModuleId(null);
          }
        }}
        initial={editingLesson}
        defaultOrder={editingLesson ? editingLesson.order : nextLessonOrder(dialogModuleId)}
        onSubmit={handleLessonSubmit}
      />

      {/* Confirmação: excluir módulo */}
      <AlertDialog
        open={moduleToDelete !== null}
        onOpenChange={(value) => (value ? null : setModuleToDelete(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o módulo{' '}
              <span className="font-medium text-foreground">{moduleToDelete?.title}</span>? Todas as
              aulas deste módulo serão excluídas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteModule();
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir módulo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação: excluir aula */}
      <AlertDialog
        open={lessonToDelete !== null}
        onOpenChange={(value) => (value ? null : setLessonToDelete(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a aula{' '}
              <span className="font-medium text-foreground">{lessonToDelete?.title}</span>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteLesson();
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir aula'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
