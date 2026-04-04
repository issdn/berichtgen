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

1. [console.cloud.google.com](https://console.cloud.google.com) öffnen

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/gcp-dashboard.png)

2. Projekt auswählen oder neu erstellen

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/project-selection.png)

3. Nach „Gemini API" suchen

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/gemini-api-search.png)

4. **Aktivieren** klicken

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/gemini-api-enable.png)

5. Zu **Anmeldedaten** navigieren

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/gemini-api-credentials.png)

6. **Anmeldedaten erstellen → API-Schlüssel**

   ![](https://codeberg.org/isdn/***REMOVED***/raw/branch/main/tutorials/setup/gemini-api-credentials-create.png)

Schlüssel in `GOOGLE_AI_API_KEY` in der `.env` eintragen.

---

## 5. App starten

```bash
pnpm dev
```

Unter **http://localhost:5173** öffnen und mit dem in Schritt 3 erstellten Benutzer anmelden.
