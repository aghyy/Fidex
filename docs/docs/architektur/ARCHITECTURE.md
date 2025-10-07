# Fidex Authentication Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Port 3000)                     │
│                          Next.js App Router                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /           │  │  /auth/      │  │  /profile    │          │
│  │  (Home)      │  │  signin      │  │  (Protected) │          │
│  │              │  │  signup      │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │          SessionProvider (Client-side)               │        │
│  │          useSession() hook available                 │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                        │
│                          │ HTTP Requests                          │
│                          ▼                                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼─────────────────────────────────────┐
│                          │                                       │
│                 BACKEND (Port 3001)                              │
│                 Next.js API Routes + NextAuth                    │
├──────────────────────────┼─────────────────────────────────────┤
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────┐           │
│  │           middleware.ts (Auth Check)              │           │
│  │           Validates JWT tokens                    │           │
│  └───────────────────────┬──────────────────────────┘           │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────┐           │
│  │              auth.ts (NextAuth Config)            │           │
│  │  ┌──────────────────────────────────────────┐    │           │
│  │  │  Providers:                               │    │           │
│  │  │  - Credentials (Email/Password)           │    │           │
│  │  │  - Google OAuth                           │    │           │
│  │  └──────────────────────────────────────────┘    │           │
│  │  ┌──────────────────────────────────────────┐    │           │
│  │  │  Adapter:                                 │    │           │
│  │  │  - PrismaAdapter                          │    │           │
│  │  └──────────────────────────────────────────┘    │           │
│  │  ┌──────────────────────────────────────────┐    │           │
│  │  │  Session:                                 │    │           │
│  │  │  - Strategy: JWT                          │    │           │
│  │  └──────────────────────────────────────────┘    │           │
│  └───────────────────────┬──────────────────────────┘           │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────┐           │
│  │                 API Routes                        │           │
│  │                                                    │           │
│  │  PUBLIC:                                          │           │
│  │  ├─ /api/auth/[...nextauth]                      │           │
│  │  │  └─ GET, POST (signin, signout, session)      │           │
│  │  └─ /api/auth/register                           │           │
│  │     └─ POST (create user)                        │           │
│  │                                                    │           │
│  │  PROTECTED:                                       │           │
│  │  └─ /api/protected/user                          │           │
│  │     └─ GET (current user info)                   │           │
│  └───────────────────────┬──────────────────────────┘           │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────┐           │
│  │            lib/prisma.ts                          │           │
│  │            Prisma Client Singleton                │           │
│  └───────────────────────┬──────────────────────────┘           │
│                          │                                       │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           │ Database Queries
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tables:                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    User      │  │   Account    │  │   Session    │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ id           │  │ userId       │  │ sessionToken │          │
│  │ email        │  │ provider     │  │ userId       │          │
│  │ password     │  │ providerAcct │  │ expires      │          │
│  │ name         │  │ access_token │  └──────────────┘          │
│  │ image        │  │ refresh_token│                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                   │
│  ┌──────────────────────────────────┐                           │
│  │      VerificationToken           │                           │
│  ├──────────────────────────────────┤                           │
│  │ identifier                       │                           │
│  │ token                            │                           │
│  │ expires                          │                           │
│  └──────────────────────────────────┘                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flows

### 1. User Registration Flow

```
User                Frontend              Backend              Database
 │                     │                     │                     │
 │ Fill signup form    │                     │                     │
 ├────────────────────>│                     │                     │
 │                     │ POST /api/auth/     │                     │
 │                     │      register       │                     │
 │                     ├────────────────────>│                     │
 │                     │                     │ Check if user       │
 │                     │                     │ exists              │
 │                     │                     ├────────────────────>│
 │                     │                     │<────────────────────┤
 │                     │                     │ Hash password       │
 │                     │                     │ (bcrypt)            │
 │                     │                     │                     │
 │                     │                     │ Create user         │
 │                     │                     ├────────────────────>│
 │                     │                     │<────────────────────┤
 │                     │<────────────────────┤                     │
 │                     │ Auto sign in with   │                     │
 │                     │ credentials         │                     │
 │                     ├────────────────────>│                     │
 │                     │ JWT token           │                     │
 │                     │<────────────────────┤                     │
 │ Redirect to home    │                     │                     │
 │<────────────────────┤                     │                     │
 │                     │                     │                     │
```

