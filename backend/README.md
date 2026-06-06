# Impacta Academy — Backend (API)

API REST do Impacta Academy, construída com **NestJS 11**, **Prisma 7** (PostgreSQL via `@prisma/adapter-pg`) e **MinIO** para armazenamento de vídeos e assinaturas.

> A documentação completa do projeto (arquitetura, endpoints, papéis, fluxo do aluno e variáveis de ambiente) está no [README da raiz](../README.md).

## Módulos

`auth`, `users`, `courses`, `modules`, `lessons`, `enrollments`, `assessments`, `certificates`, `upload`, `prisma` — um módulo NestJS por recurso.

## Setup

```bash
cp .env.example .env           # ajuste DATABASE_URL e JWT_SECRET
npm install --legacy-peer-deps # postinstall roda `prisma generate`
npm run prisma:generate
npm run start:dev              # API em http://localhost:4000
```

Requer PostgreSQL e MinIO acessíveis (em dev local, troque o host do banco de `postgres` para `localhost` no `.env`). Pelo fluxo Docker (raiz do repo), as migrations são aplicadas automaticamente no boot via `entrypoint.sh`.

## Scripts principais

```bash
npm run start:dev              # nest start --watch
npm run build                  # nest build
npm run lint                   # eslint --fix
npm run test                   # jest (*.spec.ts em src/)
npm run test:e2e               # jest e2e
npm run prisma:migrate -- --name <descricao>   # nova migration (dev)
npx prisma migrate deploy      # aplica migrations existentes
```

## Convenções

- Todo body de request usa DTO com `class-validator` (ValidationPipe global com `whitelist` + `forbidNonWhitelisted`).
- Todo acesso ao banco passa pelo Prisma; mudanças de schema sempre via migration.
- Strings voltadas ao usuário em português do Brasil.
