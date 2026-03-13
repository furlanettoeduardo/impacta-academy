'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Play,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
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

const stats = [
  { label: 'Cursos em andamento', value: '4', icon: BookOpen, color: 'hsl(262,80%,50%)' },
  { label: 'Horas estudadas', value: '128', icon: Clock, color: 'hsl(168,70%,45%)' },
  { label: 'Certificados', value: '7', icon: Trophy, color: 'hsl(40,90%,55%)' },
  { label: 'Sequência de dias', value: '12', icon: TrendingUp, color: 'hsl(340,80%,55%)' },
];

const continueLearning = [
  { title: 'React Avançado', module: 'Módulo 5: Custom Hooks', progress: 72, color: 'hsl(262,80%,50%)' },
  { title: 'UI/UX Design', module: 'Módulo 3: Prototipação', progress: 45, color: 'hsl(168,70%,45%)' },
  { title: 'Node.js & APIs', module: 'Módulo 7: Autenticação', progress: 88, color: 'hsl(40,90%,55%)' },
];

const recentActivity = [
  { text: 'Completou aula: Gerenciamento de Estado', time: '2h atrás', type: 'complete' },
  { text: 'Iniciou curso: TypeScript Masterclass', time: '5h atrás', type: 'start' },
  { text: 'Ganhou certificado: JavaScript Essentials', time: '1 dia atrás', type: 'cert' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<User>('/users/me', { token })
      .then(setUser)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        clearToken();
      });
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Continuar aprendendo
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary"
                onClick={() => router.push('/courses')}
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {continueLearning.map((c, i) => (
              <motion.div key={c.title} custom={i + 4} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="group cursor-pointer border-none shadow-md transition-all hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}dd)` }}
                    >
                      <Play className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">{c.title}</h3>
                      <p className="text-sm text-muted-foreground">{c.module}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={c.progress} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground">{c.progress}%</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-primary"
                    >
                      Continuar
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Atividade recente
            </h2>
            <Card className="border-none shadow-md">
              <CardContent className="space-y-4 p-5">
                {recentActivity.map((a, i) => (
                  <motion.div
                    key={a.text}
                    custom={i + 7}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                        a.type === 'complete'
                          ? 'bg-accent'
                          : a.type === 'cert'
                          ? 'bg-primary'
                          : 'bg-muted-foreground'
                      }`}
                    />
                    <div>
                      <p className="text-sm text-foreground">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
