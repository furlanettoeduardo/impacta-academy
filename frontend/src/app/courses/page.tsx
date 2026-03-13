'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Search, Star, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

const categories = ['Todos', 'Desenvolvimento', 'Design', 'Marketing', 'Data Science', 'Negócios'];

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

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

  const mappedCourses = useMemo(
    () =>
      courses.map((course, index) => ({
        ...course,
        category: 'Desenvolvimento',
        hours: 20 + index * 2,
        students: 1200 + index * 150,
        rating: 4.6 + (index % 3) * 0.1,
        progress: 0,
        level: 'Intermediário',
        color: 'hsl(262,80%,50%)',
      })),
    [courses],
  );

  const filtered = mappedCourses.filter(
    (course) =>
      (activeCategory === 'Todos' || course.category === activeCategory) &&
      course.title.toLowerCase().includes(search.toLowerCase()),
  );

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

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              size="sm"
              className={activeCategory === category ? 'font-semibold' : ''}
              style={
                activeCategory === category
                  ? { background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }
                  : {}
              }
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
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
                    background: `linear-gradient(135deg, ${course.color}, ${course.color}cc)`,
                  }}
                >
                  <BookOpen className="h-12 w-12 text-primary-foreground/40" />
                  <Badge className="absolute right-3 top-3 border-none bg-white/20 text-xs text-primary-foreground backdrop-blur-sm">
                    {course.level}
                  </Badge>
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{course.category}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.students.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {course.rating.toFixed(1)}
                    </span>
                  </div>

                  {course.progress > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-foreground">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-1.5" />
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 w-full text-xs">
                      Começar curso
                    </Button>
                  )}
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
