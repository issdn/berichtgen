### ENVs
| Variable | Benötigt | Beschreibung |
|---|---|---|
| `AUTH_GOOGLE_ID` | Ja | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Ja | Google OAuth Client Secret |
| `GCS_BUCKET_NAME` | Ja | Name des GCS Buckets |
| `GCS_SERVICE_ACCOUNT_KEY` | Ja | Service Account JSON (als String) |
| `PUBLIC_SUPABASE_URL` | Ja | Aus `supabase start` Ausgabe |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ja | Publishable Key aus `supabase start` |
| `SUPABASE_SECRET` | Ja | Secret Key aus `supabase start` |
| `DATABASE_URL` | Ja | Postgres Connection String |
| `SUPABASE_CA` | Ja | CA Zertifikat für DB SSL |
| `SENTRY_AUTH_TOKEN` | Ja | Sentry Auth Token |
| `PUBLIC_STRIPE_KEY` | Ja | Public Stripe Key |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ja | Stripe Publishable Key |
| `STRIPE_SECRET_KEY` | Ja | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Ja | Stripe Webhook Secret |
| `SMTP_HOST` | Ja | SMTP Host |
| `SMTP_PORT` | Ja | SMTP Port |
| `SMTP_USER` | Ja | SMTP User |
| `SMTP_PASS` | Ja | SMTP Passwort |
| `SMTP_SENDER_NAME` | Ja | SMTP Sender Name |
| `SMTP_ADMIN_EMAIL` | Ja | SMTP Admin E-Mail |
# Cost breakdown (GCP + Vercel)
A PDF file with a single page full of text is around 30KB. It's also 560 LLM tokens flat using Google's models.
A txt file with the same amount of text is 5KB and around 1000 LLM tokens (dynamically calculated).

### Vertex AI / Gemini API
_gemini-3.1-flash-lite-preview_ costs $0.25 per 1M input and $1.5 output tokens
1M input tokens is therefore ~1786 input PDF files or a ~1000 TXT files.

### Google Cloud Storage for minimizing the compute of the cloud functions
1. Data Storage - total amount of storage is negligible because the files are immediatelly deleted - less than $0.1/mo.
2. Data processing - 1.000 class A operations (uploading files above 1 MB) = $0,005; 1.000 class B operations (Vertex AI getting the file from URL to process) = $0.0004

Free
- 5 GB-months of regional storage (US regions only) per month, which corresponds to the storage of 5 GB of data for a period of 1 month.
- 5,000 Class A Operations per month (file upload, operations are cached)
50,000 Class B Operations per month.
The Free Tier benefits for Cloud Storage apply only to usage in the us-east1, us-west1, and us-central1 regions. Usage calculations are combined across these regions.

### Vercel (AWS)
| Metric | Included (free) | Starting at |
|---|---:|---:|
| Active CPU | 4 hours / month | $0.128 per hour |
| Provisioned Memory | 360 GB-hrs / month | $0.0106 per GB-Hour |
| Invocations | 1M / month | $0.60 per 1M |

# Data Privacy
### GCP
Files above 1MB are stored on a GCP Bucket for the duration of the process and deleted after. Deleted files are deleted permamently (no soft deletion).

### Servers 
Vercel Cloud Functions and Supabase PostgreSQL both on EU Servers

### DPAs
Stripe, Sentry, Supabase, Vercel

### Sentry
https://sentry.io/astro-assets/resources/legal/how-to-comply-with-gdpr-october-2024.pdf

