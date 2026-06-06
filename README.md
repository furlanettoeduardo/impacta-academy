# Impacta Academy — Plataforma de Cursos (LMS Fullstack)

## Descrição do projeto

Plataforma de cursos online (LMS) completa, com:

- Autenticação JWT e três papéis: **ADMIN**, **PROFESSOR** e **ALUNO**.
- Catálogo de cursos com **matrícula** e controle de acesso por matrícula.
- Trilha de **módulos e aulas em vídeo**, com acompanhamento de progresso por aluno.
- **Avaliações** por curso com questões objetivas (correção automática) e dissertativas (correção manual pelo professor), nota em escala 0–10.
- **Certificados de conclusão** em PDF com assinatura do instrutor, média final e **validação pública por código** (`CERT-XXXX-XXXX-XXXX`).
- Painéis dedicados por papel: aluno, professor e administrador.
- Autogerenciamento de perfil (dados, senha e assinatura do instrutor).

### Fluxo do aluno (ponta a ponta)

```
matricular-se no curso → assistir 100% das aulas → realizar as avaliações
(objetivas corrigidas na hora; dissertativas aguardam o professor)
→ atingir a média mínima (quando exigida) → emitir o certificado
→ baixar o PDF / validar publicamente pelo código
```

## Arquitetura do sistema

- **Frontend**: Next.js 16 (App Router) + React 19 — porta 3000
- **Backend**: NestJS 11 (API REST) — porta 4000
- **Banco de dados**: PostgreSQL 16
- **Storage de arquivos**: MinIO (vídeos das aulas e assinaturas de instrutor)
- **Orquestração**: Docker Compose

## Tecnologias utilizadas

**Backend**

- NestJS 11 + TypeScript
- Prisma 7 (`@prisma/client` + adapter `@prisma/adapter-pg`)
- JWT (`@nestjs/jwt`, Passport, `passport-jwt`), bcrypt
- class-validator / class-transformer (ValidationPipe global com `whitelist` + `forbidNonWhitelisted` — campos desconhecidos no body são rejeitados)
- MinIO + Multer (upload de vídeos e assinaturas)
- PDFKit + sharp (geração do PDF do certificado e processamento da assinatura)

**Frontend**

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/postcss`, sem `tailwind.config` — tokens em `globals.css`)
- Radix UI + class-variance-authority + tailwind-merge
- framer-motion, lucide-react

**Infraestrutura**

- PostgreSQL 16, MinIO
- Docker + Docker Compose

## Papéis e permissões

| Papel | O que faz |
|---|---|
| **ALUNO** | Matricula-se em cursos, assiste aulas, realiza avaliações, emite/baixa certificados, edita o próprio perfil. |
| **PROFESSOR** | Tudo de gestão de conteúdo: cursos, módulos, aulas, avaliações, correção de submissões, upload de vídeos e da própria assinatura. |
| **ADMIN** | Tudo do professor + gestão de usuários (criar ADMIN/PROFESSOR/ALUNO, ativar/desativar) e exclusão de cursos. |

Observações:

- Cadastro via `POST /auth/register` cria **sempre** ALUNO. Contas ADMIN/PROFESSOR são criadas pelo admin via `POST /users`.
- Usuários inativos (`isActive=false`) são rejeitados em toda requisição (o JWT é revalidado contra o banco a cada request).

## Estrutura do projeto

```
impacta-academy/
├── backend/
│   ├── src/
│   │   ├── auth/           # login, registro, JWT, guards e roles
│   │   ├── users/          # gestão de usuários (ADMIN) + perfil próprio (/users/me)
│   │   ├── courses/        # cursos + flags de avaliação/certificado
│   │   ├── modules/        # módulos de um curso
│   │   ├── lessons/        # aulas + progresso (watch)
│   │   ├── enrollments/    # matrículas (base do controle de acesso)
│   │   ├── assessments/    # avaliações, questões, submissões e correção
│   │   ├── certificates/   # emissão, PDF e validação pública
│   │   ├── upload/         # upload de vídeo e assinatura (MinIO)
│   │   └── prisma/         # PrismaService (adapter pg)
│   ├── prisma/             # schema.prisma + migrations versionadas
│   ├── Dockerfile
│   └── entrypoint.sh       # aplica migrations no boot (com retry)
├── frontend/
│   ├── src/
│   │   ├── app/            # páginas (App Router) — aluno, /teacher/*, /admin/*
│   │   ├── components/     # ui/ (Radix), layout/ (sidebar), SignaturePad
│   │   └── lib/            # api.ts, auth.ts, download.ts, utils.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Requisitos