### 2. Credentials Sign In Flow

```
User                Frontend              Backend              Database
 │                     │                     │                     │
 │ Fill signin form    │                     │                     │
 ├────────────────────>│                     │                     │
 │                     │ signIn("credentials")│                    │
 │                     ├────────────────────>│                     │
 │                     │                     │ Find user by email  │
 │                     │                     ├────────────────────>│
 │                     │                     │<────────────────────┤
 │                     │                     │ Compare password    │
 │                     │                     │ (bcrypt.compare)    │
 │                     │                     │                     │
 │                     │                     │ Generate JWT token  │
 │                     │                     │ with user data      │
 │                     │                     │                     │
 │                     │ Set httpOnly cookie │                     │
 │                     │<────────────────────┤                     │
 │ Redirect to         │                     │                     │
 │ requested page      │                     │                     │
 │<────────────────────┤                     │                     │
 │                     │                     │                     │
```

### 3. OAuth (Google) Sign In Flow

```
User            Frontend       Backend       Google OAuth      Database
 │                 │              │                │               │
 │ Click "Google"  │              │                │               │
 ├────────────────>│              │                │               │
 │                 │ signIn("google")              │               │
 │                 ├─────────────>│                │               │
 │                 │              │ Redirect to    │               │
 │                 │              │ Google         │               │
 │                 │              ├───────────────>│               │
 │                 │              │                │               │
 │ Authorize on Google            │                │               │
 ├───────────────────────────────────────────────>│               │
 │                 │              │ Callback with  │               │
 │                 │              │ auth code      │               │
 │                 │              │<───────────────┤               │
 │                 │              │                │               │
 │                 │              │ Exchange code  │               │
 │                 │              │ for tokens     │               │
 │                 │              ├───────────────>│               │
 │                 │              │<───────────────┤               │
 │                 │              │ Get user info  │               │
 │                 │              ├───────────────>│               │
 │                 │              │<───────────────┤               │
 │                 │              │                │               │
 │                 │              │ Create/update user             │
 │                 │              │ and account                    │
 │                 │              ├───────────────────────────────>│
 │                 │              │<───────────────────────────────┤
 │                 │              │ Create JWT                     │
 │                 │ Set cookie   │                │               │
 │                 │<─────────────┤                │               │
 │ Redirect home   │              │                │               │
 │<────────────────┤              │                │               │
 │                 │              │                │               │
```

### 4. Protected Route Access Flow

```
User              Frontend            Middleware           Backend
 │                   │                    │                   │
 │ Click Profile     │                    │                   │
 ├──────────────────>│                    │                   │
 │                   │ Check session      │                   │
 │                   ├───────────────────>│                   │
 │                   │ (useSession hook)  │                   │
 │                   │                    │                   │
 │                   │ Session valid      │                   │
 │                   │<───────────────────┤                   │
 │                   │                    │                   │
 │                   │ Render profile page│                   │
 │<──────────────────┤                    │                   │
 │                   │                    │                   │
 │                   │ Fetch protected data                   │
 │                   ├───────────────────────────────────────>│
 │                   │ (with cookie)      │                   │
 │                   │                    │ Verify JWT        │
 │                   │                    │ Return user data  │
 │                   │<───────────────────────────────────────┤
 │ Display data      │                    │                   │
 │<──────────────────┤                    │                   │
 │                   │                    │                   │
```

---

## Component Hierarchy

```
App (layout.tsx)
│
├── SessionProvider
│   │
│   └── Page Content
│       │
│       ├── Home (page.tsx)
│       │   ├── UserNav
│       │   │   ├── useSession()
│       │   │   └── Sign In/Out buttons
│       │   └── Content (conditional on auth)
│       │
│       ├── Auth Pages
│       │   ├── SignIn (auth/signin/page.tsx)
│       │   │   ├── Credentials form
│       │   │   └── OAuth buttons
│       │   │
│       │   └── SignUp (auth/signup/page.tsx)
│       │       ├── Registration form
│       │       └── OAuth buttons
│       │
│       └── Profile (profile/page.tsx)
│           ├── useSession() - redirect if not authed
│           ├── Display user info
│           └── Fetch from protected API
```

---

## Data Flow

