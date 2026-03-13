# Development Instructions – Plataforma de Cursos

## 1. Project Overview

This repository contains a fullstack Learning Management System (LMS) developed as part of a Software Engineering academic project.

The platform allows:

* **Admins** to manage the system
* **Professors** to create and manage courses and lessons
* **Students** to access courses and track learning progress

The architecture follows a **3-layer model**:

* Frontend (Next.js)
* Backend (NestJS API)
* Database (PostgreSQL)

Infrastructure is managed with **Docker**.

---

# 2. Technology Stack

### Backend

* NestJS
* TypeScript
* Prisma ORM
* JWT Authentication
* bcrypt
* class-validator
* Passport

### Frontend

* Next.js
* TypeScript
* TailwindCSS

### Database

* PostgreSQL

### File Storage

* MinIO

### Infrastructure

* Docker
* Docker Compose

---

# 3. Repository Structure

Expected project structure:

```
/impacta-academy

/backend
/frontend
/docker-compose.yml
/README.md
/instructions.md
```

Backend structure should follow NestJS modular architecture:

```
src/

auth/
users/
courses/
prisma/

main.ts
app.module.ts
```

---

# 4. Development Guidelines

When generating or modifying code, the agent must follow these rules.

## Code Quality

* Use **TypeScript strict typing**
* Follow **NestJS best practices**
* Keep modules **small and cohesive**
* Use **DTOs with class-validator**
* Follow RESTful API design

---

## Database Rules

* All database access must use **Prisma ORM**
* Prisma schema must remain the **single source of truth**
* Migrations must always be generated using:

```
npx prisma migrate dev
```

Never modify the database manually outside migrations.

---

# 5. Environment Configuration

Environment variables must be stored in:

Backend:

```
backend/.env
```

Frontend:

```
frontend/.env.local
```

Sensitive variables must **never be committed**.

---

# 6. Docker Usage

All services must run via Docker Compose.

Services expected:

```
backend
frontend
postgres
minio
```

To start the project:

```
docker-compose up --build
```

Any infrastructure change must update:

* `docker-compose.yml`
* `README.md`

---

# 7. README Maintenance

The **README.md must always be updated** after major changes.

The README must contain:

* Project description
* Technology stack
* Setup instructions
* How to run the project
* API overview (if applicable)

When new features are added, update the documentation accordingly.

---

# 8. .gitignore Maintenance

The `.gitignore` must include:

```
node_modules
dist
.env
.env.local
*.log
coverage
.prisma
```

If new build artifacts or generated files appear, update `.gitignore`.

Sensitive or environment-related files must **never be committed**.

---

# 9. Reporting Rules

After every **major update**, the agent must generate a development report.

A **major update** includes:

* New module creation
* Infrastructure changes
* Database schema changes
* Authentication changes
* Feature implementation

The report must include:

* Summary of the change
* Files created or modified
* System impact

Example format:

```
Report

Feature implemented: Course CRUD module

Files created:
courses.module.ts
courses.controller.ts
courses.service.ts

DTOs added:
create-course.dto.ts
update-course.dto.ts

Security:
Endpoints protected with JwtAuthGuard and RolesGuard
```

Reports help maintain traceability for the academic project.

---

# 10. Testing Guidelines

Whenever possible, validate that:

* API routes compile without errors
* Prisma client is generated
* Database migrations run successfully
* Docker containers start correctly

Basic verification commands:

```
npm run build
npx prisma generate
docker-compose up
```

---

# 11. Commit Guidelines

Use clear commit messages.

Examples:

```
feat: add course CRUD module
fix: correct JWT authentication guard
chore: update docker-compose configuration
docs: update README setup instructions
```

Avoid generic messages like:

```
update code
fix stuff
```

---

# 12. Security Rules

Never expose:

* JWT secrets
* database credentials
* API keys

Secrets must always remain in `.env`.

---

# 13. Future Features (Planned)

The project will later include:

* Lessons with video upload
* Student progress tracking
* Quizzes and assessments
* Role-based dashboards
* Course enrollment system

The architecture should remain flexible for these additions.

---

# 14. Agent Behavior Expectations

When generating code, the agent must:

* Respect the existing architecture
* Avoid breaking changes
* Update documentation when necessary
* Generate a development report after major updates

Code must prioritize **clarity, maintainability, and modularity**.
