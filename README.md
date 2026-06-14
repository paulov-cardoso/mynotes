# Mynotes

Aplicação fullstack de notas privadas em formato de post-its em canvas infinito. Projeto portfólio construído do zero com stack moderna de mercado.

![Demo](./docs/demo.png)
> _Screenshot será adicionado em breve_

---

## Stack

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

**Backend:** Node.js · Express · Prisma · PostgreSQL · JWT (access + refresh token) · bcrypt · Winston

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router DOM v7

---

## Arquitetura

Monorepo com backend e frontend separados. Em desenvolvimento, o Vite faz proxy de `/api` para o Express na porta 3333 — sem conflito de CORS. Em produção, o Express serve o bundle estático do React.

```
mynotes/
├── backend/    ← API REST (Node.js + Express + Prisma)
└── frontend/   ← SPA (React + TypeScript + Vite)
```

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente ou via Docker
- npm

---

## Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/paulov-cardoso/mynotes.git
cd mynotes
```

### 2. Configure o backend

```bash
cd backend
cp .env.example .env
# Edite o .env com sua DATABASE_URL e os secrets JWT
npm install
npx prisma migrate dev
npm run dev
```

### 3. Configure o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.
O backend responde em `http://localhost:3333`.

---

## Fases do projeto

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 — Estrutura base | ✅ Concluído | Monorepo, Express, Prisma, PostgreSQL, health endpoint |
| 2 — Autenticação (backend) | ✅ Concluído | JWT com access + refresh token, bcrypt, 5 endpoints REST |
| 3 — Autenticação (frontend) | ✅ Concluído | Login, cadastro, contexto de auth, design liquid glass |
| 4 — Canvas de notas | 🔨 Em desenvolvimento | Canvas infinito com post-its arrastáveis |
| 5 — Deploy | ⏳ Planejado | — |

---

## Autor

Paulo V. Cardoso · [github.com/paulov-cardoso](https://github.com/paulov-cardoso)