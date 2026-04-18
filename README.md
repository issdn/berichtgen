# ***REMOVED***

KI-gestütztes Dokumentengenerierungstool, das hochgeladene Dateien via Google Gemini verarbeitet und strukturierte Berichte erstellt.

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) 20+
- npm/pnpm/bun
- [Docker](https://www.docker.com/) (wird von Supabase lokal benötigt)
- [Supabase CLI](https://supabase.com/docs/guides/local-development)

---

## 1. Klonen & installieren

```bash
git clone https://codeberg.org/isdn/***REMOVED***.git
cd ***REMOVED***
pnpm install
```

---

## 2. Umgebungsvariablen

```bash
cp .env.example .env
```

| Variable | Benötigt | Beschreibung |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Ja | Aus `supabase start` Ausgabe |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ja | `publishable key` aus `supabase start` |
| `SUPABASE_SECRET` | Ja | `secret` aus `supabase start` |
| `GOOGLE_AI_API_KEY` | Ja | Siehe Abschnitt unten |
| `GEMINI_MODEL` | Ja | z.B. `gemini-2.0-flash` |
| `PUBLIC_COMPLETION_MAX_CHARACTERS` | Ja | z.B. `500000` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Nein | Nur für Google OAuth im Prod-Betrieb |
| Stripe-Variablen | Nein | Nur für Token-Käufe |
| Sentry / QStash / Upstash / Redis | Nein | Monitoring, Hintergrundjobs, Rate-Limiting |

---

## 3. Supabase lokal einrichten

**Docker muss laufen**, dann:

```bash
supabase start
```

Die Ausgabe enthält alle Verbindungsdaten — `API URL`, `publishable key` und `secret` in die `.env` eintragen.

Schema anwenden:

```bash
supabase db reset
```

**Testbenutzer anlegen:**

Supabase Studio öffnen unter **http://localhost:54323** → **Authentication → Users → Add user** → E-Mail + Passwort eingeben. Mit diesem Account meldet man sich lokal an (kein Google OAuth nötig).

---

## 4. Gemini API-Schlüssel erstellen

Schlüssel in `GOOGLE_AI_API_KEY` in der `.env` eintragen.

---
w
## 5. App starten

```bash
pnpm dev
```

Unter **http://localhost:5173** öffnen, mit `pnpm test:test-user` einen Benutzer erstellen und damit einloggen.

# Cost breakdown
A PDF file with a single page full of text is around 30KB. It's also 560 LLM tokens flat using Google's models.
A txt file with the same amount of text is 5KB and around 1000 LLM tokens (dynamically calculated).

### Vertex AI / Gemini API
_gemini-3.1-flash-lite-preview_ costs $0.25 per 1M input and $1.5 output tokens
1M input tokens is therefore ~1786 input PDF files or a ~1000 TXT files.

### Cloud Storage
1. Data Storage - total amount of storage is negligible because the files are immediatelly deleted - less than $0.1/mo.
2. Data processing - 1.000 class A operations (uploading files above 1 MB) = $0,005; 1.000 class B operations (Vertex AI getting the file from URL to process) = $0.0004

### 


# Free shit
### Google Cloud Storage for minimizing the compute of the cloud functions
- 5 GB-months of regional storage (US regions only) per month, which corresponds to the storage of 5 GB of data for a period of 1 month.
- 5,000 Class A Operations per month (file upload, operations are cached)
50,000 Class B Operations per month.
The Free Tier benefits for Cloud Storage apply only to usage in the us-east1, us-west1, and us-central1 regions. Usage calculations are combined across these regions.

# Data Privacy
### GCP
Files above 1MB are stored on a GCP Bucket for the duration of the process and deleted after. Deleted files are deleted permamently (no soft deletion).
### Supabase
### Vercel (AWS)