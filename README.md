# 🚀 AppForge — Config-Driven App Generator

A full-stack system that converts structured JSON configurations into fully working web applications (frontend + backend + database) — like a mini Base44.

## ✨ Features Implemented

| Feature | Status |
|---------|--------|
| JSON → Dynamic UI (forms, tables, dashboards) | ✅ |
| JSON → Backend APIs (CRUD) | ✅ |
| PostgreSQL dynamic data storage | ✅ |
| Firebase Auth (Google + GitHub OAuth) | ✅ |
| Email/password authentication | ✅ |
| Multi-language / i18n (EN, HI, ES) | ✅ |
| CSV Import (upload → map → store) | ✅ |
| Export to GitHub repository | ✅ |
| In-app + email notifications | ✅ |
| Responsive mobile-ready UI | ✅ |
| Config sanitizer (handles incomplete/broken configs) | ✅ |
| Rate limiting, helmet, compression | ✅ |
| Docker deployment | ✅ |

---

## 🗂️ Project Structure

```
appforge/
├── backend/               # Node.js + TypeScript + Express
│   ├── src/
│   │   ├── config/        # Firebase admin init
│   │   ├── db/            # PostgreSQL pool + migrations
│   │   ├── middleware/    # JWT + Firebase auth middleware
│   │   ├── routes/        # auth, apps, data, csv, notifications, export
│   │   ├── services/      # schemaService, emailService
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # configValidator (handles broken configs)
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── renderer/  # DynamicForm, DynamicTable, DynamicDashboard, AppPreview
│   │   │   ├── layout/    # SidebarLayout
│   │   │   └── ...        # NotificationBell, CsvImporter
│   │   ├── contexts/      # AuthContext (JWT + Firebase)
│   │   ├── i18n/          # i18next (EN, HI, ES)
│   │   ├── lib/           # api.ts (axios), firebase.ts
│   │   └── pages/         # Login, Dashboard, AppBuilder, Notifications, Settings
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)

### Option A: Docker (Recommended)

```bash
# 1. Copy and fill env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit backend/.env with your API keys (see below)

# 3. Start everything
docker-compose up -d

# App runs at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# API docs: http://localhost:4000/health
```

### Option B: Manual

```bash
# --- PostgreSQL ---
# Create a database named "appforge"

# --- Backend ---
cd backend
npm install
cp .env.example .env
# Fill in .env values (see below)
npm run dev        # runs on :4000

# --- Frontend ---
cd frontend
npm install
cp .env.example .env
# Fill in .env values (see below)
npm run dev        # runs on :3000
```

---

## 🔑 API Keys You Need to Add

### 1. PostgreSQL (`backend/.env`)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/appforge
# OR individual fields:
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=appforge
```

### 2. JWT Secret (`backend/.env`)
```env
JWT_SECRET=any_long_random_string_here_minimum_32_chars
```

### 3. Firebase Admin SDK (`backend/.env`)
> Go to: Firebase Console → Project Settings → Service Accounts → Generate new private key

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
```

### 4. Firebase Web SDK (`frontend/.env`)
> Go to: Firebase Console → Project Settings → Your Apps → Web App

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

> **Note:** Enable Google and GitHub providers in Firebase Console → Authentication → Sign-in method

### 5. Email (`backend/.env`) — Optional
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password      # Gmail: use App Password, not account password
EMAIL_FROM=AppForge <your@gmail.com>
```

### 6. GitHub Export (`backend/.env`) — Optional
```env
GITHUB_TOKEN=ghp_your_personal_access_token    # needs "repo" scope
```
> Go to: GitHub → Settings → Developer Settings → Personal Access Tokens → Classic

---

## 📋 Example App Config

Paste this into the App Builder to generate a Task Manager:

```json
{
  "name": "Task Manager",
  "description": "A simple task management app",
  "auth": { "enabled": true, "methods": ["email", "google"] },
  "ui": {
    "layout": "sidebar",
    "pages": [
      {
        "id": "tasks",
        "name": "Tasks",
        "path": "/tasks",
        "components": [
          {
            "id": "form1",
            "type": "form",
            "title": "Add Task",
            "dataSource": "tasks",
            "fields": [
              { "name": "title", "label": "Title", "type": "text", "required": true },
              { "name": "priority", "label": "Priority", "type": "select",
                "options": [{"label":"Low","value":"low"},{"label":"High","value":"high"}] },
              { "name": "due_date", "label": "Due Date", "type": "date" }
            ]
          },
          {
            "id": "table1",
            "type": "table",
            "title": "All Tasks",
            "dataSource": "tasks",
            "columns": [
              {"key":"title","label":"Title","sortable":true},
              {"key":"priority","label":"Priority"},
              {"key":"due_date","label":"Due Date","sortable":true},
              {"key":"created_at","label":"Created"}
            ]
          }
        ]
      },
      {
        "id": "analytics",
        "name": "Analytics",
        "path": "/analytics",
        "components": [
          { "id": "dash1", "type": "dashboard", "title": "Overview", "dataSource": "tasks" }
        ]
      }
    ]
  }
}
```

---

## 🧪 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Email/password register |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/firebase` | Firebase OAuth (Google/GitHub) |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |

### Apps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/apps` | Create app from JSON config |
| GET | `/api/apps` | List user's apps |
| GET | `/api/apps/:id` | Get app config |
| PUT | `/api/apps/:id` | Update app config |
| DELETE | `/api/apps/:id` | Delete app |

### Dynamic Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apps/:id/data/:table` | List records |
| POST | `/api/apps/:id/data/:table` | Create record |
| PUT | `/api/apps/:id/data/:table/:recordId` | Update record |
| DELETE | `/api/apps/:id/data/:table/:recordId` | Delete record |
| POST | `/api/apps/:id/data/:table/bulk` | Bulk insert |

### CSV Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/apps/:id/csv/upload` | Parse CSV, get headers + preview |
| POST | `/api/apps/:id/csv/import` | Import CSV with column mapping |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/apps/:id/export/github` | Export to GitHub repo |
| GET | `/api/apps/:id/export/structure` | Get generated file structure |

---

## 🏗️ Architecture Decisions

- **JSONB storage**: Dynamic data stored as JSONB in PostgreSQL `app_data` table — avoids schema migration per app while keeping PostgreSQL performance
- **Config sanitizer**: All incoming configs are sanitized — missing fields get defaults, invalid types are corrected, partial configs still work
- **Dual auth**: JWT for API calls + Firebase token verification for OAuth — both flow into the same user table
- **No hardcoding**: The UI renderer maps `component.type` → React component dynamically — new types can be added in one place

---

## 🚀 Deployment

The app is Docker-ready. For production:

1. Set `NODE_ENV=production` in backend
2. Change all default secrets in docker-compose.yml
3. Use a managed PostgreSQL (e.g., Railway, Supabase, Neon)
4. Deploy to Railway, Render, Fly.io, or any Docker host

---

Built for the AppForge Full Stack Developer Internship Demo Task.
