'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Plus,
  Star,
  TrendingUp,
  Users,
  Play,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getToken } from '@/lib/auth';

const stats = [
  { label: 'Meus Cursos', value: '6', icon: BookOpen, color: 'hsl(262,80%,50%)' },
  { label: 'Alunos Inscritos', value: '2.340', icon: Users, color: 'hsl(168,70%,45%)' },
  { label: 'Avaliação Média', value: '4.8', icon: Star, color: 'hsl(40,90%,55%)' },
  { label: 'Receita do Mês', value: 'R$ 12.8k', icon: TrendingUp, color: 'hsl(340,80%,55%)' },
];

const myCourses = [
  { title: 'React Avançado', students: 1200, rating: 4.9, lessons: 42, published: true, color: 'hsl(262,80%,50%)' },
  { title: 'JavaScript Moderno', students: 890, rating: 4.7, lessons: 36, published: true, color: 'hsl(168,70%,45%)' },
  { title: 'TypeScript na Prática', students: 250, rating: 4.8, lessons: 28, published: true, color: 'hsl(40,90%,55%)' },
  { title: 'Next.js Completo', students: 0, rating: 0, lessons: 12, published: false, color: 'hsl(200,80%,50%)' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function TeacherDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Meus Cursos
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {myCourses.map((course, i) => (
              <motion.div key={course.title} custom={i + 4} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="group cursor-pointer border-none shadow-md transition-all hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl"
                          style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}cc)` }}
                        >
                          <Play className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{course.title}</h3>
                          <p className="text-xs text-muted-foreground">{course.lessons} aulas</p>
                        </div>
                      </div>
                      <Badge variant={course.published ? 'default' : 'secondary'} className="text-xs">
                        {course.published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </div>
                    {course.published && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.students.toLocaleString()} alunos
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {course.rating}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
