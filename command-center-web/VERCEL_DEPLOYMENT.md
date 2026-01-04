# Vercel Deployment Guide for Command Center Web

This guide will help you deploy the `command-center-web` application to Vercel.

## Prerequisites

- Your repository is already on GitHub
- You have a Vercel account (sign up at [vercel.com](https://vercel.com) if needed)

## Deployment Steps

### 1. Connect Your Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"** or **"Import Project"**
3. Select your GitHub repository
4. **IMPORTANT**: In the project settings, set the **Root Directory** to `command-center-web`
   - Click on "Settings" → "General"
   - Under "Root Directory", click "Edit"
   - Select `command-center-web` from the dropdown or type it manually
   - Click "Save"

### 2. Configure Build Settings

The `vercel.json` file is already configured in this directory. It will:
- Build the Firebase package first (`../packages/firebase`)
- Then build the Next.js application
- Automatically detect Next.js framework

**No additional build settings needed** - Vercel will use the `vercel.json` configuration.

### 3. Set Environment Variables

You need to add your Firebase environment variables in Vercel:

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following variables (use the same values from your `.env.local` file):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Make sure to add these for **Production**, **Preview**, and **Development** environments (or select as needed)

### 4. Deploy

1. After setting the root directory and environment variables, click **"Deploy"**
2. Vercel will automatically:
   - Install dependencies for the Firebase package
   - Build the Firebase package
   - Install dependencies for the Next.js app
   - Build the Next.js application
   - Deploy it

### 5. Verify Deployment

Once deployment is complete:
- Your app will be available at `https://your-project-name.vercel.app`
- You can view deployment logs in the Vercel dashboard
- Any future pushes to your GitHub repository will trigger automatic deployments

## Troubleshooting

### Build Fails with "Cannot find module @packages/firebase"

- Make sure the **Root Directory** is set to `command-center-web` in Vercel settings
- Check that the build command in `vercel.json` is correctly building the firebase package first

### Environment Variables Not Working

- Ensure all environment variables start with `NEXT_PUBLIC_` for client-side access
- Verify they're added in the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables

### Build Timeout

- If the build takes too long, you might need to upgrade your Vercel plan
- Check the build logs to see which step is taking the longest

## Next Steps

After successful deployment:
- Set up a custom domain (optional) in Vercel project settings
- Configure automatic deployments from your main branch
- Set up preview deployments for pull requests (enabled by default)

