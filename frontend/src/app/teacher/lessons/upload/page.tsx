'use client';

import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type User = {
  role: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function UploadLessonVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    apiRequest<User>('/users/me', { token })
      .then((user) => {
        if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao validar acesso.');
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleUpload = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!file) {
      setError('Selecione um arquivo de video.');
      return;
    }

    setUploading(true);
    setError('');
    setUrl('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.message ?? 'Erro ao enviar o video.';
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      setUrl(data.url as string);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o video.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Upload de video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="video/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {url ? (
              <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm text-foreground">
                <p className="font-medium">URL gerada:</p>
                <p className="break-all text-muted-foreground">{url}</p>
              </div>
            ) : null}

            <Button
              className="gap-2"
              onClick={handleUpload}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Enviando...' : 'Enviar video'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
