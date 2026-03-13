'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  role: string;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
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
      apiRequest<User>('/users/me', { token }),
      apiRequest<Course[]>('/courses', { token }),
    ])
      .then(([userResponse, coursesResponse]) => {
        if (userResponse.role !== 'PROFESSOR' && userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setCourses(coursesResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [courses],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const stats = [
    { label: 'Cursos cadastrados', value: String(courses.length), icon: BookOpen, color: 'hsl(262,80%,50%)' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Painel do Professor
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie seus cursos e acompanhe seus alunos
            </p>
          </div>
          <Button
            className="gap-2 font-semibold"
            onClick={() => router.push('/teacher/courses/manage')}
            style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
          >
            <Plus className="h-4 w-4" /> Novo Curso
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Card className="border-none shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                    <s.icon className="h-6 w-6" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Cursos cadastrados
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => router.push('/teacher/courses/manage')}
            >
              Gerenciar <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando cursos...</p>
          ) : sortedCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedCourses.map((course, i) => (
                <motion.div key={course.id} custom={i + 4} variants={fadeUp} initial="hidden" animate="visible">
                  <Card className="group cursor-pointer border-none shadow-md transition-all hover:shadow-lg">
                    <CardContent className="space-y-2 p-5">
                      <h3 className="font-semibold text-foreground">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {course.description ?? 'Sem descricao cadastrada.'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Criado em {formatDate(course.createdAt)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => router.push(`/teacher/courses/${course.id}/modules`)}
                      >
                        Gerenciar modulos
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
