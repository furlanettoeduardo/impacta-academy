'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Globe, Palette, Save, Shield, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  role: string;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    apiRequest<User>('/users/me', { token })
      .then((user) => {
        if (user.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

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
            Configurações da Plataforma
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie as configurações gerais do Impacta Academy
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="border border-border bg-card">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" /> Geral
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" /> Aparência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Carregando configuracoes...</p>
                ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da Plataforma</Label>
                    <Input placeholder="Impacta Academy" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail de Suporte</Label>
                    <Input placeholder="suporte@impactaacademy.com" className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição da Plataforma</Label>
                    <Textarea
                      placeholder="Descreva a plataforma."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Site</Label>
                    <Input placeholder="https://impactaacademy.com" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma Padrão</Label>
                    <Input placeholder="Português (Brasil)" className="h-11" />
                  </div>
                </div>
                )}
                <Separator />
                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
                  >
                    <Save className="h-4 w-4" /> Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Preferências de Notificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Nenhuma configuracao real disponivel nesta versao.
                </p>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
                  >
                    <Save className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Segurança</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Nenhuma configuracao real disponivel nesta versao.
                </p>
                <Separator />
                <div className="space-y-2">
                  <Label>Tempo de expiração de sessão (minutos)</Label>
                  <Input type="number" placeholder="60" className="h-11 w-32" />
                </div>
                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
                  >
                    <Save className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Aparência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Logo da Plataforma</Label>
                  <div className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
                    <p className="text-sm text-muted-foreground">Arraste ou clique para enviar o logo</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, SVG ate 2MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary" />
                      <Input placeholder="#6d28d9" className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-accent" />
                      <Input placeholder="#0d9488" className="h-11" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    style={{ background: 'linear-gradient(135deg, hsl(262,80%,50%), hsl(280,90%,60%))' }}
                  >
                    <Save className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
