'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type ModuleInfo = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  moduleId: string;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ModuleLessonsPage() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;

  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
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
      apiRequest<ModuleInfo>(`/modules/${moduleId}`, { token }),
      apiRequest<Lesson[]>(`/modules/${moduleId}/lessons`, { token }),
    ])
      .then(([moduleResponse, lessonsResponse]) => {
        setModuleInfo(moduleResponse);
        setLessons(lessonsResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar aulas.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [moduleId, router]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.order - b.order),
    [lessons],
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {moduleInfo?.title ?? 'Modulo'}
          </h1>
          <p className="mt-1 text-muted-foreground">Aulas deste modulo</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lista de aulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando aulas...</p>
            ) : sortedLessons.length === 0 ? (
              <div className="py-8 text-center">
                <Play className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedLessons.map((lesson) => (
                  <Card key={lesson.id} className="border-none bg-secondary/40">
                    <CardContent className="space-y-2 p-4">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Aula {lesson.order}
                        </span>
                        <p className="text-base font-semibold text-foreground">{lesson.title}</p>
                        {lesson.description ? (
                          <p className="text-sm text-muted-foreground">{lesson.description}</p>
                        ) : null}
                      </div>
                      {lesson.videoUrl ? (
                        <p className="text-xs text-muted-foreground break-all">
                          Video: {lesson.videoUrl}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Video nao informado.</p>
                      )}
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