### Session State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SessionProvider Context                                     │
│  ┌─────────────────────────────────────────────┐            │
│  │  State: { session, status }                 │            │
│  │  - session: User object + metadata          │            │
│  │  - status: "loading" | "authenticated" |    │            │
│  │            "unauthenticated"                 │            │
│  └─────────────────────────────────────────────┘            │
│                    │                                         │
│                    │ Provided via React Context              │
│                    ▼                                         │
│  Components use useSession() hook                            │
│  ┌─────────────────────────────────────────────┐            │
│  │  const { data: session, status } =          │            │
│  │    useSession();                            │            │
│  └─────────────────────────────────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ Fetches session from
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Backend: /api/auth/session                         │
├─────────────────────────────────────────────────────────────┤
│  1. Read JWT from httpOnly cookie                            │
│  2. Verify and decode JWT                                    │
│  3. Return session data                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: HTTPS (Production)                                 │
│  └─> Encrypts all traffic between client and server         │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 2: httpOnly Cookies                                   │
│  └─> JWT stored in cookie not accessible by JavaScript      │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 3: JWT Signature                                      │
│  └─> Tokens signed with NEXTAUTH_SECRET                     │
│      Cannot be tampered with                                │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 4: Middleware Auth Check                              │
│  └─> Validates JWT before allowing route access             │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 5: API Route Auth Check                               │
│  └─> Additional validation in protected endpoints           │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 6: Database                                           │
│  └─> Prisma prevents SQL injection                          │
│      Password hashing with bcrypt                           │
└─────────────────────────────────────────────────────────────┘
```

---

## File Dependencies

```
Backend:
┌─────────────┐
│  auth.ts    │◄─────┬─────────────────────────────┐
└──────┬──────┘      │                             │
       │             │                             │
       │ imports     │ imports                     │ imports
       │             │                             │
       ▼             │                             │
┌─────────────┐      │                      ┌──────────────┐
│ lib/        │      │                      │ middleware.ts│
│ prisma.ts   │◄─────┼──────────────────────┤              │
└──────┬──────┘      │                      └──────────────┘
       │             │
       │             │
       ▼             │
┌─────────────┐      │
│ prisma/     │      │
│ schema.     │      │
│ prisma      │      │
└─────────────┘      │
                     │
       ┌─────────────┴────────────────┐
       │                              │
       ▼                              ▼
┌──────────────┐            ┌──────────────────┐
│ api/auth/    │            │ api/auth/        │
│ [...nextauth]│            │ register/        │
│ /route.ts    │            │ route.ts         │
└──────────────┘            └──────────────────┘
       │                              │
       │ imports                      │ imports
       │                              │
       └───────────┬──────────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ types/      │
            │ next-auth   │
            │ .d.ts       │
            └─────────────┘

Frontend:
┌─────────────┐
│ app/        │
│ layout.tsx  │
└──────┬──────┘
       │ imports
       ▼
┌─────────────────┐
│ components/     │
│ SessionProvider │◄──────┐
└──────┬──────────┘       │
       │ used by          │ imports
       ▼                  │
┌─────────────────┐       │
│ components/     │       │
│ UserNav.tsx     │       │
└─────────────────┘       │
                          │
┌─────────────────┐       │
│ app/page.tsx    ├───────┘
│ app/profile/    │
│ app/auth/*/     │
└─────────────────┘
       │
       │ imports
       ▼
┌─────────────┐
│ types/      │
│ next-auth   │
│ .d.ts       │
└─────────────┘
```

---

## Environment Configuration

```
Development:
┌──────────────────────────────────────┐
│  Frontend (localhost:3000)           │
│  └─> Connects to backend via        │
│      http://localhost:3001           │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Backend (localhost:3001)            │
│  └─> NEXTAUTH_URL=localhost:3001    │
│  └─> Connects to database           │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  PostgreSQL (localhost:5432)         │
└──────────────────────────────────────┘

Production:
┌──────────────────────────────────────┐
│  Frontend (your-domain.com)          │
│  └─> Connects to backend via        │
│      https://api.your-domain.com     │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Backend (api.your-domain.com)       │
│  └─> NEXTAUTH_URL=                   │
│      https://api.your-domain.com     │
│  └─> Connects to database           │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  PostgreSQL (hosted)                 │
└──────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Secure authentication
- ✅ Scalable design
- ✅ Clear separation of concerns
- ✅ Easy to maintain and extend
- ✅ Production-ready

