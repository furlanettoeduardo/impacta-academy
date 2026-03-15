'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

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
        setUser(userResponse);
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

  const latestCourse = sortedCourses[0];

  const stats = [
    { label: 'Cursos cadastrados', value: String(courses.length), icon: BookOpen, color: 'hsl(262,80%,50%)' },
    { label: 'Ultimo curso', value: latestCourse?.title ?? 'Nenhum', icon: ArrowRight, color: 'hsl(168,70%,45%)' },
    { label: 'Ultima criacao', value: latestCourse ? formatDate(latestCourse.createdAt) : '—', icon: Clock, color: 'hsl(40,90%,55%)' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Nao foi possivel carregar seus dados.</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

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
            Olá, {user.name}! 👋
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Continue de onde parou. Você está indo muito bem!
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.color}15` }}
                  >
                    <s.icon className="h-6 w-6" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold text-foreground"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cursos recentes
            </h2>
          </div>

          {sortedCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum curso cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedCourses.slice(0, 4).map((course, i) => (
                <motion.div key={course.id} custom={i + 4} variants={fadeUp} initial="hidden" animate="visible">
                  <Card
                    className="cursor-pointer border-none shadow-md transition-shadow hover:shadow-lg"
                    onClick={() => router.push(`/courses/${course.id}/modules`)}
                  >
                    <CardContent className="space-y-2 p-5">
                      <h3 className="font-semibold text-foreground">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.description ?? 'Sem descricao cadastrada.'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Criado em {formatDate(course.createdAt)}</span>
                      </div>
                      <Progress value={0} className="h-2" />
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
