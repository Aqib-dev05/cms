# College Management System — Claude Project Context

> Last verified against repo: `https://github.com/Aqib-dev05/cms` (Oct 2026, HEAD `d81de33` + patch `attendance-security-seed-accent`) — Phase 5 (all role screens) is in the repo; the patch adds the attendance/security fixes, demo seed and new accent presets described below (apply it, then update this line)

## What This Is
A full-stack College Management System built solo by Aqib Ali as his Final Year Project (FYP) for BS-IT at University of the Punjab, Lahore. It is also intended as a real deployable product.

## Scope Decisions (Locked In)
- Single college/institution per deployment (no multi-tenancy)
- No multiple campuses
- No parents module
- No ML/AI features
- No sports module
- No hostel/transport modules

---

## Repo Structure (current)

```
cms/
├── README.md
├── backend/     → Express + TypeScript API (own package.json, npm)
└── frontend/    → Next.js 14 app (own package.json, npm)
```

- **No monorepo tooling.** pnpm workspaces / Turborepo / `apps/` / `packages/` were dropped in the "restructure" commits. Both folders are independent, each with its own `package-lock.json` and `node_modules`.
- **No shared `packages/validators/`.** Frontend has its own Zod schemas in `frontend/lib/validators/`. Keep them in sync with backend manually.

---

## Tech Stack

### Backend (`backend/`)
- **Runtime:** Node.js 20+ (README says v20+) + TypeScript 5.4 (strict mode), run in dev with `tsx watch`
- **Framework:** Express 4.19
- **ORM:** Prisma 5.14
- **Database:** PostgreSQL
- **Cache:** Redis (ioredis) — used for permission caching
- **Auth:** JWT (access 15m) + refresh tokens (7d, httpOnly cookie), bcryptjs for hashing
- **Validation:** Zod
- **File Upload:** Cloudinary (multer memory storage)
- **PDF:** pdfkit
- **Real-time:** Socket.io 4.7
- **Logging:** Winston (+ morgan for HTTP logs)
- **Security:** helmet, cors (credentials), express-rate-limit (global 300 req/15 min, `/auth` 10 req/15 min), compression

