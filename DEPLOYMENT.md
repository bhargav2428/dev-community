curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh# DevConnect Deployment Guide

Complete deployment guide for deploying DevConnect to production using **Vercel (Frontend) + Render (Backend)**.

## Prerequisites

- GitHub account with the repository pushed
- [Vercel account](https://vercel.com) (free tier available)
- [Render account](https://render.com) (free tier available)
- MongoDB Atlas database (already configured)
- Redis Labs instance (optional, already configured)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel         │────▶│  Render         │────▶│  MongoDB Atlas  │
│  (Frontend)     │     │  (Backend API)  │     │  (Database)     │
│                 │     │                 │     │                 │
└─────────────────┘     └───────┬─────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Redis Labs    │
                        │   (Optional)    │
                        └─────────────────┘
```

---

## Step 1: Deploy Backend to Render

### 1.1 Create Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `dev-comunity` repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `devcommunity-api` |
| **Region** | Ohio (or closest to you) |
| **Branch** | `main` |
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | Free (or Starter for production) |

### 1.2 Add Environment Variables

In Render dashboard → Environment tab, add these variables:

```env
# Required
NODE_ENV=production
PORT=4000

# Database (MongoDB Atlas)
DATABASE_URL=mongodb+srv://bhargavyaswanth:yaswanth@cluster0.6jjztss.mongodb.net/devconnect

# Redis (optional - Redis Labs)
REDIS_URL=redis://default:A13n0wz6AzOCRbDUDwNMgxiY0LNxJ5gj@redis-17686.crce219.us-east-1-4.ec2.cloud.redislabs.com:17686

# JWT Secrets (click "Generate" for secure values)
JWT_SECRET=<click-generate>
JWT_REFRESH_SECRET=<click-generate>
SESSION_SECRET=<click-generate>

# Token Expiry
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (update after Vercel deployment)
CLIENT_URL=https://your-app.vercel.app

# This backend URL (update after deploy)
API_URL=https://devcommunity-api.onrender.com

# Feature Flags
ENABLE_REDIS=true
ENABLE_OAUTH=false
ENABLE_EMAIL=false
ENABLE_S3=false
ENABLE_OPENAI=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 1.3 Deploy

Click **"Create Web Service"** and wait for the build (takes 5-10 minutes).

Your API URL will be: `https://devcommunity-api.onrender.com`

> ⚠️ **Note:** Render free tier sleeps after 15 mins of inactivity. First request may take 30-60 seconds to wake up.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your `dev-comunity` repository

### 2.2 Configure Build Settings

Vercel should auto-detect from `vercel.json`. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (root of monorepo)
- **Build Command**: `pnpm --filter @devcommunity/web build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install`

### 2.3 Add Environment Variables

In the Vercel project settings → Environment Variables:

```env
# Required
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://devcommunity-api.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=https://devcommunity-api.onrender.com

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-min-32-characters-here
```

### 2.4 Deploy

Click **"Deploy"** and wait for the build to complete.

---

## Step 3: Post-Deployment Configuration

### 3.1 Update CORS Settings

After getting your final URLs, update environment variables:

**On Render (Backend):**
```env
CLIENT_URL=https://your-app.vercel.app
```

**On Vercel (Frontend):**
```env
NEXT_PUBLIC_API_URL=https://devcommunity-api.onrender.com/api/v1
```

### 3.2 Initialize Database (Optional)

If you need to seed the database with demo data:

1. Clone the repo locally
2. Set `DATABASE_URL` in `apps/api/.env` to your production MongoDB
3. Run: `cd apps/api && pnpm db:seed`

### 3.3 Verify Health Endpoint

Test that your API is running:
```bash
curl https://devcommunity-api.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "environment": "production"
}
```

---

## Default Login Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@devconnect.com | SuperAdmin@123 |
| Admin | admin@devconnect.com | Admin@123 |
| Moderator | moderator@devconnect.com | Moderator@123 |
| User | john@example.com | Demo@123 |
| User | jane@example.com | Demo@123 |

---

## Troubleshooting

### Build Fails on Render

1. Check that `Root Directory` is set to `apps/api`
2. Verify all environment variables are set
3. Check Render logs for specific errors
4. Make sure build command includes `npx prisma generate`

### Build Fails on Vercel

1. Ensure `pnpm` is available (Vercel supports it natively)
2. Check that `vercel.json` matches your project structure
3. Review build logs for missing dependencies

### API Connection Issues

1. Verify CORS: `CLIENT_URL` must match your Vercel domain exactly
2. Check `NEXT_PUBLIC_API_URL` includes `/api/v1` path
3. Ensure Render service is running (check health endpoint)
4. Remember: Render free tier sleeps after 15 mins - first request takes 30-60s

### Database Connection Issues

1. Verify MongoDB Atlas allows connections from anywhere
2. In MongoDB Atlas → Network Access → Add IP: `0.0.0.0/0` (for Render)
3. Check `DATABASE_URL` format is correct

---

## Optional: Custom Domain

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown

### Render (Backend)
1. Go to Service Settings → Custom Domains
2. Add custom domain
3. Configure DNS records as shown

---

## Environment Variable Reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Server port (usually 4000) |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (32+ chars) |
| `SESSION_SECRET` | Yes | Session secret (32+ chars) |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `API_URL` | Yes | Backend URL |
| `REDIS_URL` | No | Redis connection string |
| `ENABLE_REDIS` | No | Enable Redis caching |
| `ENABLE_OAUTH` | No | Enable OAuth providers |
| `ENABLE_EMAIL` | No | Enable email sending |
| `ENABLE_S3` | No | Enable S3 file uploads |
| `ENABLE_OPENAI` | No | Enable AI features |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL with `/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket URL (same as backend) |
| `NEXTAUTH_URL` | Yes | NextAuth callback URL |
| `NEXTAUTH_SECRET` | Yes | NextAuth secret (32+ chars) |

---

## Security Checklist

- [ ] All secrets are unique and 32+ characters
- [ ] MongoDB Atlas has Network Access configured
- [ ] Redis has authentication enabled
- [ ] `NODE_ENV` is set to `production`
- [ ] CORS is properly configured
- [ ] HTTPS is enforced on all domains

---

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review Render and Vercel documentation
- Check MongoDB Atlas status page
