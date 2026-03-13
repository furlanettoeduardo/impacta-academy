'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<Course[]>('/courses', { token })
      .then(setCourses)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar cursos.');
        clearToken();
      });
  }, [router]);

  const filtered = useMemo(
    () => courses.filter((course) => course.title.toLowerCase().includes(search.toLowerCase())),
    [courses, search],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Catálogo de Cursos
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Explore nossos cursos e comece a aprender hoje
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              className="h-12 pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className="group cursor-pointer overflow-hidden border-none shadow-md transition-all hover:shadow-xl">
                <div
                  className="relative flex h-32 items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))',
                  }}
                >
                  <BookOpen className="h-12 w-12 text-primary-foreground/40" />
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.description ?? 'Sem descricao cadastrada.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Criado em {formatDate(course.createdAt)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full text-xs"
                    onClick={() => router.push(`/courses/${course.id}/modules`)}
                  >
                    Ver modulos
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum curso encontrado</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
