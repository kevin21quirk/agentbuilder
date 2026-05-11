# 🚀 Deployment Guide - Vercel

This guide will help you deploy the Agent Builder Platform to Vercel.

---

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- PostgreSQL database (Neon recommended: https://neon.tech)

---

## Step 1: Push to GitHub

Your code is ready to push. Run these commands:

```bash
cd "c:\Users\kevin\CascadeProjects\Agent Builder"
git init
git add .
git commit -m "Initial commit: Agent Builder Platform"
git branch -M main
git remote add origin https://github.com/kevin21quirk/agentbuilder.git
git push -u origin main
```

---

## Step 2: Set Up Database (Neon)

1. Go to https://neon.tech and sign up/login
2. Create a new project: **"Agent Builder"**
3. Copy the connection string (starts with `postgresql://`)
4. Keep this handy for Vercel environment variables

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repo: `kevin21quirk/agentbuilder`
4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install`

5. Click **"Environment Variables"** and add:

```env
DATABASE_URL=postgresql://your_neon_connection_string
API_URL=https://your-app-name.vercel.app/api
APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

6. (Optional) Add OAuth credentials if you've set them up:
```env
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_secret
ZOHO_REGION=com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_secret
```

7. Click **"Deploy"**

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts and add environment variables when asked.

---

## Step 4: Update OAuth Redirect URIs

Once deployed, update your OAuth app redirect URIs:

### Zoho CRM
1. Go to https://api-console.zoho.com/
2. Edit your OAuth app
3. Update redirect URI to: `https://your-app-name.vercel.app/api/oauth/zoho/callback`

### Google Workspace
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth client
3. Update redirect URI to: `https://your-app-name.vercel.app/api/oauth/google/callback`

### Slack
1. Go to https://api.slack.com/apps
2. Edit your app → OAuth & Permissions
3. Update redirect URI to: `https://your-app-name.vercel.app/api/oauth/slack/callback`

---

## Step 5: Verify Deployment

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Check that the dashboard loads
3. Go to **Integrations** page
4. Test OAuth connections (if configured)
5. Create a workflow and execute it

---

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `API_URL` - Your Vercel app URL + `/api`
- `APP_URL` - Your Vercel app URL

### Optional (for integrations)
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REGION`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `STRIPE_CLIENT_ID`, `STRIPE_SECRET_KEY`

---

## Troubleshooting

### Build fails
- Check that all dependencies are in `package.json`
- Verify Node version (should be 18+)
- Check build logs in Vercel dashboard

### Database connection fails
- Verify `DATABASE_URL` is correct
- Check that Neon database is active
- Ensure database tables are created (run migrations if needed)

### OAuth not working
- Verify redirect URIs match exactly (no trailing slashes)
- Check that environment variables are set in Vercel
- Ensure OAuth apps are in production mode (not testing)

### API routes 404
- Check `vercel.json` routing configuration
- Verify `API_URL` environment variable is correct

---

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed
5. Update OAuth redirect URIs to use custom domain

---

## Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push
```

Your app will rebuild and redeploy automatically!

---

## Monitoring

- **Vercel Dashboard**: View deployment logs, analytics, and errors
- **Database**: Monitor queries in Neon dashboard
- **Logs**: Check Vercel function logs for API errors

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- GitHub Issues: https://github.com/kevin21quirk/agentbuilder/issues
