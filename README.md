# Mynotes

Aplicação fullstack de notas privadas em formato de post-its em canvas infinito. Projeto portfólio construído do zero com stack moderna de mercado, totalmente responsivo (desktop e mobile, incluindo suporte a touch e pinch-to-zoom).

---

### Tela de Login

<table align="center">
<tr>
<td align="center">
<img src="https://github.com/user-attachments/assets/2211f212-0127-416f-b26a-54e7ce500e8d" width="500" alt="Tela de login - Desktop"/>
<br/><em>Versão Desktop</em>
</td>
<td align="center">
<img src="https://github.com/user-attachments/assets/96c69cb1-9c16-48cf-bd8f-9ee07dbe15f0" width="180" alt="Tela de login - Mobile"/>
<br/><em>Versão Mobile</em>
</td>
</tr>
</table>

---

### Mural Infinito

<table align="center">
<tr>
<td align="center">
<img src="https://github.com/user-attachments/assets/13bcc7e8-c539-4063-ad00-41f93c6b329b" width="500" alt="Mural infinito - Desktop"/>
<br/><em>Versão Desktop</em>
</td>
<td align="center">
<img src="https://github.com/user-attachments/assets/155753c4-16ba-45a3-ab2a-5777a6350b51" width="180" alt="Mural infinito - Mobile"/>
<br/><em>Versão Mobile</em>
</td>
</tr>
</table>

---

### Blocos

<p align="center">
  <img width="676" height="623" alt="image" src="https://github.com/user-attachments/assets/3080e070-a46c-436c-a743-b26f3cb62571" />
</p>
<p align="center"><em>Exemplo de bloco de notes empilhados</em></p>

---

## Stack

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)

**Backend:** Node.js · Express · Prisma · PostgreSQL · JWT (access + refresh token) · bcrypt · Multer (upload de imagens) · Winston

**Frontend:** React 19 · TypeScript · Vite · React Router DOM v6 · Framer Motion · CSS-in-JS (inline styles + design tokens)

---

## Funcionalidades

- **Autenticação completa** — registro, login, refresh token automático, logout, validação de força de senha em tempo real
- **Canvas infinito** — pan, zoom (scroll, botões e pinch-to-zoom no touch), grid com snap automático, virtualização de viewport para performance
- **Notes (post-its)** — criar, editar (com atualização otimista), excluir, upload de foto de capa, paleta de cores customizável
- **Blocos** — agrupar notes relacionados em uma "torre" visual, com modal de leitura que simula a virada de páginas de um livro físico (animação 3D com verso do card colorido/neutro)
- **Sistema de temas** — pastel, color mode e dark mode
- **Busca** — busca por título/conteúdo com navegação direta até o note no canvas
- **Totalmente responsivo** — layout dedicado para mobile (`< 640px`), incluindo navbar com sidebar deslizante, touch pan e pinch-to-zoom no canvas, testado em dispositivo real (iPhone)

---

## Arquitetura

Monorepo com backend e frontend separados. Em desenvolvimento, o Vite faz proxy de `/api` e `/uploads` para o Express na porta 3333 — sem conflito de CORS. Em produção, o Express serve o bundle estático do React.

```
mynotes/
├── backend/    ← API REST (Node.js + Express + Prisma)
└── frontend/   ← SPA (React + TypeScript + Vite)
```

O projeto é uma tradução direta de um sistema Django/Python pré-existente (Synapsoo) para a stack Express/TypeScript, mantendo a mesma lógica de domínio (blocos, clips, canvas) reescrita com práticas modernas de TypeScript e React.

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

### Testar em dispositivo móvel (mesma rede local)

1. No `vite.config.ts`, adicione `host: true` dentro de `server`.
2. Descubra o IP local da máquina (`ipconfig` no Windows, `ifconfig`/`ip a` no Linux/Mac).
3. Acesse `http://<SEU_IP_LOCAL>:5173` no celular, conectado à mesma rede (Wi-Fi ou cabo no mesmo roteador).

---

## Fases do projeto

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 — Estrutura base | ✅ Concluído | Monorepo, Express, Prisma, PostgreSQL, health endpoint |
| 2 — Autenticação (backend) | ✅ Concluído | JWT com access + refresh token, bcrypt, endpoints REST |
| 3 — Autenticação (frontend) | ✅ Concluído | Login, cadastro, recuperação de senha, validação de força de senha, contexto de auth, design liquid glass com animação de envelope |
| 4 — Canvas infinito + CRUD | ✅ Concluído | Canvas com pan/zoom, notes arrastáveis com snap em grid, virtualização de viewport |
| 5 — Navbar + Temas | ✅ Concluído | Navbar responsiva, três temas (pastel/color/dark) |
| 6 — Blocos | ✅ Concluído | Agrupamento de notes em blocos, modal com animação de livro |
| 7 — Upload de imagens | ✅ Concluído | Foto de capa nos notes via Multer |
| 8 — Polish e responsividade mobile | ✅ Concluído | Layout mobile completo, touch/pinch no canvas, edição de notes, animações refinadas |
| 8.5 — Segurança, LGPD e QA | 🔨 Em desenvolvimento | Hardening de segurança, conformidade LGPD, plano de testes, testes automatizados (Jest), testes E2E, pentest básico |
| 9 — Deploy | ⏳ Planejado | CI/CD via GitHub Actions, ambiente de produção |

---

## Qualidade e Segurança

Este projeto está em processo ativo de hardening de segurança e construção de uma suíte de testes automatizados, com documentação completa de plano de testes e casos de teste — refletindo prática profissional de QA, área de atuação do autor. Detalhes técnicos completos da arquitetura, decisões de design e estratégia de testes estão documentados em `docs/technical.md` (não versionado publicamente neste momento).

---

## Autor

Paulo V. Cardoso · [github.com/paulov-cardoso](https://github.com/paulov-cardoso)
