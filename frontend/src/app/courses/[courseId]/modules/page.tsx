'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
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
                {sortedModules.map((module) => (
                  <Card key={module.id} className="border-none bg-secondary/40">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Separator />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
