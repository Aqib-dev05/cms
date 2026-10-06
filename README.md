# College Management System

Full-stack college management system — Express + Prisma + PostgreSQL backend, Next.js 14 frontend.

```
cms/
├── backend/    → Express.js + TypeScript API (Prisma, Redis, Socket.io)
└── frontend/   → Next.js 14 app (React Query, Zustand, Tailwind)
```

Dono folders independent hain, har ek ki apni `package.json` aur `node_modules` hai.

## Backend

Prerequisites: Node.js v20+, PostgreSQL, Redis

```bash
cd backend
npm install
cp .env.example .env      # fill in values
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev               # http://localhost:5000
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

## Default admin (after seed)

```
username: admin
password: Admin@1234
```

Change immediately after first login.
