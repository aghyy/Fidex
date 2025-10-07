# Deploying to Vercel

This guide walks you through deploying both the frontend and backend to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your Prisma Accelerate connection string (you already have this)
3. Install Vercel CLI (optional): `npm i -g vercel`

## Architecture

- **Backend**: Deployed as a separate Next.js app (handles API routes, auth, database)
- **Frontend**: Deployed as a separate Next.js app (UI only, calls backend APIs)

---

## Part 1: Deploy Backend (API)

### 1.1 Push Your Code to GitHub (if not already)

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Create Backend Project on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Important**: Set the **Root Directory** to `backend`
4. Framework Preset: Next.js (should auto-detect)
5. **Before clicking Deploy**, configure environment variables:

### 1.3 Configure Backend Environment Variables

Add these in the Vercel project settings:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `DATABASE_URL` | `prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGci...` | Your Prisma Accelerate URL (you already have this) |
| `NEXTAUTH_SECRET` | Generate one: `openssl rand -base64 32` | Run this command locally to generate |
| `NEXTAUTH_URL` | Leave empty for now | Will set after first deploy |
| `FRONTEND_URL` | Leave empty for now | Will set after frontend deploy |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Optional - only if using Google login |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret | Optional - only if using Google login |

**To add environment variables in Vercel:**
- Click "Environment Variables" section
- Add each variable for "Production", "Preview", and "Development" environments
- Click "Deploy"

### 1.4 Update Backend Environment Variables

After the first deployment:

1. Copy your backend URL (e.g., `https://fidex-backend.vercel.app`)
2. Go to: Project Settings → Environment Variables
3. Update these:
   - `NEXTAUTH_URL` = `https://fidex-backend.vercel.app` (your actual backend URL)
4. Redeploy: Deployments → Latest Deployment → ⋯ → Redeploy

---

## Part 2: Deploy Frontend (UI)

### 2.1 Create Frontend Project on Vercel

1. Go to https://vercel.com/new again
2. Import the **same** GitHub repository
3. **Important**: Set the **Root Directory** to `frontend`
4. Framework Preset: Next.js (should auto-detect)
5. Configure environment variables:

### 2.2 Configure Frontend Environment Variables

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://fidex-backend.vercel.app` | Use your actual backend URL from Part 1 |

6. Click "Deploy"

---

## Part 3: Final Backend Configuration

After frontend is deployed:

1. Go to your **backend** Vercel project
2. Settings → Environment Variables
3. Update:
   - `FRONTEND_URL` = `https://fidex-frontend.vercel.app` (your actual frontend URL)
4. Redeploy the backend:
   - Deployments → Latest Deployment → ⋯ → Redeploy

---

## Part 4: Update Google OAuth (If Using)

If you're using Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add to **Authorized redirect URIs**:
   ```
   https://your-backend-url.vercel.app/api/auth/callback/google
   ```
5. Add to **Authorized JavaScript origins**:
   ```
   https://your-frontend-url.vercel.app
   https://your-backend-url.vercel.app
   ```

---

## Testing Your Deployment

1. Visit your frontend URL: `https://your-frontend-url.vercel.app`
2. Try signing up / signing in
3. Check Vercel logs if you encounter errors:
   - Go to your project → Deployments → Click deployment → Functions tab

---

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` is set correctly in backend environment variables
- Redeploy backend after changing environment variables

### Database Connection Errors
- Verify `DATABASE_URL` is the Prisma Accelerate URL (starts with `prisma+postgres://`)
- Check Prisma Accelerate dashboard for connection issues

### NextAuth Errors
- Ensure `NEXTAUTH_URL` matches your backend URL exactly
- Ensure `NEXTAUTH_SECRET` is set and is at least 32 characters
- Check that Google OAuth credentials are correct (if using)

### Build Errors
- Check build logs in Vercel deployment details
- Ensure all dependencies are in `package.json`
- Try running `npm run build` locally first

---

## Local Development After Deployment

Update your local environment files:

**backend/.env.local:**
```bash
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
```

**frontend/.env.local:**
```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
```

---

## Useful Commands

```bash
# Generate a new NextAuth secret
openssl rand -base64 32

# Deploy using Vercel CLI
cd backend
vercel

cd ../frontend
vercel

# View logs
vercel logs <deployment-url>
```

---

## Summary

✅ Backend deployed with database, auth, and API routes  
✅ Frontend deployed with UI  
✅ Environment variables configured for both  
✅ CORS configured to allow frontend → backend communication  
✅ Google OAuth configured (if applicable)

Your app is now live! 🎉