- Docker e Docker Compose (fluxo recomendado)
- Para desenvolvimento sem Docker: Node.js 20+, npm e instâncias acessíveis de PostgreSQL 16 e MinIO

## Rodar o projeto com Docker

> **Antes de subir**: crie `backend/.env` e `frontend/.env.local` — o `docker-compose.yml` os carrega via `env_file` e **falha se não existirem**. Use os templates versionados:
>
> ```bash
> cp backend/.env.example backend/.env
> cp frontend/.env.example frontend/.env.local
> ```

Na raiz do repositório, execute:

```bash
docker compose up --build
```

Na subida do container do backend, o `entrypoint.sh` aplica as migrations versionadas com `prisma migrate deploy` (com até 10 tentativas, tolerando o boot lento do Postgres).

Serviços disponíveis:

- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- MinIO (API): http://localhost:9000
- MinIO Console: http://localhost:9001

## Usuário admin padrão

Na primeira execução, um administrador padrão é criado automaticamente:

- Email: `admin@academy.com`
- Senha: `Master123`

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `DATABASE_URL` | **Sim** (o backend não sobe sem ela) | — | Conexão PostgreSQL |
| `JWT_SECRET` | Recomendada | `change-me` (**inseguro — sempre defina**) | Segredo de assinatura do JWT |
| `JWT_EXPIRES_IN` | Não | `1d` | Validade do token |
| `PORT` | Não | `4000` | Porta da API |
| `MINIO_ENDPOINT` | Não | `minio` | Host do MinIO |
| `MINIO_PORT` | Não | `9000` | Porta do MinIO |
| `MINIO_ACCESS_KEY` | Não | `minioadmin` | Credencial MinIO |
| `MINIO_SECRET_KEY` | Não | `minioadmin` | Credencial MinIO |
| `MINIO_BUCKET` | Não | `videos` | Bucket de arquivos |
| `MINIO_PUBLIC_URL` | Não | `http://localhost:9000` | Base das URLs públicas dos arquivos |

### Frontend (`frontend/.env.local`)

| Variável | Default | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL da API consumida pelo browser |

## Prisma

O backend usa **Prisma 7**. A conexão vem de `DATABASE_URL` (carregada por `backend/prisma.config.ts` para a CLI e lida diretamente pelo `PrismaService` em runtime, via adapter `@prisma/adapter-pg`).

Modelo de domínio (12 models, 3 enums):

```
User → Course → Module → Lesson → LessonProgress
Course também agrega: Enrollment, Assessment e Certificate
Assessment → Question → QuestionOption
Assessment → AssessmentSubmission → Answer

Enums: UserRole (ADMIN|PROFESSOR|ALUNO), QuestionType (OBJETIVA|DISSERTATIVA),
       SubmissionStatus (PENDENTE|CORRIGIDA)
```

Comandos (em `backend/`):

```bash
npm run prisma:generate                          # gera o client
npm run prisma:migrate -- --name <descricao>     # cria nova migration (dev)
npx prisma migrate deploy                        # aplica migrations existentes (fluxo do Docker)
```

O client também é gerado no `postinstall` e durante o build do Docker.

## API

Todas as rotas (exceto registro, login e validação pública de certificado) exigem o header:

```
Authorization: Bearer <access_token>
```

### Autenticação

| Método | Rota | Acesso |
|---|---|---|
| POST | `/auth/register` | Público — cria sempre ALUNO |
| POST | `/auth/login` | Público — retorna `access_token` (payload `{ userId, role }`) |

### Usuários

| Método | Rota | Acesso |
|---|---|---|
| GET | `/users/me` | Autenticado — dados do próprio usuário |
| PATCH | `/users/me` | Autenticado — edita o próprio perfil (`name`, `email`, senha com `currentPassword`, `signatureUrl`*) |
| GET | `/users` | ADMIN |
| POST | `/users` | ADMIN — cria contas de qualquer papel |
| PATCH | `/users/:id` | ADMIN |
| DELETE | `/users/:id` | ADMIN — bloqueado se o usuário tiver cursos criados |

