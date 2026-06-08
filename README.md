### SETUP Checklist

### Supabase

#### Project

- [ ] Apply all migrations.
- [ ] Set Supabase `site_url` to the exact public origin of the app for that environment.
  - Local: `http://localhost:5173`
  - Production: `https://www.berichtgen.de`
- [ ] Add all auth callback / redirect URLs.
- [ ] Turn on Supabase `SSL Enforcement`.
- [ ] Add these to Vercel env vars:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET`
  - `DATABASE_URL` - direct Postgres connection string from Supabase for the app/server
  - `SUPABASE_CA` - Supabase database CA certificate used for the enforced SSL connection

#### Email Login

- [ ] Activate email / OTP auth in Supabase.
- [ ] Configure SMTP server settings.
- [ ] Verify auth emails are sent correctly.

#### Google OAuth

- [ ] Activate Google auth in Supabase.
- [ ] Add the correct Google client ID and secret.
- [ ] Verify the callback URL configured in Supabase matches Google Cloud Console.
- [ ] Add these to the env where Supabase local config reads them:
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`

### Google Cloud

#### Vertex AI

- [ ] Enable Vertex AI API.

#### Wizard Upload Bucket

- [ ] Enable Cloud Storage API.
- [ ] Create the bucket used for wizard file uploads.
- [ ] Add to Vercel env vars:
  - `GCS_BUCKET_NAME` - bucket used for temporary wizard file uploads before AI processing

#### Backup Bucket

- [ ] Create a separate GCS bucket for daily database backups.
- [ ] Add its name as GitHub secret:
  - `GCS_BACKUP_BUCKET_NAME`

#### Service Account

- [ ] Create a service account for Vertex AI + GCS access.
- [ ] Grant access to:
  - [ ] Vertex AI
  - [ ] wizard upload bucket
  - [ ] backup bucket if the same account is reused
- [ ] Export the JSON key.
- [ ] Add to Vercel env vars:
  - `GCS_SERVICE_ACCOUNT_KEY` - JSON credentials used by the app for GCS upload signing and Vertex AI access

### Google OAuth Console

- [ ] Add all authorized redirect URIs.
- [ ] Add all authorized JavaScript origins if needed.
- [ ] Configure OAuth branding.
- [ ] Keep Privacy Policy and Terms URLs set correctly in Google Cloud Console.

### Vercel

- [ ] Verify production has `SUPABASE_CA`; the app requires it when Supabase `SSL Enforcement` is enabled.

#### Protection

- [ ] Configure firewall / bot protection.
- [ ] Add rate limits for:
  - [ ] auth endpoints
  - [ ] expensive remote functions / AI routes
  - [ ] Stripe webhook if needed

### Stripe

- [ ] Create Stripe API keys for the environment.
- [ ] Create the Stripe webhook endpoint.
- [ ] Configure these Stripe webhook events:
  - `charge.refunded`
  - `payment_intent.canceled`
  - `payment_intent.succeeded`
- [ ] Add these to Vercel env vars:
  - `PUBLIC_STRIPE_KEY`
  - `PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

### Sentry

- [ ] Add to Vercel env vars:
  - `SENTRY_AUTH_TOKEN` - used by the Vite/Sentry integration during builds

### GitHub Actions

#### Repository Secrets

- [ ] Add:
  - `DATABASE_URL` - Supabase Session mode pooler connection string for the backup workflow (`pg_dump` from GitHub Actions should not use the direct DB host)
  - `GCS_BACKUP_BUCKET_NAME` - bucket receiving compressed DB dumps
  - `GCS_BACKUP_ACCOUNT_KEY` - Google service account JSON for the backup workflow

#### Backup Workflow

- [ ] Make sure `.github/workflows/daily-db-backup.yml` is on the default branch.
- [ ] Verify the workflow once with `workflow_dispatch`.
- [ ] Verify the uploaded dump appears in the GCS backup bucket.

### Dev Env Vars

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `GCS_BUCKET_NAME` - temporary wizard upload bucket
- `GCS_SERVICE_ACCOUNT_KEY` - Google service account JSON for upload signing and Vertex AI
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET`
- `DATABASE_URL` - direct Supabase Postgres connection string
- `SUPABASE_CA` - DB CA cert for the Supabase SSL-enforced connection
- `SENTRY_AUTH_TOKEN` - build-time Sentry auth
- `PUBLIC_STRIPE_KEY`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SENDER_NAME`
- `SMTP_ADMIN_EMAIL`

### Cost breakdown (GCP + Vercel)

A PDF file with a single page full of text is around 30KB. It's also 560 LLM tokens flat using Google's models.
A txt file with the same amount of text is 5KB and around 1000 LLM tokens (dynamically calculated).

### Vertex AI / Gemini API

_gemini-3.1-flash-lite-preview_ costs $0.25 per 1M input and $1.5 output tokens
1M input tokens is therefore ~1786 input PDF files or a ~1000 TXT files.

### Google Cloud Storage

#### [EUW, Regional, Standard class](https://cloud.google.com/storage/pricing?hl=en)
|Storage|Data Processing Operations|
|-|-|
|$0.000031507 / 1 gibibyte hour|Class A: $0,005/1.000 ops<br/>Class B: $0,0004/1.000 ops|

A upload + delete (free) will cost:<br/>
$0,005\$ / 1.000 = 0,000005\$$

For a fairly large wikipedia article as a PDF (2,5MB), the storage for 24h will cost:<br/>
$0,000031507\$/h * 0,0025GB * 24h = 0,00000189042\$/day$<br/>

Break-Even (when does storing the file become cheaper than reuploading):<br/>
$0.00000189042\$ / 0,000005\$ ≈ 0.378uploads$

#### [EUW, Zoned, Rapid class](https://cloud.google.com/storage/pricing?hl=en)
|Storage|Data Processing Operations|
|-|-|
|$0.000150685 / 1 gibibyte hour|Class A: $0,00113/1.000 ops<br/>Class B: $0,0002/1.000 ops|

A upload + delete (free) will cost:<br/>
$0,00113\$ / 1.000 = 0,00000113\$$

Same article (2,5MB):<br/>
$0,000150685\$/h * 0,0025GB * 24h = 0,0000090411\$/day$<br/>

Break-Even (when does storing the file become cheaper than reuploading):<br/>
$0.0000090411\$ / 0,00000113\$ ≈ 8uploads$

### Vercel (AWS)

| Metric             |    Included (free) |         Starting at |
| ------------------ | -----------------: | ------------------: |
| Active CPU         |    4 hours / month |     $0.128 per hour |
| Provisioned Memory | 360 GB-hrs / month | $0.0106 per GB-Hour |
| Invocations        |         1M / month |        $0.60 per 1M |

### Data Privacy - https:\\www.berichtgen.de\datenschutz
