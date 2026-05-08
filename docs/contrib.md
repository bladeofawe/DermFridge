# Contributing Guide

Before you start, make sure you have the following installed on your machine:

- **Git**: [Download here](https://git-scm.com/)
- **Docker & Docker Compose**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop) (includes both Docker and Docker Compose)
- **Visual Studio Code (VSCode)**: [Download here](https://code.visualstudio.com/)

Run these commands in your terminal to verify installation:

```bash
git --version
docker --version
docker compose version
code --version
```

If all commands return version numbers, you're ready to go!

### 1. Clone the Repository

```bash
git clone <url>
cd cse_406
```

### 2. Launch the Development Environment

The entire application (backend + frontend + database) runs in Docker containers with a single command:

```bash
docker compose -f docker-compose.dev.yml up --build
```

**What this command does:**
- Builds Docker images for the backend and frontend
- Starts containers for the API, React app, and database
- Mounts local files, so your changes are reflected instantly
- Exposes services on specific ports

### 3. Access the Application

Once the containers are running, open your browser and navigate to:

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`

### 4. Stop the Environment

To stop all containers:

```bash
docker compose -f docker-compose.dev.yml down
```

---

## Project Structure

```
cse_406/
├── back/                          # Backend (FastAPI)
│   ├── main.py                    # Main API entry point
│   ├── models.py                  # SQLAlchemy database models
│   ├── schemas.py                 # Pydantic request/response schemas
│   ├── db.py                      # Database configuration
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile.dev             # Docker image for backend development
│
├── front/                         # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── app.tsx                # Main React component
│   │   ├── main.tsx               # React entry point
│   │   ├── pages/
│   │   │   └── home.tsx           # Home page component
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Authentication state management
│   │   └── components/            # Reusable UI components
│   ├── Dockerfile.dev             # Docker image for frontend development
│   └── package.json               # Node dependencies
│
├── docker-compose.dev.yml         # Defines all services (API, React, DB)
├── docs/
│   ├── contrib.md                 # This file
│   ├── gantt.xlsx                 # Project timeline
│   └── main.tex                   # LaTeX documentation
└── README.md                      # Project overview
```

---

## Key Files Explained

### Backend

#### `back/main.py`

This is the **entry point of the FastAPI application**. It contains:

- **API routes** for user authentication, registration, and management
- **Middleware configuration** (CORS, rate limiting)
- **JWT token creation and validation** for secure authentication
- **Error handlers**

Key endpoints:
- `POST /auth/login` - User login (rate limited to 5 requests/minute)
- `POST /users/` - User registration
- `GET /users/me` - Retrieve current user info
- `POST /auth/logout` - User logout

The app uses **cookies** to store JWT tokens securely (httponly, secure, samesite flags).

#### `back/models.py`

Defines the **database structure** using SQLAlchemy ORM:

- `User` model with fields: `id`, `name`, `email`, `language`, `hashed_password`, `created_at`, `updated_at`
- Timestamps are automatically managed by the database

#### `back/schemas.py`

Contains **Pydantic schemas** for request/response validation:

- `UserCreate` - Validation for signup (email, password, name, language)
- `UserResponse` - User info returned to frontend
- `LoginRequest` - Login credentials validation
- `TokenResponse` - JWT token + user data after successful login

These schemas ensure data integrity and provide automatic documentation.

### Frontend

#### `front/src/main.tsx`

The **React entry point**. It:

- Mounts the React app to the DOM
- Wraps the app with providers (Router, AuthProvider, i18n, etc.)
- Sets up global configuration

#### `front/src/pages/home.tsx`

The **home page component** displayed after login. Features include:

- **Statistics dashboard** showing scans, items, recommendations, and alerts
- **Main action cards** for "Face Scan" and "Inventory" features
- **Settings modal** with sections for dietary preferences, notifications, language, and privacy
- **Multi-language support** (English/Korean) via react-i18next
- **Language toggle button** in the header
- **Logout functionality**

This component demonstrates:
- Component state management (`useState`)
- Navigation (`useNavigate`)
- Context usage (`useAuth`)
- Responsive design (grid layouts, Tailwind CSS)
- Lucide React icons

#### `front/src/context/AuthContext.tsx`

Manages **global authentication state** using React Context API:

**Key Features:**
- `user` state - Holds authenticated user data (id, email, language)
- `loading` state - Tracks authentication check status during app startup
- `login()` - Authenticates user and stores JWT cookie
- `signup()` - Registers new user and auto-logs them in
- `logout()` - Clears user state and calls logout API
- `forgotPassword()` & `resetPassword()` - Password recovery flow

**How it works:**
1. When the app loads, `checkAuth()` verifies if user is already logged in
2. If JWT cookie exists, it fetches user data from `GET /users/me`
3. `useAuth()` hook provides context to any component
4. API calls include `credentials: "include"` to send cookies automatically

---

## Git Workflow

### Branch Naming Convention

We use a feature-branch workflow with semantic naming:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/feature-name` | `feature/user-authentication` |
| Bug Fix | `bugfix/bug-name` | `bugfix/login-error` |
| Hotfix | `hotfix/hotfix-name` | `hotfix/database-connection` |
| Release | `release/v1.0.0` | `release/v1.0.0` |

**Main branches (protected):**
- `main` - Production-ready code
- `develop` - Integration branch for features

### Workflow Steps

1. **Create a new branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit regularly

3. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request (PR)** on GitHub/GitLab

5. **After approval**, merge to `develop` and eventually to `main`

### Commit Message Format

Follow the **Conventional Commits** format for clear commit history:

```
<type>: <short description>

<optional detailed explanation>
```

**Common types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `docs:` - Documentation update
- `style:` - Code formatting (no functional change)
- `test:` - Adding or updating tests
- `chore:` - Build, dependencies, tooling

**Examples:**

```bash
git commit -m "feat: add email verification on signup"
git commit -m "fix: correct JWT expiration logic"
git commit -m "refactor: simplify authentication flow"
git commit -m "docs: update API documentation"
```

---

## Code Standards

### Python (Backend)

### TypeScript/React (Frontend)

---

## Common Development Tasks

### Viewing Logs

You can view the logs in Docker Desktop by clicking on the front or back container, this allows you to see execution errors in your code.

### Rebuilding Containers

If you change dependencies or Dockerfiles:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Accessing the Database

If you need to query the database directly:

```bash
docker exec -it cse_406-db-1 psql -U user -d mydb
```

---

## Summary Checklist

Before committing your work:

- [ ] Code follows naming conventions (snake_case for Python, camelCase for TypeScript)
- [ ] All `console.log()` statements removed (except intentional debug logs)
- [ ] No hardcoded strings (use i18n for user-facing text)
- [ ] Type hints added (Python) and TypeScript types defined
- [ ] Comments are clear and in English
- [ ] Unused imports removed
- [ ] No commented-out code left behind
- [ ] Commit message follows conventional commit format
- [ ] Branch name follows the naming convention

Happy coding! 🚀