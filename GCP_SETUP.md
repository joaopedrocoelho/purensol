# Quick GCP Setup Guide

This is a condensed guide to get your Google Forms API working quickly.

## Step-by-Step Setup

### 1. Create GCP Project & Enable API (5 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to **APIs & Services > Library**
4. Search for **"Google Forms API"** and enable it

### 2. Create Service Account (3 minutes)

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Name it (e.g., "forms-reader") and click **Create**
4. Skip optional steps, click **Done**

### 3. Download Service Account Key (2 minutes)

1. Click on your service account (the email address)
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Choose **JSON** format
5. Download the file (keep it secure!)

### 4. Share Your Form (2 minutes)

**IMPORTANT:** You must share your Google Form with the service account!

1. Open your Google Form: https://forms.gle/ZKrSszkL1yry7zr4A
2. Click the **Share** button (top right)
3. In the downloaded JSON file, find the `client_email` field
   - It looks like: `something@your-project.iam.gserviceaccount.com`
4. Paste that email into the "Add people and groups" field
5. Give it **Viewer** access
6. Click **Share**

### 5. Configure Environment Variables (1 minute)

Create `.env.local` in your project root:

```env
# Option 1: Full JSON (Recommended)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@project.iam.gserviceaccount.com",...}'

# Option 2: Individual fields (Alternative)
# GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
# GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: Set your form URL (defaults to the one in code)
GOOGLE_FORM_URL=https://forms.gle/ZKrSszkL1yry7zr4A
```

**For Option 1:** Copy the entire contents of the downloaded JSON file and paste it as a single-line string (replace newlines with `\n`).

**For Option 2:** Extract `client_email` and `private_key` from the JSON file.

### 6. Test It!

```bash
npm run dev
```

Visit http://localhost:3000 - your form should load!

## Troubleshooting

**"Permission denied" error?**

- Make sure you shared the form with the service account email
- The service account email is in the JSON file as `client_email`

**"Form not found" error?**

- Check that `GOOGLE_FORM_URL` is correct
- Verify the form ID extraction is working

**"No Google authentication credentials found" error?**

- Make sure `.env.local` exists
- Check that the environment variable names are exact (case-sensitive)
- Restart your dev server after adding env variables

## Production Deployment

For production (e.g., Vercel, Netlify):

1. Add the environment variables in your hosting platform's dashboard
2. For Vercel: Go to Project Settings > Environment Variables
3. Paste your `GOOGLE_SERVICE_ACCOUNT_KEY` value
4. Redeploy

The form will be fetched at build time and statically generated!
