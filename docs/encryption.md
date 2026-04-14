# Encryption Protocol

The Copass API supports client-side encryption of request payloads using AES-256-GCM. This document specifies the exact protocol that all language SDKs must implement.

## Overview

```
Master Key (user secret)
    │
    ▼ HKDF-SHA256
Data Encryption Key (DEK)
    │
    ├──▶ Wrap DEK with access token → session_token (X-Encryption-Token header)
    │
    └──▶ Server unwraps DEK and encrypts stored chunks / vault objects at rest
```

## Key Derivation

### DEK from Master Key

The Data Encryption Key is derived from the user's master key using HKDF-SHA256:

```
DEK = HKDF-SHA256(
  ikm:  master_key (UTF-8 bytes),
  salt: "olane-twin-brain-dek-v1" (UTF-8 bytes),
  info: "olane-dek" (UTF-8 bytes),
  len:  32 bytes
)
```

### Session Token (DEK Wrapping)

The DEK is wrapped for transport using an access-token-derived key:

**Step 1:** Derive the wrap key from the access token:
```
wrap_key = HKDF-SHA256(
  ikm:  access_token (UTF-8 bytes),
  salt: "olane-session-wrap-v1" (UTF-8 bytes),
  info: "olane-wrap" (UTF-8 bytes),
  len:  32 bytes
)
```

**Step 2:** Encrypt the DEK with the wrap key using AES-256-GCM:
```
iv = random 12 bytes
{ ciphertext, tag } = AES-256-GCM-encrypt(key=wrap_key, iv=iv, plaintext=DEK)
```

**Step 3:** Concatenate and base64-encode:
```
session_token = base64(iv[12] || ciphertext[32] || tag[16])
```

The session token is sent as the `X-Encryption-Token` header.

## Payload Encryption

### Storage ingestion (`/api/v1/storage/ingest`)

Ingestion uses **server-side encryption driven by the caller's DEK**. The
client sends plaintext JSON (e.g. `{ "text": "..." }`) with the
`X-Encryption-Token` header set. The server unwraps the DEK and encrypts the
resulting chunks and job payloads at rest; the DEK flows through the job queue
ephemerally. The client does not construct `encrypted_text`/`encryption_iv`/
`encryption_tag` fields itself.

### Vault objects (`/api/v1/storage/sandboxes/{sid}/vault/{key:path}`)

Vault `PUT` writes raw bytes. Pass `?encrypt=true` along with the
`X-Encryption-Token` header to have the server encrypt the object at rest under
a sandbox-scoped key. `GET` with `decrypt=true` (default) decrypts on read.

### Legacy `encrypted_text` payload shape (deprecated)

The retired `/api/v1/extract/*` endpoints accepted a payload with client-side
pre-encrypted fields:

```json
{
  "encrypted_text": base64(ciphertext),
  "encryption_iv":  base64(iv),
  "encryption_tag": base64(tag)
}
```

Those endpoints are removed from the SDK. The `encryptAesGcm` / `decryptAesGcm`
primitives remain exported from `@copass/harness` for advanced callers who need
to encrypt content out-of-band (e.g., before uploading to the vault manually),
but no first-party resource on `CopassClient` constructs that payload shape.

## Crypto Constants

All SDKs MUST use these exact constants (see also `spec/crypto-constants.md`):

| Constant | Value (UTF-8) | Used For |
|----------|---------------|----------|
| `WRAP_HKDF_SALT` | `olane-session-wrap-v1` | Deriving wrap key from access token |
| `WRAP_HKDF_INFO` | `olane-wrap` | Deriving wrap key from access token |
| `DEK_HKDF_SALT` | `olane-twin-brain-dek-v1` | Deriving DEK from master key |
| `DEK_HKDF_INFO` | `olane-dek` | Deriving DEK from master key |

## Algorithm Parameters

| Parameter | Value |
|-----------|-------|
| Key derivation | HKDF-SHA256 |
| Encryption | AES-256-GCM |
| Key length | 256 bits (32 bytes) |
| IV length | 96 bits (12 bytes) |
| Auth tag length | 128 bits (16 bytes) |
| Encoding | Base64 (standard, with padding) |

## When Encryption is Required

Encryption is optional. When configured (via `CopassClient({ encryptionKey })` or
a Supabase session that derives one), the SDK automatically attaches the
`X-Encryption-Token` header to every request. The server then encrypts
ingestion and vault content at rest under the caller's DEK.

Endpoints that do not consume encrypted state (matrix query, cosync, entity
listing, usage, API key management, sandbox metadata) simply ignore the header.

## Reference Implementations

- **TypeScript:** `typescript/packages/core/src/crypto/` (Node.js `crypto` + `SubtleCrypto`)
- **Python (server side):** `frame_graph/copass_id/crypto/` and `frame_graph/api/utils/session_token.py`
