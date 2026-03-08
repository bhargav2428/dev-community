# DevCommunity 🚀

> **Where Developers Build Together**

DevCommunity is a production-grade social network platform designed for developers to connect, collaborate, and build amazing projects together. Think of it as a combination of GitHub, LinkedIn, Indie Hackers, and Discord - specifically built for the developer community.

![DevCommunity Banner](./docs/banner.png)

## ✨ Features

### 👥 Social Networking
- **Developer Profiles** - Showcase your skills, projects, and contributions
- **Follow System** - Stay updated with developers you admire
- **Activity Feed** - Real-time updates from your network
- **Direct Messaging** - Connect one-on-one or in groups

### 🚀 Projects & Collaboration
- **Project Showcase** - Display your work with rich descriptions
- **Team Formation** - Find co-founders and teammates
- **Task Management** - Built-in project management tools
- **Open Source Hub** - Track and discover contributions

### 💡 Ideas & Startups
- **Idea Sharing** - Post and validate startup ideas
- **AI-Powered Ideas** - Get AI-generated startup suggestions
- **Co-founder Matching** - Find the perfect partner
- **Feedback System** - Get community insights

### 🏆 Events & Growth
- **Hackathons** - Join and host coding events
- **Job Board** - Find developer opportunities
- **Leaderboards** - Compete and earn reputation
- **Badges & Achievements** - Gamified recognition

### 🤖 AI Integration
- **Startup Idea Generator** - AI-powered brainstorming
- **Skill Gap Analysis** - Personalized learning paths
- **Resume Review** - AI feedback on your CV
- **Team Matching** - Smart collaborator suggestions
- **Code Assistant** - Help with coding tasks

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js + Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Real-time:** Socket.io
- **Auth:** JWT + OAuth (GitHub, Google)
- **AI:** OpenAI API

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI:** Shadcn/ui + Radix UI
- **State:** Zustand + TanStack Query
- **Animation:** Framer Motion

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (Frontend) + Railway/AWS (Backend)

## 📁 Project Structure

```
devcommunity/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── prisma/             # Database schema & migrations
│   │   ├── src/
│   │   │   ├── config/         # Configuration
│   │   │   ├── lib/            # Core utilities
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── routes/         # API routes
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # Helpers
│   │   │   └── websocket/      # Real-time handlers
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend Application
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utilities
│       │   ├── store/          # State management
│       │   └── styles/         # Global styles
│       └── Dockerfile
│
├── packages/                   # Shared packages (future)
├── docs/                       # Documentation
├── docker-compose.yml          # Docker orchestration
├── pnpm-workspace.yaml         # Monorepo config
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devcommunity.git
   cd devcommunity
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Configure environment**
   ```bash
   # Backend
   cp apps/api/.env.example apps/api/.env
   
   # Frontend
   cp apps/web/.env.example apps/web/.env
   ```

5. **Setup database**
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed  # Optional: seed with demo data
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - API Docs: http://localhost:3001/api/v1

### Using Docker

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devcommunity

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI
OPENAI_API_KEY=your-openai-api-key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
```

### Frontend Environment Variables

```env
# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📚 API Documentation

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new account |
| `/auth/login` | POST | Sign in |
| `/auth/refresh` | POST | Refresh tokens |
| `/auth/logout` | POST | Sign out |
| `/auth/oauth/:provider` | POST | OAuth sign in |

### Users
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/me` | GET | Get current user |
| `/users/:username` | GET | Get user profile |
| `/users/:id/follow` | POST | Follow user |
| `/users/search` | GET | Search users |
| `/users/suggested` | GET | Get suggestions |

### Projects
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects` | GET/POST | List/Create projects |
| `/projects/:slug` | GET/PATCH | Get/Update project |
| `/projects/:id/team` | POST | Add team member |
| `/projects/trending` | GET | Trending projects |

### Posts
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/posts/feed` | GET | Get feed |
| `/posts` | POST | Create post |
| `/posts/:id` | GET/PATCH | Get/Update post |
| `/posts/:id/like` | POST | Like post |
| `/posts/:id/comments` | GET/POST | Comments |

### AI Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/generate-idea` | POST | Generate startup idea |
| `/ai/skill-gaps` | POST | Analyze skill gaps |
| `/ai/review-resume` | POST | Review resume |
| `/ai/team-matches` | POST | Find team matches |
| `/ai/code-assistant` | POST | Code help |

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## 📦 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy!

### Railway/AWS (Backend)

1. Create PostgreSQL and Redis instances
2. Deploy the API with Docker
3. Configure environment variables
4. Set up SSL and domain

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Vercel](https://vercel.com/) for hosting
- [OpenAI](https://openai.com/) for AI capabilities
- All our amazing contributors!

---

<p align="center">
  Made with ❤️ by the DevCommunity Team
</p>
#   d e v - c o m m u n i t y 
 
 








🔴 SUPER ADMIN (full access to all features):
   Email: superadmin@devconnect.com
   Password: SuperAdmin@123

🟠 ADMIN:
   Email: admin@devconnect.com
   Password: Admin@123

🔵 MODERATOR:
   Email: moderator@devconnect.com
   Password: Moderator@123