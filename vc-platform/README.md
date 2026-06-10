# VC Platform

A production-grade Verifiable Credentials (VC) platform implementing OID4VCI and OID4VP protocols.

## Architecture

```
vc-platform/
├── packages/
│   ├── issuer/     # OID4VCI Issuer API (port 3001)
│   ├── verifier/   # OID4VP Verifier API (port 3002)
│   └── wallet/     # React Native (Expo) mobile wallet
├── docker-compose.yml
└── package.json    # npm workspaces root
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| DID method | `did:key` (Ed25519) |
| VC format | JWT (`jwt_vc_json`) |
| Crypto | `@noble/ed25519`, `multiformats` |
| JWT library | `jose` v5 |
| Backend | Express + TypeScript |
| Mobile | Expo SDK 50, React Native |

## Flow Diagrams

### Issuance (OID4VCI Pre-Authorized Code Flow)

```
Admin          Issuer API          Wallet
  │                │                  │
  ├─ POST /offers ─►                  │
  │◄── deepLink ───┤                  │
  │                │                  │
  │   (QR code)    │                  │
  │                │◄── POST /token ──┤
  │                ├── access_token ──►
  │                │◄ POST /credential┤ (with proof JWT)
  │                ├──── VC JWT ───────►
```

### Verification (OID4VP Direct Post)

```
Verifier App   Verifier API          Wallet
  │                │                  │
  ├ POST /requests ►                  │
  │◄── deepLink ───┤                  │
  │   (QR code)    │                  │
  │                │◄ POST /callback ─┤ (VP token)
  │                ├─ verify sig ─────►
  │◄ GET /results ─┤                  │
```

## Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Expo CLI (for mobile): `npm install -g expo-cli`

### Install dependencies

```bash
npm install --workspace=packages/issuer --workspace=packages/verifier
```

### Run locally

```bash
# Terminal 1 — Issuer
npm run issuer

# Terminal 2 — Verifier
npm run verifier

# Terminal 3 — Wallet (Expo)
npm run wallet
```

### Docker

```bash
docker-compose up
```

## API Reference

### Issuer API (port 3001)

#### `GET /health`
Returns `{ status: "ok", did: "did:key:..." }`.

#### `GET /.well-known/openid-credential-issuer`
OID4VCI issuer metadata.

#### `GET /.well-known/did.json`
DID Document for the issuer.

#### `POST /offers`
Create a credential offer (admin endpoint).

Request body:
```json
{
  "credentialType": "UniversityDegreeCredential",
  "subjectData": { "degree": "Bachelor of Science", "university": "MIT" },
  "requirePin": false
}
```

Response:
```json
{
  "preAuthorizedCode": "uuid",
  "pin": null,
  "offerUri": { ... },
  "deepLink": "openid-credential-offer://?credential_offer=...",
  "qrData": "openid-credential-offer://..."
}
```

Supported credential types: `UniversityDegreeCredential`, `EmploymentCredential`, `IdentityCredential`.

#### `POST /token`
Exchange pre-authorized code for access token (OID4VCI token endpoint).

#### `POST /credential`
Request credential issuance using access token + proof of possession.

---

### Verifier API (port 3002)

#### `GET /health`
Returns `{ status: "ok", did: "did:key:..." }`.

#### `POST /presentations/requests`
Create a presentation request.

Request body:
```json
{
  "credentialTypes": ["UniversityDegreeCredential"]
}
```

Response:
```json
{
  "state": "uuid",
  "nonce": "uuid",
  "deepLink": "openid4vp://?...",
  "qrData": "openid4vp://...",
  "expiresAt": 1234567890000
}
```

#### `POST /presentations/callback`
Receive VP token from wallet (OID4VP direct_post response).

#### `GET /presentations/results/:state`
Poll for verification result.

Response (complete):
```json
{
  "status": "complete",
  "result": {
    "verified": true,
    "holder": "did:key:...",
    "credentials": [
      {
        "type": ["VerifiableCredential", "UniversityDegreeCredential"],
        "issuer": "did:key:...",
        "subject": "did:key:...",
        "claims": { "degree": "Bachelor of Science" },
        "issuanceDate": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

## Mobile Wallet

The Expo wallet app provides:

- **Wallet tab** — View all stored credentials as cards, long-press to delete
- **Scan tab** — Camera QR scanner for both issuance and presentation flows
- **Settings tab** — View and copy your wallet DID

Keys are generated on first launch using Ed25519 and stored securely via `expo-secure-store`. Credentials are stored in `AsyncStorage`.

## Security Notes

- In-memory stores (offers, tokens, nonces) should be replaced with Redis/DB in production
- Issuer DID is regenerated on each server start; persist key material for production
- The `/offers` endpoint is an admin endpoint and should be protected (API key / auth middleware)
- JWT expiry is validated on the verifier side for each presented credential
- Nonce replay protection is implemented on the issuer side

## Standards Compliance

- [OpenID for Verifiable Credential Issuance (OID4VCI)](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) — Pre-Authorized Code Flow
- [OpenID for Verifiable Presentations (OID4VP)](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) — Direct Post response mode
- [W3C Verifiable Credentials Data Model 1.1](https://www.w3.org/TR/vc-data-model/)
- [DIF Presentation Exchange](https://identity.foundation/presentation-exchange/)
- [did:key method](https://w3c-ccg.github.io/did-method-key/)