**NOT installed / not used yet:** BullMQ, Nodemailer. (Earlier notes said BullMQ was installed — it isn't.)
**R2 note:** `R2_*` env vars exist as optional in `env.ts` and `.env.example`, but no code uses Cloudflare R2. Cloudinary is the only storage in use.

### Frontend (`frontend/`) — Phase 1 (foundation) + Phase 2 (shared components) done
- Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS 3.4 (HSL CSS-variable tokens, `darkMode: class`)
- **State:** Redux Toolkit + react-redux (auth + UI state only) — replaced Zustand
- **Server state:** React Query v5 (`@tanstack/react-query` + devtools)
- **UI:** shadcn-style components (hand-written, Radix primitives), lucide-react, sonner (toasts), next-themes (light/dark/system), tailwindcss-animate
- axios, socket.io-client, react-hook-form + `@hookform/resolvers`, zod, recharts, date-fns, cva/clsx/tailwind-merge
- Fonts: Lexend (headings) + Source Sans 3 (body) via `next/font/google`
- Path alias: `@/*` → `./*`
- Design details: `frontend/DESIGN_SYSTEM.md`

### Infrastructure (planned)
- Deploy: Vercel (Next.js) + Railway/Render (Express)
- DB: Supabase (PostgreSQL)
- Redis: Railway or Upstash

---

## Roles & Permissions

### Roles (8 total, seeded)
| Role | Description |
|------|-------------|
| ADMIN | Full system access |
| HOD | Department head — has all TEACHER permissions + department management |
| TEACHER | Departmental faculty |
| HEAD_CLERK | Finance head — manages clerks |
| CLERK | Fee collection and invoicing |
| COMPLAINT_OFFICER | Central grievance monitoring |
| LIBRARIAN | Library management |
| STUDENT | Student portal access |

**Key decision:** HOD = TEACHER + extra permissions (one role, not multi-role). Option A was chosen.

### Permission Pattern
`module.action` — e.g. `attendance.read`, `fee.create`, `complaint.manage`

Permission codes are seeded in `backend/prisma/seed.ts`. Groups: `user.*`, `department/program/course/section.*`, `timetable.*`, `student.*`, `staff.*`, `attendance.*`, `exam.*`, `grade.*`, `fee.*`, `payment.*`, `clerk.manage`, `library.* (read/issue/return/manage)`, `complaint.* (create/read/assign/resolve/close/manage)`, `notice.*`, `admission.* (read/create/update/approve/manage)`, `notification.*`, `audit.*`, `analytics.read`.

**After pulling the analytics module, re-run `npm run db:seed`** so the `analytics.read` permission is created and assigned to ADMIN.

### RBAC Flow
```
Route → authenticate middleware → requirePermission("x.y") middleware
     → resolves from Redis cache or DB (role perms + user overrides)
```

---

## Academic Structure
```
College
  └── Department
        └── Program (BSCS, BBA etc.)
              └── AcademicSession (2024-2025)
                    └── Semester (1-8, FALL/SPRING/SUMMER)
                          └── Course (CS101)
                                └── Section (CS-A)
                                      └── Enrollment (student ↔ section)
```

---

## Backend Modules (All 18 Complete)

| Module | Base Route | Key Features |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Login, logout, refresh token rotation, change password |
| Users | `/api/v1/users` | Staff CRUD, toggle status, reset password |
| Staff | `/api/v1/staff` | Staff list, workload, **leave request submit only** |
| Academic | `/api/v1/academic` | Dept/Program/Session/Semester/Course/Section CRUD |
| Students | `/api/v1/students` | Create, enroll, status, bulk import. List filters (`status`, `programId`, `semesterId`) combine properly; `status` is validated against the enum; `search` matches every word across name/reg no/CNIC/username |
| Timetable | `/api/v1/timetable` | Slots with teacher conflict detection |
| Attendance | `/api/v1/attendance` | Mark, update, reports, at-risk detection (<75%) |
| Exams | `/api/v1/exams` | Create, bulk results, grade reports, publish |
| Finance | `/api/v1/finance` | Fee types, structures, invoices, payments, discounts |
| Library | `/api/v1/library` | Books, copies, issue/return, fine calculation |
| Complaints | `/api/v1/complaints` | Submit, auto-route, assign, status flow, comments |
| Notices | `/api/v1/notices` | Create, publish, audience targeting |
| Admissions | `/api/v1/admissions` | Apply (public), review, auto-enroll → student account |
| Notifications | `/api/v1/notifications` | Send, broadcast, mark read, unread count |
| Media | `/api/v1/media` | Cloudinary upload with folder routing |
| Audit | `/api/v1/audit` | Log viewer, stats, module filter |
| PDF | `/api/v1/pdf` | Fee receipt PDF, student report card PDF |
| Analytics | `/api/v1/analytics` | Admin dashboard data (needs `analytics.read`, ADMIN only for now): `GET /overview` (KPIs), `/fees/trend?months=`, `/attendance/trend?months=`, `/enrollment/by-program` |

Extras: `GET /health` (status + module list), 404 handler, global error handler.

**Size:** 78 TypeScript files in `backend/src` + `backend/prisma`. Prisma schema: **45 models, 15 enums**.

### Models (45)
User, Role, Permission, RolePermission, UserPermission, StaffProfile, StudentProfile, RefreshToken, AuditLog, Department, Program, AcademicSession, Semester, Course, Section, CourseTeacher, Enrollment, TimetableSlot, AttendanceSession, AttendanceRecord, Exam, ExamResult, FeeType, FeeStructure, FeeStructureItem, FeeInvoice, FeePayment, FeeDiscount, Book, BookCopy, BookIssue, ComplaintCategory, Complaint, ComplaintComment, ComplaintStatusHistory, Notice, Application, ApplicationStatusHistory, Notification, NotificationRecipient, Media, ExamMedia, NoticeMedia, ComplaintMedia, ApplicationMedia

### Enums (15)
RoleName, Gender, StaffStatus, StudentStatus, ApplicationStatus, ComplaintStatus, AttendanceStatus, FeeStatus, PaymentMethod, BookStatus, NoticeAudience, NotificationChannel, ResourceType, SemesterType, ExamType

---

## Cloudinary Folder Structure
Defined as `FOLDERS` in `backend/src/config/cloudinary.ts`.
```
{CLOUDINARY_ROOT_FOLDER}/      ← set via env, default: college_cms
├── users/profiles/            → USER_PROFILES
├── documents/
│   ├── admissions/            → ADMISSION_DOCUMENTS
│   ├── exams/                 → EXAM_PAPERS
│   └── general/               → GENERAL_DOCUMENTS
├── attachments/
│   ├── notices/               → NOTICE_ATTACHMENTS
│   └── complaints/            → COMPLAINT_ATTACHMENTS
└── media/general/             → GENERAL_MEDIA
```

---

## Socket.io

Auth: JWT access token via `socket.handshake.auth.token` (or Authorization header). CORS uses `CORS_ORIGIN` with credentials.

### Events defined (`SOCKET_EVENTS` in `backend/src/lib/socket.ts`)
```
notification              → personal notification
notification:unread_count → unread badge update
attendance:marked         → section room — attendance submitted
attendance:updated        → single record changed
exam:result_published     → section room — results live
finance:payment_received  → payment recorded
finance:invoice_created   → new invoice
complaint:assigned        → complaint routed
complaint:status_changed  → status update
notice:published          → new notice live
admission:status_changed  → application reviewed
```

### Actually emitted by services right now
Only **4** are wired: `notification` (notifications service), `attendance:marked` and `attendance:updated` (attendance service), `exam:result_published` (exams service). The rest are defined as constants but **not emitted yet** — finance, complaints, notices, admissions and `notification:unread_count` still need wiring.

### Rooms
- `user:{userId}` — personal room (joined on connect)
- `role:{ROLENAME}` — role broadcast room (joined on connect)
- `section:{sectionId}` — joined manually via `join:section`, left via `leave:section`

Helpers: `emitToUser`, `emitToRole`, `emitToSection`, `emitToAll`.

---

## Key File Locations

```
backend/
├── src/
│   ├── app.ts, server.ts
│   ├── config/           env.ts, database.ts, redis.ts, cloudinary.ts
│   ├── lib/              socket.ts
│   ├── middlewares/      auth, permission, error, validate, upload  (*.middleware.ts)
│   ├── modules/          17 modules, each with .service .controller .routes (some also .types)
│   ├── types/            prisma.types.ts (local enums before prisma generate)
│   └── utils/            response.ts, logger.ts, async-handler.ts, app-error.ts,
│                         reg-no.ts, audit-logger.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts           roles, permissions, admin user, complaint categories, fee types
└── .env.example

frontend/
├── app/
│   ├── layout.tsx, page.tsx (redirect), globals.css (design tokens)
│   ├── (auth)/login/page.tsx
│   └── (dashboard)/layout.tsx (AuthGuard + AppShell)
│       └── [role]/page.tsx (dashboard home), [role]/[...slug]/page.tsx ("coming soon" placeholder)
├── components/
│   ├── ui/        shadcn-style primitives (button, input, card, dropdown-menu, sheet, ...)
│   ├── layout/    sidebar, topbar, breadcrumbs, theme-toggle, user-menu, notification-bell, app-shell
│   ├── shared/    data-table, data-table-pagination, search-input, stat-card, status-badge,
│   │              form-field, confirm-dialog, detail-list, error-state, empty-state, page-header, full-screen-loader
│   └── auth/      auth-guard, guest-guard, login-form
├── config/        nav.ts (role → sidebar), roles.ts (role → base path), site.ts
├── features/      auth/ and notifications/ (api.ts + hooks.ts per feature)
├── hooks/         use-page-state.ts, use-debounced-value.ts
│   (features/ also has: academic/ (programs), students/ (api, hooks, schema, components))
├── providers/     Redux, Theme, Query, Socket, store hydrator
├── store/         index.ts (+ localStorage persistence listener), hooks.ts, slices/auth.slice.ts, slices/ui.slice.ts
├── lib/           api.ts, query-client.ts, query-keys.ts, socket.ts, format.ts, pagination.ts, password.ts, utils.ts, validators/
├── types/index.ts RoleName, AuthUser, ApiResponse, PaginatedResponse
├── components.json (shadcn CLI config), DESIGN_SYSTEM.md
└── .env.example
```

---

## Analytics definitions
- **Attended** = PRESENT or LATE (same as the attendance module); denominator = all marked records. At-risk threshold 75%.
- **At-risk students** (dashboard) = ACTIVE students under 75% over the last 90 days with at least 5 records.
- **Collected this month** = FeePayment sums by `paidAt`; **Outstanding** = `dueAmount` of UNPAID/PARTIAL/OVERDUE invoices; **Billed** (trend) = `totalAmount − discountAmount` by `issuedAt`.
- Month bucketing uses Pakistan time (UTC+5, fixed offset) for timestamps; attendance session dates are date-only (UTC).

---

## Student Identity
- `registrationNo` is primary academic identity (e.g. `2026-CS-041`)
- `email` = personal email (login)
- `collegeEmail` = optional generated email (`firstname.lastname@college.edu.pk`)
- `username` = system login handle
- All are conceptually separate

---

## PDF Generation
- **Fee Receipt:** `GET /api/v1/pdf/fee-receipt/:invoiceId` (needs `fee.read`)
- **Report Card (student's own):** `GET /api/v1/pdf/report-card/me/:semesterId`
- **Report Card (staff):** `GET /api/v1/pdf/report-card/:userId/:semesterId` (needs `grade.read`)
- Built with `pdfkit` — no browser/Chromium needed

---

## API Response Format
```json
{ "success": true, "message": "...", "data": {...} }
{ "success": true, "message": "...", "data": [...], "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }
{ "success": false, "message": "Error description" }
```

---

## Frontend — Current State

**All role screens are built (Phase 5): every sidebar item for every role now has a real page.** Pages live in `app/(dashboard)/[role]/<slug>/page.tsx` and use `<RoleSwitch views={{ROLE: <Screen/>}}/>` so one route file serves every role that has that slug; static `admin/students`, `clerk/students`, `admin/academic` and `admin/page.tsx` still win over `[role]`. Feature code is in `features/<module>/{types,api,hooks,components}`. New shared pieces: `ui/dialog`, `ui/tabs`, `ui/checkbox`, `shared/form-dialog`, `shared/role-switch`, `shared/student-picker`, `shared/section-select`, `shared/teacher-select`, `shared/semester-picker`, `shared/password-field`, `hooks/use-app-mutation` (mutation + toast + invalidate), `lib/form.ts` (`useZodForm` + zod field helpers), `lib/api-helpers.ts`. Old Zustand `stores/` folder removed (the leftover dead folder was deleted in the patch).

Done:
- Design system: green palette tokens (light + dark), 3 accent presets (Green default / Royal Blue / Crimson — blue & red also retint the neutrals; `--success/--warning/--destructive` stay semantic), Light/Dark/System switching (`ThemeToggle` in topbar + login page). See `DESIGN_SYSTEM.md`.
- Providers: Redux → next-themes → React Query → Tooltip → store hydrator, accent sync, socket provider, toaster.
- Redux: `auth` slice (`user`, `accessToken`, `hydrated`; `isAuthenticated` is a selector) and `ui` slice (`sidebarCollapsed`, `mobileNavOpen`, `accent`). Persisted to `localStorage` keys `cms-auth` / `cms-ui` by a listener middleware; hydrated client-side in `StoreHydrator`.
- `lib/api.ts`: axios with `withCredentials`, Bearer token from the Redux store, 401 → single shared `/auth/refresh` (refresh tokens rotate, so no parallel refreshes) → retry, else `clearAuth` + redirect to `/login`. `getErrorMessage()` helper.
- Auth: login page (react-hook-form + zod), `AuthGuard` (client-side; validates session via `/auth/me`, redirects to the user's own area), `GuestGuard`, logout.
- Routing: `/[role]` where `role` = `admin | hod | teacher | clerk | complaint-officer | librarian | student` (`config/roles.ts`; HEAD_CLERK and CLERK both use `/clerk`). Any `/[role]/<slug>` without a real page shows the "under construction" placeholder.
- App shell: collapsible sidebar (drawer on mobile) driven by `config/nav.ts`, breadcrumbs, notification bell with unread badge (`GET /notifications/unread-count`), user menu.
- Socket client: connects while authenticated; listens to `notification` (toast + invalidate) and `notification:unread_count`.
- Dashboard home: welcome + quick-access cards from the role's nav (all roles except admin, which has its own page).
- **Students module** (`features/students/`, first real use of `DataTable`): list at `/admin/students` and `/clerk/students` (search by name/reg no/CNIC/username, status + program filters, pagination, clear filters, clickable rows); create form at `/admin/students/new` (zod schema in `features/students/schema.ts` — blank optional inputs become `undefined`; username suggested from the name; password generator; server 409s mapped onto the right field); detail at `/<role>/students/[id]` (personal/academic/account info, current enrollments) with a *Change status* dialog (ADMIN only; Suspended/Expelled also disable login). NOTE: `id` in these routes is the **user** id, not the studentProfile id. List state (filters/page) lives in React state, not the URL, so it resets when you navigate away.
- **Admin dashboard** (`app/(dashboard)/admin/page.tsx`): 8 KPI cards, fee collection bar chart, attendance-rate line chart (75% line), students-by-program chart, and a "Needs attention" list. Each section loads independently (own query, skeleton, error + retry); charts have screen-reader data tables. Code in `features/analytics/`. Static `/admin` wins over `[role]`; `/admin/<slug>` still falls through to the placeholder.
- Shared components (`components/shared`): `DataTable` (loading/error/empty/pagination/clickable rows), `DataTablePagination`, `SearchInput` (debounced), `StatCard`, `StatusBadge` (maps backend enums), `FormField` (a11y wiring), `ConfirmDialog` (async-friendly), `ErrorState`, `EmptyState`, `PageHeader`. UI additions: `table`, `textarea`, native `select`, `alert-dialog`.
- Helpers: `lib/format.ts` (date/PKR currency/percent/humanize), `lib/pagination.ts` (`fetchPaginated`, `PAGE_SIZES`), `hooks/use-page-state.ts`, `hooks/use-debounced-value.ts`. List-page recipe is in `DESIGN_SYSTEM.md`.

Not done yet:
- Socket listeners for the other events (backend doesn't emit them yet)
- Public admission application form (no unauthenticated programs endpoint)
- Leave approval UI (no backend model; `/[role]/leave` is submit-only)
- Notice drafts (list endpoint only returns published notices, so notices are always published on create)
- Frontend automated tests

### Frontend Rules
- Next.js App Router, mostly Client Components for the dashboard (SPA-style; no SSR for protected routes)
- React Query for ALL server state; Redux Toolkit only for auth + UI state (sidebar, accent, ...)
- Query keys go through `lib/query-keys.ts`; each module lives in `features/<module>/{api,hooks,components}`
- Use design tokens (`bg-primary`, `text-muted-foreground`) — never hardcoded colours

### Build Phases
1. Foundation (done)
2. Shared components (done)
3. Dashboards and module screens (done): admin dashboard, Students, Academic setup, Staff, Users, Timetable, Attendance, Exams/Results, Finance, Library, Complaints, Notices, Admissions, Audit, Profile/Settings/Notifications, role dashboards

---

## Known issues / gaps
- `PATCH /students/:id/status` accepts a `note` but never stores it (the UI doesn't send one).
- The frontend has no automated tests / test runner yet (UI was verified with throw-away jsdom tests).
- Frontend doesn't know user permissions (only the role), so action buttons are shown by role; the backend enforces the real permission.
- **Teacher ownership is only enforced for attendance.** `grade.create` / `exam.create` (HOD) are not yet limited to the teacher's own sections, and `LIBRARIAN` (`complaint.read`) can list every complaint. Same pattern as `attendance.access.ts` can be reused.
- Prisma needs its engine binaries to run; in sandboxes without network access use `prisma generate --no-engine` just for typechecking.

## What Still Needs Building
1. **Frontend (Next.js)** — Phase 1 done; shared components + module screens remaining (see above)
2. **Analytics for other roles** — admin analytics is done; HOD (department-scoped), teacher, student and clerk dashboards need their own endpoints or scoped variants.
3. **Email service** — Nodemailer (not installed), triggered on key events
4. **Leave approval workflow** — Staff can submit a leave request (`POST /staff/me/leave`) but it's only written to the audit log; there is **no leave table and no approve/reject endpoint** (a `ReviewLeaveDto` type exists, unused in routes). HOD/Admin approval + proper `LeaveRequest` model still to build.
5. **Wire remaining socket events** (see Socket.io section)
6. **BullMQ queue setup** — only if email/background jobs need it (package not installed)

---

## Environment Variables

### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=     (min 32 chars)
JWT_REFRESH_SECRET=    (min 32 chars)
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLOUDINARY_ROOT_FOLDER=college_cms
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# Optional, currently unused in code:
R2_ENDPOINT=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
COLLEGE_NAME=Government College of Technology
COLLEGE_EMAIL_DOMAIN=gct.edu.pk
COLLEGE_EMAIL_ENABLED=false
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Default Admin Credentials (after seed)
```
username: admin
password: Admin@1234
```
⚠️ Change immediately after first login.

---

## Commands

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run db:generate     # prisma generate
npm run db:migrate      # prisma migrate dev
npm run db:seed         # roles, permissions, admin user, etc.
npm run dev             # http://localhost:5000
npm run typecheck       # tsc --noEmit
# also: db:studio, db:reset, db:migrate:prod, build, start

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev             # http://localhost:3000
npm run typecheck
```

---

## Key Decisions Made (Don't Re-discuss)
- Express over FastAPI
- HOD = Teacher + extra permissions (Option A)
- Cloudinary for all uploads, structured folders
- JWT + httpOnly cookie refresh tokens
- Registration number as academic identity (not email)
- Two independent folders (`backend/`, `frontend/`) with npm — no monorepo tooling
- Frontend state: Redux Toolkit (auth + UI) + React Query (all API data) — Zustand dropped
- Frontend design: green default palette, Lexend + Source Sans 3, Light/Dark/System + accent presets (Green / Royal Blue / Crimson)

## Permissions & data-scoping rules (fixed in the Oct 2026 patch — re-run `npm run db:seed` after pulling)
`requirePermission` is an exact match (`fee.manage` does NOT imply `fee.read`), so the seed now grants:
- HEAD_CLERK: everything a CLERK has (`fee.read/create/update`, `payment.read/create`) plus the `manage` perms.
- HOD: `attendance.create/update`, `exam.create`, `grade.create/update` (in addition to the manage perms).
- STUDENT: `complaint.read` — and the API scopes it: a student only lists/opens/comments on **their own** complaints, never sees internal comments (404 for others' ids).
- `passwordHash` is no longer returned by `GET /students/:id`, `/students/me` or `GET /staff/:id` (these used `include` on `user`).
- The 3 old `tsc` errors are fixed; backend `npm run typecheck` and frontend `npm run typecheck` are both clean.

### Student data is read-only and own-only
STUDENT can only read their own data. Enforced in the API (not just the UI):
- Attendance: `/attendance/me` only; `/attendance/students/:userId` → 403 for other users; roster, section summary and session endpoints are staff-only.
- Fees: `/finance/invoices` is forced to the student's own invoices, `/finance/invoices/:id` and `/finance/students/:userId` → 404/403 for others.
- Exams: `/exams` lists only published exams of enrolled sections; `/exams/:id` returns only the student's own published result; `/exams/students/:userId/grades` → 403 for others.

### Attendance rules (`backend/src/modules/attendance/attendance.access.ts`)
- ADMIN: any section, any date.
- TEACHER: only sections they are assigned to (`CourseTeacher`); can mark/correct only within the last **7 days** (`EDIT_WINDOW_DAYS`); future dates are rejected.
- HOD: sections they teach **plus every section of courses in their own department**; no date limit (corrects old records for teachers).
- Every mark/edit is written to the audit log (old → new status) and `attendance:updated` is emitted to the section room.
- Frontend mirrors the window: teachers get read-only toggles on old sessions and a `min` date on the mark form.
- Also fixed: combined `from`+`to` filters in the student report, N+1 queries in the section summary, duplicate student ids in a mark request.

---

## Demo data (`backend/prisma/seed-demo.ts`)
`npm run db:seed` = base data (roles, permissions, admin, categories, fee types) **+ demo data**. `SEED_DEMO=false` skips the demo part; it is skipped by default when `NODE_ENV=production` (`SEED_DEMO=true` forces it). Skipped automatically if department `CS` already exists (use `npm run db:reset` for a clean slate). Data is generated relative to today (semester started ~5 weeks ago) with a fixed PRNG, so it is deterministic.

Contents: 2 departments (CS, BA), 3 programs (CS, IT, BBA), 5 semesters, 15 courses, 18 sections with a clash-free timetable, 13 staff, 26 students (24 enrolled + 1 suspended + 1 alumni), ~170 attendance sessions (some students deliberately <75%), exams with published/unpublished results, fee structures + 33 invoices (paid / partial / unpaid / overdue / waived, discounts, instalments, last semester's history), 16 books with copies (issued, overdue, returned with fines, lost/damaged), 7 complaints across all statuses with comments + history, 8 notices (incl. expired + a draft), 10 admission applications across all statuses, notifications and audit samples.

All demo users share the password `Demo@1234`: `hod.cs`, `hod.ba`, `teacher.ayesha|usman|sana|bilal|hamza|maryam`, `headclerk`, `clerk.kamran|hina`, `complaints`, `librarian`, students like `ali.raza`, `omar.farooq` (low attendance), `ahmed.bashir` (sem 3), `saad.chaudhry` (BBA). `admin` / `Admin@1234` is unchanged.
