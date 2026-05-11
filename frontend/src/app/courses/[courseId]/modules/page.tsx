'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type ModuleProgress = {
  moduleId: string;
  totalLessons: number;
  watchedLessons: number;
  percent: number;
};

type CourseProgress = {
  totalLessons: number;
  watchedLessons: number;
  percent: number;
  modules: ModuleProgress[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  progress?: CourseProgress;
};

type CourseModule = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

export default function CourseModulesPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      apiRequest<Course>(`/courses/${courseId}`, { token }),
      apiRequest<CourseModule[]>(`/courses/${courseId}/modules`, { token }),
    ])
      .then(([courseResponse, modulesResponse]) => {
        setCourse(courseResponse);
        setModules(modulesResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar modulos.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [courseId, router]);

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  );

  const moduleProgressById = useMemo(() => {
    const map = new Map<string, ModuleProgress>();
    course?.progress?.modules.forEach((m) => map.set(m.moduleId, m));
    return map;
  }, [course]);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {course?.title ?? 'Curso'}
          </h1>
          <p className="mt-1 text-muted-foreground">Modulos deste curso</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {course?.progress ? (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Seu progresso no curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {course.progress.watchedLessons}/{course.progress.totalLessons} aulas concluídas
                </span>
                <span className="font-semibold text-foreground">{course.progress.percent}%</span>
              </div>
              <Progress value={course.progress.percent} className="h-2" />
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lista de modulos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando modulos...</p>
            ) : sortedModules.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum modulo cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedModules.map((module) => {
                  const progress = moduleProgressById.get(module.id);
                  return (
                    <Card key={module.id} className="border-none bg-secondary/40">
                      <CardContent className="flex flex-col gap-3 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              Modulo {module.order}
                            </span>
                            <p className="text-base font-semibold text-foreground">{module.title}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/modules/${module.id}/lessons`)}
                          >
                            Ver aulas
                          </Button>
                        </div>
                        {progress ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {progress.watchedLessons}/{progress.totalLessons} aulas
                              </span>
                              <span className="font-medium text-foreground">{progress.percent}%</span>
                            </div>
                            <Progress value={progress.percent} className="h-1.5" />
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <Separator />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
