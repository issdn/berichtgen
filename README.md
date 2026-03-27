# Secrets

| Key                  | Desc                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| thumbnail_api_secret | Vault value for hashing inside supabase's trigger. This must be set in vault and in the python thumbnail api. |

Prune carts
Supabase Integrations -> Cron 0 0 \* \* 1

```sql
DELETE FROM cart WHERE "createdAt" < NOW() - INTERVAL '7 days';
```

### stripe

```ps1
stripe listen --forward-to localhost:5173/webhooks/stripe
```

# Back of the envelope calculations for the API (Vercel Cloud Functions (AWS Lambda) with Fluid Compute)

- Google models/api uses utf-8
- Max payload size for vercel functions is 4.5 MB so given that, the files should be batched to a single payload of files with combined text size of about 4 MB (left some buffer).
- Google models generally allow 1 mil input tokens. One token on avg. is 4 characters, each char is 1.25 bytes (German text) on avg. in utf-8. 800 000 tokens (some buffer) _ 4 chars _ 1.25 bytes = 4.000.000 bytes (4 MB)
- 4.25 mb reasonable enough to be under both vercel's and genai's limit even for edge cases (like full text composed of umlauts)
- 1 mil tokens is about 1200 pages
