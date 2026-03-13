'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../lib/api';
import { clearToken, getToken } from '../../lib/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Cursos
            </p>
            <h1 className="text-3xl font-semibold">Catalogo disponivel</h1>
          </div>
          <Link
            className="rounded-full border border-black/20 px-4 py-2 text-sm"
            href="/dashboard"
          >
            Voltar ao dashboard
          </Link>
        </header>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-4">
          {courses.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-sm text-zinc-500">
              Nenhum curso cadastrado ainda.
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl bg-white p-6 shadow-md"
              >
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {course.description || 'Sem descricao.'}
                </p>
                <p className="mt-4 text-xs text-zinc-400">
                  Criado em {new Date(course.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
