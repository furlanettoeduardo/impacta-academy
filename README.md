# Plataforma de Cursos - Fullstack

Estrutura:

- backend/ (NestJS + TypeScript)
- frontend/ (Next.js + TypeScript + TailwindCSS)
- docker-compose.yml

## Requisitos

- Docker
- Docker Compose

## Subir o ambiente com Docker

Na raiz do repositorio `impacta-academy`, execute:

```bash
docker compose up --build
```

Servicos disponiveis:

- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- MinIO: http://localhost:9000
- MinIO Console: http://localhost:9001

## Variaveis de ambiente

Backend: arquivo `backend/.env`
Frontend: arquivo `frontend/.env.local`

Backend (auth):

- JWT_SECRET
- JWT_EXPIRES_IN

## Prisma

O backend usa Prisma 7. A conexao do banco e definida por `DATABASE_URL` no
arquivo `backend/.env` e pelo arquivo `backend/prisma.config.ts`.

O Prisma Client usa o adapter PostgreSQL (`@prisma/adapter-pg`) com a mesma
`DATABASE_URL`.

Para gerar o client e rodar migrations no backend:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Se houver mudancas no schema (ex.: cursos), rode uma nova migration com outro nome.

O Prisma Client tambem e gerado automaticamente no `postinstall` e durante o
build do Docker.

## Autenticacao (JWT)

Endpoints:

- POST /auth/register
- POST /auth/login
- GET /users/me (protegido)

## Cursos

Endpoints (JWT):

- POST /courses (ADMIN, PROFESSOR)
- GET /courses
- GET /courses/:id
- PATCH /courses/:id (ADMIN, PROFESSOR)
- DELETE /courses/:id (ADMIN)

## Frontend

Rotas basicas:

- /login
- /register
- /dashboard (protegido por JWT no localStorage)
- /courses (protegido por JWT no localStorage)

O token JWT deve ser enviado no header:

```
Authorization: Bearer <access_token>
```
