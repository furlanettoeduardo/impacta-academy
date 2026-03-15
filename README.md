# Plataforma de Cursos - Fullstack LMS

## Descrição do projeto

Plataforma de cursos online com autenticação, catálogo de cursos e um frontend
minimalista para consumo da API.

## Arquitetura do sistema

- Frontend: Next.js
- Backend: NestJS (API)
- Banco de dados: PostgreSQL
- Storage de arquivos: MinIO

## Tecnologias utilizadas

**Backend**

- NestJS
- TypeScript
- Prisma ORM
- JWT, Passport, bcrypt
- class-validator

**Frontend**

- Next.js
- TypeScript
- TailwindCSS

**Infraestrutura**

- PostgreSQL
- MinIO
- Docker + Docker Compose

## Estrutura do projeto

```
impacta-academy/
├── backend
├── frontend
├── docker-compose.yml
└── README.md
```

## Requisitos

- Docker
- Docker Compose

## Rodar o projeto com Docker

Na raiz do repositório `impacta-academy`, execute:

```bash
docker compose up --build
```

Na subida do container do backend, o Prisma executa as migrations automaticamente.

Serviços disponíveis:

- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- MinIO: http://localhost:9000
- MinIO Console: http://localhost:9001

## Usuario admin padrao

Na primeira execucao do projeto, um usuario administrador padrao e criado:

- Email: admin@academy.com
- Senha: Master123

## Variáveis de ambiente

Backend: arquivo `backend/.env`
Frontend: arquivo `frontend/.env.local`

Variáveis usadas no backend:

- JWT_SECRET
- JWT_EXPIRES_IN
- DATABASE_URL
- MINIO_ENDPOINT
- MINIO_PORT
- MINIO_ACCESS_KEY
- MINIO_SECRET_KEY
- MINIO_BUCKET

## Prisma

O backend usa Prisma 7. A conexão do banco é definida por `DATABASE_URL` no
arquivo `backend/.env` e pelo arquivo `backend/prisma.config.ts`.

O Prisma Client usa o adapter PostgreSQL (`@prisma/adapter-pg`) com a mesma
`DATABASE_URL`.

Para gerar o client e rodar migrations no backend:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Se houver mudanças no schema, crie uma nova migration com outro nome.

O Prisma Client tambem e gerado automaticamente no `postinstall` e durante o
build do Docker.

## Autenticação (JWT)

Endpoints:

- POST /auth/register
- POST /auth/login
- GET /users/me (protegido)

## Cursos (API)

Endpoints (JWT):

- POST /courses (ADMIN, PROFESSOR)
- GET /courses
- GET /courses/:id
- PATCH /courses/:id (ADMIN, PROFESSOR)
- DELETE /courses/:id (ADMIN)

## Modulos (API)

Endpoints:

- POST /modules (ADMIN, PROFESSOR)
- GET /courses/:courseId/modules
- PATCH /modules/:id (ADMIN, PROFESSOR)
- DELETE /modules/:id (ADMIN, PROFESSOR)

## Aulas (API)

Endpoints:

- POST /lessons (ADMIN, PROFESSOR)
- GET /modules/:moduleId/lessons
- GET /lessons/:id
- PATCH /lessons/:id (ADMIN, PROFESSOR)
- DELETE /lessons/:id (ADMIN, PROFESSOR)

## Upload de videos (API)

Endpoint:

- POST /upload/video (ADMIN, PROFESSOR)

Request: multipart/form-data

Campo:

- file

Resposta:

```
{
	"url": "http://localhost:9000/videos/lesson-<timestamp>.mp4"
}
```

## Rotas do frontend

- /login
- /register
- /dashboard (protegido por JWT no localStorage)
- /courses (protegido por JWT no localStorage)

O token JWT deve ser enviado no header:

```
Authorization: Bearer <access_token>
```

## Exemplo de requisição

Criar curso com token JWT:

```bash
curl -X POST http://localhost:4000/courses \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer <access_token>" \
	-d '{"title": "Introducao ao NestJS", "description": "Fundamentos da API"}'
```

## Desenvolvimento sem Docker

Backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
