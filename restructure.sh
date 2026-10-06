#!/usr/bin/env bash
# Restructure cms repo: root => backend/ + frontend/ only.
# Run from the repo ROOT (the folder that currently contains backend/apps/api).
set -euo pipefail

if [ ! -d backend/apps/api ] || [ ! -d backend/apps/web ]; then
  echo "❌ backend/apps/api ya backend/apps/web nahi mila. Repo root se run kar."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working tree clean nahi hai. Pehle commit/stash kar le."
  exit 1
fi

shopt -s dotglob

echo "→ moving folders..."
mv backend _old
mkdir backend frontend
mv _old/apps/api/* backend/
mv _old/apps/web/* frontend/

echo "→ moving validators -> frontend/lib/validators ..."
mkdir -p frontend/lib/validators
mv _old/packages/validators/src/* frontend/lib/validators/

echo "→ removing monorepo leftovers (turbo, workspace package.json, lockfiles, old node_modules)..."
rm -rf _old backend/node_modules frontend/node_modules frontend/.next

echo "→ writing .gitignore files..."
cat > backend/.gitignore <<'EOF'
node_modules/
dist/
.env
.env.*
!.env.example
logs/
*.log
npm-debug.log*
uploads/
prisma/migrations/*.db
*.tsbuildinfo
.DS_Store
Thumbs.db
.vscode/
.idea/
EOF

cat > frontend/.gitignore <<'EOF'
node_modules/
.next/
out/
build/
.env
.env.local
.env.*.local
!.env.example
*.log
npm-debug.log*
*.tsbuildinfo
next-env.d.ts
.DS_Store
Thumbs.db
.vscode/
.idea/
EOF

echo "→ renaming packages..."
sed -i.bak 's/"name": "api"/"name": "cms-backend"/' backend/package.json && rm backend/package.json.bak
sed -i.bak 's/"name": "web"/"name": "cms-frontend"/' frontend/package.json && rm frontend/package.json.bak

echo "→ writing README.md..."
cat > README.md <<'EOF'
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
EOF

echo "→ installing deps (fresh lockfiles)..."
(cd backend && npm install --no-audit --no-fund)
(cd frontend && npm install --no-audit --no-fund)

echo "→ committing..."
git add -A
git commit -m "refactor: restructure repo into backend/ and frontend/"

echo "✅ Done. Commit ho gaya hai, push tu khud kar: git push"
