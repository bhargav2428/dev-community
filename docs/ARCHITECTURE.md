# DevConnect - Developer Social Network
## System Architecture Documentation

---

## 🏗️ HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                  │
│                           (Nginx / AWS ALB)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Web Client    │       │  Mobile Client  │       │   Admin Pan   el   │
│   (Next.js)     │       │   (React PWA)   │       │   (Next.js)     │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│                         (Express.js + Rate Limiting)                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Authentication │ Rate Limiting │ Request Logging │ Load Balancing  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────────────┐
         │                           │                           │       │
         ▼                           ▼                           ▼       ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐  ┌──────┐
│    Auth       │         │   User        │         │   Project     │  │ More │
│   Service     │         │   Service     │         │   Service     │  │  ... │
└───────────────┘         └───────────────┘         └───────────────┘  └──────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE BROKER                                   │
│                          (Redis Pub/Sub / BullMQ)                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├──────────────┬──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐
│ Notification │ │    Email     │ │   AI/ML      │ │  Analytics   │ │  Search  │
│   Worker     │ │   Worker     │ │   Worker     │ │   Worker     │ │  Worker  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │Elasticsearch │  │   AWS S3     │    │
│  │  (Primary)   │  │   (Cache)    │  │   (Search)   │  │  (Storage)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 SERVICE BREAKDOWN

### Core Services

| Service | Responsibility | Technology |
|---------|---------------|------------|
| **API Gateway** | Request routing, auth, rate limiting | Express.js |
| **Auth Service** | Authentication, OAuth, JWT, 2FA | Passport.js, JWT |
| **User Service** | Profiles, skills, reputation | Express.js |
| **Project Service** | Project CRUD, collaboration | Express.js |
| **Feed Service** | Posts, comments, likes | Express.js |
| **Messaging Service** | DM, team chat | Socket.io |
| **Notification Service** | Push, email, in-app | BullMQ |
| **Search Service** | Full-text search | Elasticsearch |
| **AI Service** | Recommendations, matching | OpenAI API |
| **File Service** | Media uploads | AWS S3 |

### Background Workers

| Worker | Purpose |
|--------|---------|
| **EmailWorker** | Send transactional emails |
| **NotificationWorker** | Process notification queue |
| **AIWorker** | Process AI recommendations |
| **AnalyticsWorker** | Aggregate analytics data |
| **SearchIndexWorker** | Index content for search |

---

## 📊 DATA FLOW

### Authentication Flow
```
User → Login Request → API Gateway → Auth Service → Validate Credentials
                                           ↓
                              Generate JWT + Refresh Token
                                           ↓
                              Store Session in Redis
                                           ↓
                              Return Tokens to Client
```

### Post Creation Flow
```
User → Create Post → API Gateway → Auth Middleware → Feed Service
                                                          ↓
                                              Save to PostgreSQL
                                                          ↓
                                         Queue for Search Indexing
                                                          ↓
                                    Trigger Notification to Followers
                                                          ↓
                                      Broadcast via WebSocket (Real-time)
```

### AI Matching Flow
```
User Request → API Gateway → AI Service → Fetch User Profile
                                               ↓
                                    Call OpenAI Embeddings API
                                               ↓
                                  Vector Similarity Search
                                               ↓
                                    Return Matched Results
```

---

## 🗄️ DATABASE ARCHITECTURE

### Primary Database: PostgreSQL
- **Purpose**: ACID-compliant storage for all relational data
- **Scaling**: Read replicas, connection pooling (PgBouncer)

### Cache Layer: Redis
- **Purpose**: Session storage, caching, pub/sub
- **Data**: User sessions, API cache, real-time presence

### Search Engine: Elasticsearch
- **Purpose**: Full-text search, fuzzy matching
- **Indexed**: Users, projects, posts, jobs

### Object Storage: AWS S3
- **Purpose**: Media files, avatars, documents
- **CDN**: CloudFront for global distribution

---

## 🔐 SECURITY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: WAF (Web Application Firewall)                        │
│ Layer 2: DDoS Protection (AWS Shield / Cloudflare)             │
│ Layer 3: Rate Limiting (Redis-based)                           │
│ Layer 4: Authentication (JWT + OAuth 2.0)                      │
│ Layer 5: Authorization (RBAC)                                  │
│ Layer 6: Input Validation (Zod schemas)                        │
│ Layer 7: Input Validation (handled in code)                    │
│ Layer 8: XSS Protection (Content Security Policy)              │
│ Layer 9: Data Encryption (AES-256, TLS 1.3)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 FOLDER STRUCTURE

```
devconnect/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── stores/         # State management
│   │   │   └── types/          # TypeScript types
│   │   └── public/
│   │
│   └── api/                    # Express.js backend
│       ├── src/
│       │   ├── config/         # Configuration
│       │   ├── controllers/    # Route handlers
│       │   ├── middleware/     # Express middleware
│       │   ├── models/         # (removed, now using MongoDB)
│       │   ├── repositories/   # Data access layer
│       │   ├── services/       # Business logic
│       │   ├── routes/         # API routes
│       │   ├── workers/        # Background jobs
│       │   ├── websocket/      # Socket.io handlers
│       │   └── utils/          # Helper functions
│       └── (prisma/ removed)
│
├── packages/
│   ├── shared/                 # Shared types & utils
│   ├── ui/                     # Shared UI components
│   └── config/                 # Shared configs
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── infra/                      # Infrastructure as code
│   ├── terraform/
│   └── kubernetes/
│
└── docs/                       # Documentation
```

---

## 🚀 SCALABILITY STRATEGY

### Horizontal Scaling
- Stateless API servers behind load balancer
- Redis for session storage (shared state)
- Database read replicas for read-heavy operations

### Caching Strategy
```
User Request → Check Redis Cache → Hit? Return cached
                       ↓ Miss
              Query PostgreSQL → Store in Redis → Return
```

### Performance Optimizations
- Database connection pooling
- Query optimization with indexes
- Lazy loading on frontend
- Image optimization (WebP, CDN)
- API response compression
- GraphQL for complex queries (future)

---

## 📈 MONITORING & OBSERVABILITY

| Tool | Purpose |
|------|---------|
| **Prometheus** | Metrics collection |
| **Grafana** | Visualization |
| **Sentry** | Error tracking |
| **Winston** | Structured logging |
| **DataDog/NewRelic** | APM |

---

## 🔄 CI/CD PIPELINE

```
Code Push → GitHub Actions → Lint & Type Check → Unit Tests
                                    ↓
                        Integration Tests → Build
                                    ↓
                    Security Scan → Docker Build
                                    ↓
                    Push to Registry → Deploy to Staging
                                    ↓
                        E2E Tests → Deploy to Production
```

---

## 🎯 TECHNOLOGY DECISIONS

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Frontend** | Next.js 14 | SSR, App Router, great DX |
| **Backend** | Express.js | Flexibility, large ecosystem |
| **Database** | PostgreSQL | ACID, JSON support, extensions |
| **Database** | MongoDB (native driver) | Flexible, scalable |
| **Cache** | Redis | Speed, pub/sub, sessions |
| **Search** | Elasticsearch | Full-text, fuzzy matching |
| **Storage** | AWS S3 | Scalable, cost-effective |
| **AI** | OpenAI | State-of-the-art models |
| **Real-time** | Socket.io | WebSocket with fallbacks |
| **Queue** | BullMQ | Redis-based, reliable |

