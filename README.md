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

Nao ha autenticacao implementada nesta fase. O objetivo e apenas subir a infraestrutura.