\* `signatureUrl` (assinatura de instrutor) é permitido apenas para ADMIN/PROFESSOR; ALUNO recebe 403.

### Cursos

| Método | Rota | Acesso |
|---|---|---|
| POST | `/courses` | ADMIN, PROFESSOR |
| GET | `/courses` | Autenticado — inclui `enrolled` e progresso do usuário por curso |
| GET | `/courses/:id` | Autenticado — **ALUNO não matriculado recebe 403** |
| PATCH | `/courses/:id` | ADMIN, PROFESSOR |
| DELETE | `/courses/:id` | ADMIN |

Campos de configuração aceitos em POST/PATCH: `assessmentsEnabled` (habilita avaliações), `requireAverageForCertificate` (exige média para certificar) e `minAverage` (média mínima 0–10, default 7).

### Módulos

| Método | Rota | Acesso |
|---|---|---|
| POST | `/modules` | ADMIN, PROFESSOR |
| GET | `/courses/:courseId/modules` | Autenticado |
| GET | `/modules/:id` | Autenticado |
| PATCH | `/modules/:id` | ADMIN, PROFESSOR |
| DELETE | `/modules/:id` | ADMIN, PROFESSOR |

### Aulas

| Método | Rota | Acesso |
|---|---|---|
| POST | `/lessons` | ADMIN, PROFESSOR |
| GET | `/modules/:moduleId/lessons` | Autenticado — retorna o campo `watched` do usuário |
| GET | `/lessons/:id` | Autenticado |
| PATCH | `/lessons/:id` | ADMIN, PROFESSOR |
| DELETE | `/lessons/:id` | ADMIN, PROFESSOR |
| POST | `/lessons/:id/watch` | Autenticado — **ALUNO precisa estar matriculado** (403 caso contrário) |

`POST /lessons/:id/watch` faz upsert do progresso (chave única `userId+lessonId`) e responde:

```json
{
	"lessonId": "uuid-da-aula",
	"watched": true,
	"watchedAt": "2026-04-11T13:00:00.000Z"
}
```

### Matrículas

A matrícula é a base do controle de acesso: governa o acesso de alunos a cursos, registro de progresso, avaliações e emissão de certificado.

| Método | Rota | Acesso |
|---|---|---|
| POST | `/courses/:courseId/enroll` | Autenticado — matricula o próprio usuário (idempotente) |
| DELETE | `/courses/:courseId/enroll` | Autenticado — cancela a própria matrícula |
| GET | `/me/enrollments` | Autenticado — lista as próprias matrículas |
| GET | `/courses/:courseId/students` | ADMIN, PROFESSOR — alunos matriculados no curso |

### Avaliações

| Método | Rota | Acesso |
|---|---|---|
| POST | `/assessments` | ADMIN, PROFESSOR |
| GET | `/courses/:courseId/assessments` | Autenticado — visão difere por papel |
| GET | `/assessments/:id` | Autenticado — professor vê gabarito; aluno realiza ou vê resultado |
| PATCH | `/assessments/:id` | ADMIN, PROFESSOR |
| DELETE | `/assessments/:id` | ADMIN, PROFESSOR |
| POST | `/assessments/:id/questions` | ADMIN, PROFESSOR |
| PATCH | `/questions/:id` | ADMIN, PROFESSOR |
| DELETE | `/questions/:id` | ADMIN, PROFESSOR |
| POST | `/assessments/:id/submit` | ALUNO |
| GET | `/assessments/:id/submissions` | ADMIN, PROFESSOR |
| GET | `/submissions/:id` | Autenticado — aluno só vê a própria |
| PATCH | `/submissions/:id/grade` | ADMIN, PROFESSOR — atribui pontos por resposta |
| DELETE | `/submissions/:id` | ADMIN, PROFESSOR — libera nova tentativa |

Regras de negócio:

