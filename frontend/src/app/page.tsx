import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <main className="w-full max-w-5xl rounded-3xl bg-white/80 p-10 shadow-[0_30px_80px_rgba(27,26,23,0.15)] backdrop-blur">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs uppercase tracking-[0.3em]">
              Impacta Academy
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
              Plataforma de cursos com trilhas, aulas e progresso.
            </h1>
            <p className="text-lg text-zinc-600">
              Uma base minimalista para o LMS: autentique-se, crie cursos e
              acompanhe os dados essenciais em tempo real.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-2px]"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-black/20 px-6 py-3 text-sm font-semibold text-black transition hover:border-black"
              >
                Criar conta
              </Link>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="text-xl font-semibold">Acesso rapido</h2>
            <div className="grid gap-3">
              <Link className="rounded-xl bg-[#f4efe7] px-4 py-3" href="/dashboard">
                Dashboard
              </Link>
              <Link className="rounded-xl bg-[#f0f7f7] px-4 py-3" href="/courses">
                Cursos
              </Link>
            </div>
            <p className="text-sm text-zinc-500">
              Use um token JWT valido para acessar o dashboard e os cursos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
