# Secrets
|Key|Desc|
|-|-|
|thumbnail_api_secret|Vault value for hashing inside supabase's trigger. This must be set in vault and in the python thumbnail api.|

Prune carts
Supabase Integrations -> Cron 0 0 * * 1
```sql
DELETE FROM cart WHERE "createdAt" < NOW() - INTERVAL '7 days';
```

### types
```ps1
supabase gen types typescript --project-id eqlqxanawsygdwfaqzbp > src\lib\database.types.ts
```

### stripe

```ps1
stripe listen --forward-to localhost:5173/webhooks/stripe
```

