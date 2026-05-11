# Integration Setup Guide

This guide will help you set up OAuth connections for Zoho CRM and Google Workspace.

---

## 🔷 Zoho CRM Setup

### Step 1: Create a Zoho OAuth Application

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click **"Add Client"** → Select **"Server-based Applications"**
3. Fill in the details:
   - **Client Name**: `Agent Builder Platform`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorized Redirect URIs**: `http://localhost:3001/api/oauth/zoho/callback`
4. Click **"Create"**
5. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

Add these to your `.env` file in the project root:

```env
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REGION=com
```

**Note**: Set `ZOHO_REGION=eu` if your Zoho account is in the EU data center.

### Step 3: Connect in the App

1. Restart your dev server: `npm run dev`
2. Go to **Integrations** page
3. Click **"Connect"** on Zoho CRM
4. Authorize the app in the Zoho consent screen
5. You'll be redirected back with a success message

### Required Scopes
- `ZohoCRM.modules.ALL` - Read/write contacts, leads, deals
- `ZohoCRM.settings.ALL` - Access CRM settings

---

## 📧 Google Workspace Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it: `Agent Builder Platform`
4. Click **"Create"**

### Step 2: Enable APIs

1. In the left menu, go to **"APIs & Services"** → **"Library"**
2. Search and enable these APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Drive API**

### Step 3: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External
   - **App name**: `Agent Builder Platform`
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click **"Save and Continue"**
   - **Scopes**: Skip for now (we'll add them via code)
   - **Test users**: Add your Google account email
   - Click **"Save and Continue"**
4. Back to **"Create OAuth client ID"**:
   - **Application type**: Web application
   - **Name**: `Agent Builder OAuth`
   - **Authorized redirect URIs**: `http://localhost:3001/api/oauth/google/callback`
   - Click **"Create"**
5. Copy the **Client ID** and **Client Secret**

### Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Step 5: Connect in the App

1. Restart your dev server: `npm run dev`
2. Go to **Integrations** page
3. Click **"Connect"** on Google Workspace
4. Sign in with your Google account
5. Grant permissions when prompted
6. You'll be redirected back with a success message

### Required Scopes
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/calendar` - Manage calendar events
- `https://www.googleapis.com/auth/drive.readonly` - Read Drive files

---

## 🔐 Security Notes

- **Never commit** your `.env` file to version control
- OAuth tokens are stored securely in the database
- Tokens are automatically refreshed when they expire
- All API calls happen server-side (tokens never exposed to frontend)

---

## 🐛 Troubleshooting

### "Invalid redirect URI" error
- Make sure the redirect URI in your OAuth app matches exactly: `http://localhost:3001/api/oauth/{provider}/callback`
- No trailing slashes

### "Access denied" or "Unauthorized client"
- Check that your Client ID and Secret are correct in `.env`
- Restart the dev server after changing `.env`

### Google: "This app isn't verified"
- Click **"Advanced"** → **"Go to Agent Builder Platform (unsafe)"**
- This is normal for apps in development/testing mode

### Zoho: "Invalid client" error
- Verify your `ZOHO_REGION` matches your account (com/eu/in/au)
- Check that scopes match exactly

---

## ✅ Testing the Connection

Once connected, test the integration:

1. Go to **Templates** page
2. Use **"New Client Onboarding"** template
3. Click **Execute** and fill in client details
4. Watch the workflow create a real CRM contact and send a real email!

---

## 📞 Need Help?

Check the console logs for detailed error messages:
- Backend: Terminal running `npm run dev`
- Frontend: Browser DevTools Console (F12)
