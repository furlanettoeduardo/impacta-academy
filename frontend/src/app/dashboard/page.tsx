'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../lib/api';
import { clearToken, getToken } from '../../lib/auth';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
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
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold">Ola, {user.name}</h1>
          </div>
          <button
            className="rounded-full border border-black/20 px-4 py-2 text-sm"
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
          >
            Sair
          </button>
        </header>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold">Perfil</h2>
            <p className="mt-2 text-sm text-zinc-600">{user.email}</p>
            <p className="mt-1 text-sm text-zinc-600">Perfil: {user.role}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold">Atalhos</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link className="rounded-xl bg-[#f4efe7] px-4 py-3" href="/courses">
                Ver cursos
              </Link>
              <Link className="rounded-xl bg-[#f0f7f7] px-4 py-3" href="/courses">
                Gerenciar cursos
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
