# College Management System

A full-stack college management system built with Node.js, Express, PostgreSQL, and Next.js.

## Project Structure

```
cms/
├── apps/
│   ├── api/          → Express.js backend (complete)
│   └── web/          → Next.js 14 frontend (in progress)
├── packages/
│   └── validators/   → Shared Zod validation schemas
├── CLAUDE_PROJECT_CONTEXT.md
└── CLAUDE_INSTRUCTIONS.md
```

## Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL
- Redis

### 1. Install dependencies
```bash
npm install
```

### 2. Configure backend environment
```bash
cd apps/api
cp .env.example .env
# Fill in your values in .env
```

### 3. Setup database
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Start development
```bash
# Backend only
npm run dev:api

# Frontend only
npm run dev:web
```

## Backend — API Routes

| Module        | Base Route                   |
|---------------|------------------------------|
| Auth          | `/api/v1/auth`               |
| Users         | `/api/v1/users`              |
| Staff         | `/api/v1/staff`              |
| Academic      | `/api/v1/academic`           |
| Students      | `/api/v1/students`           |
| Timetable     | `/api/v1/timetable`          |
| Attendance    | `/api/v1/attendance`         |
| Exams         | `/api/v1/exams`              |
| Finance       | `/api/v1/finance`            |
| Library       | `/api/v1/library`            |
| Complaints    | `/api/v1/complaints`         |
| Notices       | `/api/v1/notices`            |
| Admissions    | `/api/v1/admissions`         |
| Notifications | `/api/v1/notifications`      |
| Media         | `/api/v1/media`              |
| Audit         | `/api/v1/audit`              |
| PDF           | `/api/v1/pdf`                |

## Default Admin (after seed)
```
Username: admin
Password: Admin@1234
```
⚠️ Change immediately after first login.
