# Deploying to Vercel

Both `packages/issuer` and `packages/verifier` are independent Vercel projects.
Each has its own `vercel.json` and is deployed separately with its own domain.

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- An [Upstash](https://console.upstash.com) account (free tier is fine)

---

## Step 1 — Create Upstash Redis database

1. Go to **console.upstash.com → Create Database**
2. Choose a region close to your Vercel deployment region
3. After creation, click **REST API** and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

> Both the issuer and verifier can share **one** Redis database — all keys are namespaced (`offer:*`, `token:*`, `vp_req:*`, etc.).

---

## Step 2 — Generate stable DID keypairs

Run locally once to get the key material printed to stdout:

```bash
# Issuer
cd packages/issuer
npm run dev
# Look for lines like:
#   ISSUER_DID=did:key:z...
#   ISSUER_PRIVATE_KEY_BASE64=...
#   ISSUER_PUBLIC_KEY_BASE64=...
# Ctrl-C once you have them

# Verifier
cd ../verifier
npm run dev
# Same pattern — look for VERIFIER_DID, VERIFIER_PRIVATE_KEY_BASE64, etc.
```

Save these values — you'll set them as Vercel environment variables.

---

## Step 3 — Deploy the Issuer

```bash
cd packages/issuer
vercel
```

Vercel will ask a few questions:
- **Set up and deploy** → Yes
- **Which scope?** → your account
- **Link to existing project?** → No (first time)
- **Project name** → e.g. `vc-issuer`
- **In which directory is your code?** → `.` (current)
- **Override build settings?** → No

After the first deploy you'll get a URL like `https://vc-issuer-abc123.vercel.app`.

### Set environment variables

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add ISSUER_DID
vercel env add ISSUER_PRIVATE_KEY_BASE64
vercel env add ISSUER_PUBLIC_KEY_BASE64
vercel env add ISSUER_URL   # set to https://vc-issuer-abc123.vercel.app
```

Or set them in the Vercel dashboard → Project → Settings → Environment Variables.

### Redeploy with env vars applied

```bash
vercel --prod
```

### Add a custom domain (optional)

```bash
vercel domains add issuer.yourdomain.com
# Then in your DNS, add a CNAME: issuer.yourdomain.com → cname.vercel-dns.com
```

---

## Step 4 — Deploy the Verifier

```bash
cd ../verifier
vercel
```

Same flow. Project name e.g. `vc-verifier`.

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add VERIFIER_DID
vercel env add VERIFIER_PRIVATE_KEY_BASE64
vercel env add VERIFIER_PUBLIC_KEY_BASE64
vercel env add VERIFIER_URL   # set to https://vc-verifier-abc123.vercel.app

vercel --prod
```

---

## Step 5 — Update the wallet

In `packages/wallet/src/services/oid4vci.ts` and `oid4vp.ts` the issuer/verifier URLs come
from the QR code payload — no hardcoding needed.

For the demo admin UI you can hardcode the deployed URLs in the wallet's Settings screen:

```typescript
// packages/wallet/src/services/config.ts
export const ISSUER_URL = 'https://vc-issuer.yourdomain.com';
export const VERIFIER_URL = 'https://vc-verifier.yourdomain.com';
```

---

## Verify the deployment

```bash
# Health checks
curl https://vc-issuer.yourdomain.com/health
# → {"status":"ok","did":"did:key:z..."}

curl https://vc-verifier.yourdomain.com/health
# → {"status":"ok","did":"did:key:z..."}

# Issuer metadata
curl https://vc-issuer.yourdomain.com/.well-known/openid-credential-issuer | jq .

# Create a test offer
curl -X POST https://vc-issuer.yourdomain.com/offers \
  -H 'Content-Type: application/json' \
  -d '{
    "credentialType": "UniversityDegreeCredential",
    "subjectData": { "name": "Alice Smith", "degree": "BSc Computer Science" }
  }'
# → { "deepLink": "openid-credential-offer://...", "qrData": "..." }
```

---

## Architecture on Vercel

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                      │
│                                                             │
│   vc-issuer.yourdomain.com        vc-verifier.yourdomain.com│
│   ┌──────────────────────┐        ┌──────────────────────┐  │
│   │  Serverless Function │        │  Serverless Function │  │
│   │  api/index.ts        │        │  api/index.ts        │  │
│   │  (Express handler)   │        │  (Express handler)   │  │
│   └──────────┬───────────┘        └──────────┬───────────┘  │
└──────────────┼──────────────────────────────┼───────────────┘
               │                              │
               └──────────┬───────────────────┘
                          │
               ┌──────────▼──────────┐
               │   Upstash Redis     │
               │   (REST API, free)  │
               │                     │
               │  offer:*            │
               │  token:*            │
               │  nonce:*            │
               │  vp_req:*           │
               │  vp_result:*        │
               └─────────────────────┘
```

All state is in Redis with TTLs — no cold-start state loss, no sticky sessions needed.
