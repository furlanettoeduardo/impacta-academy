'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../lib/api';

const roles = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Professor', value: 'PROFESSOR' },
  { label: 'Aluno', value: 'ALUNO' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ALUNO');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold">Criar conta</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Informe seus dados para acessar a plataforma.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Perfil</label>
            <select
              className="w-full rounded-xl border border-black/10 px-4 py-3"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {roles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <div className="mt-4 text-sm text-zinc-500">
          Ja possui conta?{' '}
          <Link className="font-semibold text-zinc-900" href="/login">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
