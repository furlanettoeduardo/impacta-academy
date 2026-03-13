'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Eye,
  FileText,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { getToken } from '@/lib/auth';

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'document';
  duration: string;
  fileName?: string;
}

const initialLessons: Lesson[] = [
  { id: '1', title: 'Introdução ao Módulo', type: 'video', duration: '12:30', fileName: 'intro.mp4' },
  { id: '2', title: 'Conceitos Fundamentais', type: 'video', duration: '25:15', fileName: 'conceitos.mp4' },
  { id: '3', title: 'Material Complementar', type: 'document', duration: '', fileName: 'material.pdf' },
];

export default function TeacherCourseManagePage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [dragFile, setDragFile] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const addLesson = () => {
    setLessons((current) => [
      ...current,
      { id: Date.now().toString(), title: '', type: 'video', duration: '' },
    ]);
  };

  const removeLesson = (id: string) => {
    setLessons((current) => current.filter((lesson) => lesson.id !== id));
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Gerenciar Curso
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Crie ou edite um curso e faça upload das aulas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" /> Pré-visualizar
            </Button>
            <Button
              className="gap-2 font-semibold"
              style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
            >
              <Save className="h-4 w-4" /> Publicar Curso
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Informações do Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Titulo do Curso</Label>
                <Input placeholder="Ex: React Avançado" className="h-11" defaultValue="React Avançado" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input placeholder="Ex: Desenvolvimento" className="h-11" defaultValue="Desenvolvimento" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  placeholder="Descreva o conteúdo do curso..."
                  className="min-h-[120px]"
                  defaultValue="Domine React com hooks avançados, gerenciamento de estado, patterns e performance."
                />
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                <Input placeholder="Iniciante, Intermediário ou Avançado" className="h-11" defaultValue="Avançado" />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input type="number" placeholder="0 para gratuito" className="h-11" defaultValue="197" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Thumbnail do Curso</Label>
              <div className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste ou clique para enviar a imagem de capa</p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG até 5MB — Recomendado: 1280x720</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Aulas do Curso</CardTitle>
            <Button size="sm" variant="outline" className="gap-2" onClick={addLesson}>
              <Plus className="h-4 w-4" /> Adicionar Aula
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragFile ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragFile(true);
              }}
              onDragLeave={() => setDragFile(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragFile(false);
              }}
            >
              <Video className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Arraste arquivos de vídeo ou documentos aqui
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                MP4, MOV, PDF, DOCX — até 500MB por arquivo
              </p>
              <Button variant="outline" size="sm" className="mt-3 gap-2">
                <Upload className="h-4 w-4" /> Selecionar Arquivos
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              {lessons.map((lesson, i) => (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        lesson.type === 'video'
                          ? 'hsl(262,80%,50%,0.15)'
                          : 'hsl(168,70%,45%,0.15)',
                    }}
                  >
                    {lesson.type === 'video' ? (
                      <Video className="h-4 w-4" style={{ color: 'hsl(262,80%,50%)' }} />
                    ) : (
                      <FileText className="h-4 w-4" style={{ color: 'hsl(168,70%,45%)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      placeholder="Título da aula"
                      defaultValue={lesson.title}
                      className="h-8 border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
                    />
                  </div>
                  {lesson.fileName && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {lesson.fileName}
                    </Badge>
                  )}
                  {lesson.duration && <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration}</span>}
                  <span className="shrink-0 text-xs text-muted-foreground">Aula {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => removeLesson(lesson.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}

              {lessons.length === 0 && (
                <div className="py-8 text-center">
                  <BookOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma aula adicionada ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
