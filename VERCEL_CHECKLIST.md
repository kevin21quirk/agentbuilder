# ✅ Vercel Deployment Checklist

## Pre-Deployment

- [x] Code pushed to GitHub: https://github.com/kevin21quirk/agentbuilder
- [ ] Neon PostgreSQL database created
- [ ] Database connection string ready

## Vercel Setup

### 1. Import Project
- [ ] Go to https://vercel.com/new
- [ ] Import `kevin21quirk/agentbuilder` from GitHub
- [ ] Framework: **Other**
- [ ] Root Directory: `./`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `client/dist`

### 2. Environment Variables (Required)

Add these in Vercel dashboard:

```env
DATABASE_URL=postgresql://your_neon_connection_string
API_URL=https://your-app-name.vercel.app/api
APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

### 3. Environment Variables (Optional - for OAuth)

Only add if you've set up OAuth apps:

```env
# Zoho CRM
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REGION=com

# Google Workspace
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Stripe
STRIPE_CLIENT_ID=
STRIPE_SECRET_KEY=
```

### 4. Deploy
- [ ] Click **"Deploy"**
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Note your deployment URL

## Post-Deployment

### 5. Update OAuth Redirect URIs

If you added OAuth credentials, update redirect URIs in each provider:

#### Zoho CRM
- [ ] Go to https://api-console.zoho.com/
- [ ] Edit OAuth app
- [ ] Update redirect URI: `https://your-app-name.vercel.app/api/oauth/zoho/callback`

#### Google Workspace
- [ ] Go to https://console.cloud.google.com/apis/credentials
- [ ] Edit OAuth client
- [ ] Update redirect URI: `https://your-app-name.vercel.app/api/oauth/google/callback`

#### Slack
- [ ] Go to https://api.slack.com/apps
- [ ] Edit app → OAuth & Permissions
- [ ] Update redirect URI: `https://your-app-name.vercel.app/api/oauth/slack/callback`

### 6. Test Deployment
- [ ] Visit your Vercel URL
- [ ] Dashboard loads correctly
- [ ] Navigate to all pages (Workflows, Integrations, Tasks, etc.)
- [ ] Test workflow execution
- [ ] Test OAuth connections (if configured)

## Troubleshooting

### Build Fails
1. Check Vercel build logs
2. Verify all dependencies in package.json
3. Check Node version (18+)

### Database Connection Error
1. Verify DATABASE_URL is correct
2. Check Neon database is active
3. Ensure database tables exist

### OAuth Not Working
1. Verify redirect URIs match exactly
2. Check environment variables in Vercel
3. Ensure OAuth apps are not in testing mode

### API Routes 404
1. Check vercel.json routing
2. Verify API_URL environment variable

## Success Criteria

- ✅ App loads at Vercel URL
- ✅ Dashboard displays stats
- ✅ Can create and view workflows
- ✅ Can execute workflows
- ✅ Tasks are created and displayed
- ✅ OAuth integrations connect (if configured)

## Next Steps

1. **Custom Domain** (optional)
   - Add domain in Vercel dashboard
   - Update DNS records
   - Update OAuth redirect URIs

2. **Monitoring**
   - Check Vercel Analytics
   - Monitor function logs
   - Set up error tracking

3. **Continuous Deployment**
   - Push to GitHub → Auto-deploys
   - No manual steps needed

---

**Your app is live! 🎉**

Share it: `https://your-app-name.vercel.app`
