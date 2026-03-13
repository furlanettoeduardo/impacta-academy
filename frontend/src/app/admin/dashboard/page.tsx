'use client';

import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  DollarSign,
  MoreVertical,
  Search,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getToken } from '@/lib/auth';

const stats = [
  {
    label: 'Total de Alunos',
    value: '12.458',
    change: '+12%',
    up: true,
    icon: Users,
    color: 'hsl(262,80%,50%)',
  },
  {
    label: 'Cursos Ativos',
    value: '87',
    change: '+5',
    up: true,
    icon: BookOpen,
    color: 'hsl(168,70%,45%)',
  },
  {
    label: 'Taxa de Conclusao',
    value: '73%',
    change: '+3%',
    up: true,
    icon: TrendingUp,
    color: 'hsl(40,90%,55%)',
  },
  {
    label: 'Receita Mensal',
    value: 'R$ 89.4k',
    change: '-2%',
    up: false,
    icon: DollarSign,
    color: 'hsl(340,80%,55%)',
  },
];

const recentUsers = [
  { name: 'Ana Silva', email: 'ana@email.com', role: 'Aluno', status: 'Ativo', joined: '12/03/2026' },
  { name: 'Carlos Oliveira', email: 'carlos@email.com', role: 'Professor', status: 'Ativo', joined: '10/03/2026' },
  { name: 'Maria Santos', email: 'maria@email.com', role: 'Aluno', status: 'Pendente', joined: '09/03/2026' },
  { name: 'Joao Costa', email: 'joao@email.com', role: 'Aluno', status: 'Ativo', joined: '08/03/2026' },
  { name: 'Fernanda Lima', email: 'fernanda@email.com', role: 'Professor', status: 'Ativo', joined: '07/03/2026' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export default function AdminDashboardPage() {
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
              Painel Administrativo
            </motion.h1>
            <p className="mt-1 text-muted-foreground">
              Visao geral da plataforma Impacta Academy
            </p>
          </div>
          <Button
            className="gap-2 font-semibold"
            style={{
              background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))',
            }}
          >
            <UserPlus className="h-4 w-4" /> Adicionar Usuario
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="border-none shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <Badge
                      variant="secondary"
                      className={`gap-1 text-xs ${stat.up ? 'text-accent' : 'text-destructive'}`}
                    >
                      {stat.up ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {stat.change}
                    </Badge>
                  </div>
                  <p
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-none shadow-md">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Usuarios Recentes
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar usuarios..." className="h-9 pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium text-foreground">
                      {user.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'Professor' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.role === 'Professor' && <Shield className="mr-1 h-3 w-3" />}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          user.status === 'Ativo'
                            ? 'text-accent'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.status === 'Ativo'
                              ? 'bg-accent'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.joined}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
