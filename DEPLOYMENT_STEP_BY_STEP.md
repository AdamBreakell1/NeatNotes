# Neat Notes Deployment Guide

This is the beginner version. Follow it in order.

## What You Are Deploying

Neat Notes is not just a static website. It needs a backend server because it has:

- account signup
- login/logout
- email verification
- saved notes
- saved flashcard progress
- teacher classes
- student class memberships

For the first hosted version, use:

- **GitHub** to store the code
- **Render** to host the Node/Express app
- **Render persistent disk** to keep the SQLite database
- **Resend SMTP** to send verification emails
- optional **Google Cloud OAuth** for Google login

## Step 1: Create A GitHub Repository

1. Go to GitHub.
2. Create a new repository called `neat-notes`.
3. Do not add a README on GitHub if it asks, because this project already has one.
4. Copy the GitHub repository URL.

Then in Terminal, from this folder:

```bash
cd "/Users/adambreakell/Desktop/Notes App"
git init
git add .
git commit -m "Prepare Neat Notes for deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPO_URL` with the URL GitHub gives you.

Important: `.env` and `data/` are ignored, so your local secrets and database should not be pushed.

## Step 2: Create A Resend Account For Email

1. Go to Resend.
2. Create an account.
3. Create an API key.
4. Keep the API key somewhere safe temporarily.

SMTP settings you will use on Render:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=YOUR_RESEND_API_KEY
```

For a serious public launch, verify your own domain in Resend and use an address like:

```text
EMAIL_FROM="Neat Notes <no-reply@yourdomain.co.uk>"
```

For testing, use whichever sender Resend allows in your account.

## Step 3: Create The Render Service

1. Go to Render.
2. Click **New**.
3. Choose **Blueprint** if available.
4. Connect your GitHub repository.
5. Render should detect `render.yaml`.
6. Confirm it is creating a web service called `neat-notes`.

The important settings are already in `render.yaml`:

```text
Build command: npm install
Start command: npm start
Health check: /api/health
Persistent disk mount: /var/data
Database path: /var/data/neat-notes.sqlite
```

If you do not use Blueprint mode, create a **Web Service** manually and enter those same values.

## Step 4: Add Render Environment Variables

In Render, open the `neat-notes` service.

Go to **Environment**.

Set these values:

```text
NODE_ENV=production
DATABASE_PATH=/var/data/neat-notes.sqlite
JSON_BODY_LIMIT=1mb
AUTH_RATE_LIMIT=25
CONTACT_TO=neatnotescontact@gmail.com
CONTACT_RATE_LIMIT=8
BASE_URL=https://YOUR_RENDER_URL.onrender.com
CORS_ORIGIN=https://YOUR_RENDER_URL.onrender.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=YOUR_RESEND_API_KEY
EMAIL_FROM="Neat Notes <no-reply@yourdomain.co.uk>"
```

Replace:

- `YOUR_RENDER_URL.onrender.com` with the actual Render URL.
- `YOUR_RESEND_API_KEY` with your Resend key.
- `yourdomain.co.uk` with your real verified domain later.

Leave these blank unless you have set up Google OAuth:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Step 5: Deploy

1. Click **Deploy** on Render.
2. Wait for the build logs to finish.
3. Open:

```text
https://YOUR_RENDER_URL.onrender.com/api/health
```

You should see something like:

```json
{
  "ok": true,
  "service": "neat-notes",
  "deckCount": 16,
  "timestamp": "..."
}
```

If that works, the server and database are alive.

## Step 6: Test Email Verification

1. Open your live Render URL.
2. Click **Create an account**.
3. Use your real email address.
4. Submit the form.
5. Check your inbox.
6. Click the verification link.
7. Log in.

If no email arrives:

1. Check Render logs.
2. Check `SMTP_PASS` is correct.
3. Check `EMAIL_FROM` is allowed by Resend.
4. Check your Resend dashboard for blocked or rejected emails.

## Step 6B: Test The Contact Form

1. Open the live app.
2. Go to **Contact**.
3. Send a short test enquiry with your own email address.
4. Check `neatnotescontact@gmail.com`.

If no contact email arrives:

1. Check `CONTACT_TO=neatnotescontact@gmail.com` in Render.
2. Check the same SMTP settings used for verification email.
3. Check Render logs for `/api/contact` errors.
4. Check Resend for rejected or blocked messages.

## Step 7: Test Saved Data

After logging in:

1. Create a note.
2. Refresh the page.
3. Log out.
4. Log back in.
5. Confirm the note is still there.

That proves accounts and note persistence are working.

## Step 8: Test Teacher / Student Flow

Teacher:

1. Create an account.
2. Verify email.
3. Log in.
4. Open **Plans**.
5. Use the mock Teacher upgrade.
6. Go to Revision.
7. Switch to Teacher Mode.
8. Create a class.
9. Copy the class code.

Student:

1. Create a second account with a different email.
2. Verify email.
3. Log in.
4. Go to Revision.
5. Join the class using the class code.
6. Complete some flashcards.

Teacher:

1. Return to Teacher Mode.
2. Check the dashboard.
3. Confirm the student and confidence data appear.

## Step 9: Optional Google Login

Only do this after normal email login works.

1. Go to Google Cloud Console.
2. Create OAuth credentials.
3. Add this authorised redirect URI:

```text
https://YOUR_RENDER_URL.onrender.com/api/auth/google/callback
```

4. Copy the client ID and client secret.
5. Add them to Render:

```text
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

6. Redeploy.
7. Test **Continue with Google**.

## Step 10: What Is Still Mock / Not Production-Final

Stripe subscriptions are now supported. Use `STRIPE_MONETISATION_SETUP.md` to create Products, Prices, and the webhook.

For production payments, add these Render variables:

```text
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEACHER=price_...
ALLOW_MOCK_BILLING=false
FREE_REVISION_TOPIC_LIMIT=3
```

This version is good for an MVP or pilot once Stripe webhooks and a persistent database are active.

Before charging real schools at scale, still add:

- PostgreSQL instead of SQLite for long-term scale
- automated database backups
- CSRF protection
- admin dashboard
- proper email domain verification
- monitoring and error logging
- privacy policy and terms

## Quick Troubleshooting

### Render Will Not Let Me Add A Disk Yet

If Render says the instance change only applies after a successful deploy, let the app deploy once using the temporary database fallback.

When `/var/data` is not mounted yet, Neat Notes falls back to:

```text
/tmp/neat-notes.sqlite
```

This is only to unlock the first successful deploy. It is not permanent storage.

After the deploy succeeds:

1. Upgrade the instance to Starter.
2. Add the persistent disk.
3. Mount it at:

```text
/var/data
```

4. Keep this environment variable:

```text
DATABASE_PATH=/var/data/neat-notes.sqlite
```

5. Redeploy.
6. Check `/api/health`.

You want:

```json
"databasePersistent": true,
"databaseFallbackActive": false
```

If deploy fails:

- Check Render logs.
- Check Node version is 24 or newer.
- Check `npm install` finished.
- Check `npm start` is the start command.

If the app opens but signup fails:

- Check SMTP environment variables.
- Check Render logs.
- Check Resend API key.

If data disappears:

- Check the persistent disk exists.
- Check `DATABASE_PATH=/var/data/neat-notes.sqlite`.
- Do not use `./data/neat-notes.sqlite` in production.

If Google login fails:

- Check the Google redirect URI exactly matches the Render URL.
- Check `GOOGLE_CLIENT_ID`.
- Check `GOOGLE_CLIENT_SECRET`.
