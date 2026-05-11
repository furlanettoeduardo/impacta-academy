'use client';

import { motion } from 'framer-motion';
import { BookOpen, Calendar, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type AdminUser = User & { isActive: boolean };

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
    apiRequest<User>('/users/me', { token })
      .then(async (userResponse) => {
        if (userResponse.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setUser(userResponse);
        const [coursesResponse, usersResponse] = await Promise.all([
          apiRequest<Course[]>('/courses', { token }),
          apiRequest<AdminUser[]>('/users', { token }).catch(() => [] as AdminUser[]),
        ]);
        setCourses(coursesResponse);
        setUsers(usersResponse);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const sortedCourses = useMemo(
    () =>
      [...courses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [courses],
  );

  const usersByRole = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        acc.total += 1;
        if (u.role === 'ALUNO') acc.alunos += 1;
        else if (u.role === 'PROFESSOR') acc.professores += 1;
        else if (u.role === 'ADMIN') acc.admins += 1;
        return acc;
      },
      { total: 0, alunos: 0, professores: 0, admins: 0 },
    );
  }, [users]);

  const stats = [
    {
      label: 'Cursos cadastrados',
      value: String(courses.length),
      icon: BookOpen,
      tone: 'primary' as const,
    },
    {
      label: 'Usuários ativos',
      value: String(usersByRole.total),
      icon: Users,
      tone: 'accent' as const,
    },
    {
      label: 'Perfil atual',
      value: user?.role ?? '—',
      icon: Shield,
      tone: 'primary' as const,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
          >
            Painel Administrativo
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Visão geral da plataforma Impacta Academy.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      stat.tone === 'primary'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-accent/15 text-accent'
                    }`}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Distribuição de papéis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoleRow label="Alunos" value={usersByRole.alunos} total={usersByRole.total} />
              <RoleRow
                label="Professores"
                value={usersByRole.professores}
                total={usersByRole.total}
              />
              <RoleRow
                label="Administradores"
                value={usersByRole.admins}
                total={usersByRole.total}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-md lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Cursos recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : sortedCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Curso</TableHead>
                      <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="w-32">Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCourses.slice(0, 6).map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium text-foreground">
                          {course.title}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {course.description ?? 'Sem descrição cadastrada.'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(course.createdAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function RoleRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
