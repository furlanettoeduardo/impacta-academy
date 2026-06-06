# Impacta Academy — Frontend

Interface web do Impacta Academy, construída com **Next.js 16** (App Router), **React 19** e **Tailwind CSS v4**, com componentes Radix UI sob `src/components/ui`.

> A documentação completa do projeto (arquitetura, rotas, papéis e variáveis de ambiente) está no [README da raiz](../README.md).

## Setup

```bash
cp .env.example .env.local     # aponta NEXT_PUBLIC_API_URL para a API
npm install
npm run dev                    # http://localhost:3000
```

A API (backend na porta 4000) precisa estar rodando — veja o README da raiz para o fluxo completo com Docker.

## Estrutura

- `src/app/` — páginas por papel: aluno (`/dashboard`, `/courses`, `/my-courses`, `/profile`), professor (`/teacher/*`) e admin (`/admin/*`).
- `src/components/` — `ui/` (Radix + CVA), `layout/` (`AppLayout`, `AppSidebar`), `SignaturePad`.
- `src/lib/` — `api.ts` (`apiRequest` + `ApiError`), `auth.ts` (token no `localStorage`, chave `impacta_token`), `download.ts` (PDFs de certificado), `utils.ts` (`cn`).

## Convenções

- Autenticação client-side: páginas redirecionam para `/login` sem token; o papel vem sempre de `GET /users/me`.
- Tailwind v4 sem `tailwind.config.*` — tokens de tema em `src/app/globals.css`.
- Strings de interface em português do Brasil.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