- **OBJETIVA**: 2–10 alternativas com exatamente uma correta; corrigida automaticamente no envio.
- **DISSERTATIVA**: corrigida manualmente pelo professor; enquanto houver dissertativa sem pontuação a submissão fica `PENDENTE`.
- Nota final em escala **0–10**: `(pontos obtidos / pontos totais) × 10`, 1 casa decimal.
- Para **enviar**, o aluno precisa: curso com `assessmentsEnabled`, estar matriculado e ter **100% das aulas concluídas**. Uma submissão por avaliação (o professor pode liberar nova tentativa).
- Questões ficam **imutáveis** após a primeira submissão (libere/exclua os envios antes de alterar).

### Certificados

| Método | Rota | Acesso |
|---|---|---|
| POST | `/courses/:courseId/certificate` | Autenticado — emite/reemite o próprio certificado |
| GET | `/me/certificates` | Autenticado |
| GET | `/certificates/validate/:code` | **Público (sem autenticação)** |
| GET | `/certificates/:id/pdf` | Dono do certificado ou ADMIN |

Condições de emissão: matrícula no curso + **100% das aulas concluídas** + (quando `assessmentsEnabled` **e** `requireAverageForCertificate` estão ambos ativos) todas as avaliações realizadas, corrigidas e com média ≥ `minAverage`.

O PDF (A4 paisagem, via PDFKit) inclui nome do aluno, curso, média final (quando aplicável), assinatura do instrutor (imagem enviada via upload, convertida com sharp) e o código de validação `CERT-XXXX-XXXX-XXXX`.

### Upload de arquivos

| Método | Rota | Acesso | Campo | Regras |
|---|---|---|---|---|
| POST | `/upload/video` | ADMIN, PROFESSOR | `file` (multipart) | mimetype `video/*` |
| POST | `/upload/signature` | ADMIN, PROFESSOR | `file` (multipart) | mimetype `image/*`, máx. 2 MB; processada com sharp (fundo removido, WebP) — usada na assinatura dos certificados |

Resposta:

```json
{
	"url": "http://localhost:9000/videos/lesson-<timestamp>.mp4"
}
```

## Rotas do frontend

A proteção é **client-side**: o token JWT fica no `localStorage` (chave `impacta_token`) e cada página redireciona para `/login` se ausente. O papel nunca é decodificado do token — é obtido via `GET /users/me`.

**Aluno / geral**

- `/login`, `/register`
- `/dashboard` — painel do aluno (cursos, progresso, certificados)
- `/courses` — catálogo com busca, filtros e matrícula
- `/my-courses` — apenas cursos matriculados
- `/courses/[courseId]` — player do curso (aulas, progresso, avaliações, certificado)
- `/courses/[courseId]/assessments/[assessmentId]` — realizar avaliação / ver resultado
- `/profile` — editar dados, senha e assinatura (assinatura só para ADMIN/PROFESSOR)

**Professor** (exige PROFESSOR ou ADMIN)

- `/teacher/dashboard`
- `/teacher/courses/manage` — criar cursos, vincular vídeos às aulas
- `/teacher/courses/[courseId]/modules` — CRUD de módulos
- `/teacher/modules/[moduleId]/lessons` — CRUD de aulas
- `/teacher/courses/[courseId]/assessments` — configurar e montar avaliações
- `/teacher/assessments/[assessmentId]/submissions` — corrigir envios

**Admin** (exige ADMIN)

- `/admin/dashboard`, `/admin/users`, `/admin/settings`

## Exemplo de requisições

Login e criação de curso com avaliações habilitadas:

```bash
# 1. Obter o token
curl -X POST http://localhost:4000/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email": "admin@academy.com", "password": "Master123"}'

# 2. Criar curso exigindo média 7 para o certificado
curl -X POST http://localhost:4000/courses \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer <access_token>" \
	-d '{"title": "Introdução ao NestJS", "description": "Fundamentos da API", "assessmentsEnabled": true, "requireAverageForCertificate": true, "minAverage": 7}'
```

## Testes

Backend (Jest):

```bash
cd backend
npm run test        # testes unitários (*.spec.ts em src/)
npm run test:e2e    # testes e2e
npm run test:cov    # cobertura
```

## Desenvolvimento sem Docker

Requer PostgreSQL e MinIO acessíveis (ajuste `DATABASE_URL` e `MINIO_*` no `backend/.env` — em dev local, o host do banco passa a ser `localhost` em vez de `postgres`).

Backend:

```bash
cd backend
npm install --legacy-peer-deps
npm run prisma:generate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
