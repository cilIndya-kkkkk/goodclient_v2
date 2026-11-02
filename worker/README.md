# GoodClient Vault Sync Worker

Cloudflare Worker + D1 endpoint for the encrypted account vault.

## Deploy

```bash
cd ~/goodclient_v2/worker
npm install -g wrangler   # or use: npx wrangler ...
wrangler login
wrangler d1 create goodclient-vault
# copy the database_id into wrangler.toml
wrangler d1 execute goodclient-vault --remote --file=schema.sql
wrangler deploy
```

`wrangler deploy` prints the worker URL, normally:

```text
https://goodclient-vault.<your-subdomain>.workers.dev
```

The client default endpoint is:

```text
https://goodclient-vault.cilindya.workers.dev/vault
```

If your subdomain/name differs, set it once in the browser console:

```js
localStorage.setItem("fx_vault_sync_endpoint", "https://your-worker.workers.dev/vault");
```

or edit `DEFAULT_ENDPOINT` in `src/vaultSync.js`.

## API

- `PUT /vault/<64hex>.bin` with raw binary body (max 512 KB)
- `GET /vault/<64hex>.bin` returns the raw binary
- `OPTIONS` for CORS

The D1 table stores `filename`, `ciphertext BLOB`, `updated_at`.

## Security warning

This endpoint has no server-side account auth: the random 64-hex filename is the capability secret. Anyone who knows the hash can download or overwrite the encrypted blob. The client also uses a fixed AES key (`asdfGG12345`) for the synced blob, so this is obfuscation/at-rest protection, not zero-knowledge security. Use it only for low-value accounts, or replace the fixed key with a per-user device key + recovery code.

D1 free plan (verify current Cloudflare pricing): 5 GB storage, 5M rows read/day, 100k rows written/day.
