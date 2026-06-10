# Forge API (v2.0.0)

A small HTTP API built with Python and [FastAPI](https://fastapi.tiangolo.com/). It serves random quotes, JWT-based user authentication, and profile avatars with pluggable storage backends. A static web UI is included for register, login, and avatar management.

## Requirements

- Python 3.10+

## Setup

```bash
./setup.sh
```

This creates a `.venv` virtual environment (when `python3-venv` is available) and installs dependencies from `requirements.txt`.

## Run

```bash
source .venv/bin/activate   # omit if setup fell back to user-site install
uvicorn app.main:app --reload
```

The API is available at <http://127.0.0.1:8000>. Interactive docs are at <http://127.0.0.1:8000/docs>.

## Web UI

Static pages are served from `frontend/` at the site root (API routes are registered first):

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Redirects to profile when logged in, otherwise login |
| Login | `/login.html` | Sign in with email and password |
| Register | `/register.html` | Create an account |
| Profile | `/profile.html` | View account, upload/replace/delete avatar |

The UI stores the JWT in `localStorage` under the key `forge_token` and sends it as `Authorization: Bearer <token>` on authenticated requests.

Manual smoke test:

1. Start the server (`uvicorn app.main:app --reload`).
2. Open <http://127.0.0.1:8000/register.html>, create an account, and confirm redirect to profile.
3. Upload a JPEG/PNG/WebP avatar (max 2 MB); preview should update.
4. Delete the avatar and confirm the placeholder appears.
5. Log out and log back in via `/login.html`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-only-change-me` | HMAC secret for signing access tokens. **Set a strong value in production.** |
| `AVATAR_STORAGE_BACKEND` | `local` | Avatar storage backend: `local` or `s3` |
| `S3_BUCKET` | — | S3 bucket name (required when backend is `s3`) |
| `S3_REGION` | `us-east-1` | AWS region for the S3 client |
| `CDN_BASE_URL` | — | Public CDN base URL for avatar objects (required when backend is `s3`) |

AWS credentials for S3 follow the standard [boto3 credential chain](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html) (env vars, shared config, instance role, etc.).

### Local storage (default)

Avatars are written to `data/avatars/` on disk. Public URLs are served by the API at `/users/{user_id}/avatar`.

### S3 storage

Set `AVATAR_STORAGE_BACKEND=s3` plus `S3_BUCKET` and `CDN_BASE_URL`. Uploads go to `s3://{S3_BUCKET}/avatars/{user_id}.{ext}` and public URLs are `{CDN_BASE_URL}/avatars/{user_id}.{ext}`. The API redirects avatar GET requests to the CDN URL.

Example:

```bash
export AVATAR_STORAGE_BACKEND=s3
export S3_BUCKET=my-forge-avatars
export S3_REGION=us-east-1
export CDN_BASE_URL=https://cdn.example.com
export JWT_SECRET="$(openssl rand -hex 32)"
uvicorn app.main:app --reload
```

## Authentication

Registration and login return a bearer JWT (24-hour expiry). Protected routes require:

```http
Authorization: Bearer <access_token>
```

Passwords are hashed with bcrypt. Supported image types for avatars: JPEG, PNG, WebP (max 2 MB).

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness check + quote/user counts |
| GET | `/quote` | — | Random quote |
| POST | `/auth/register` | — | Create account; returns JWT |
| POST | `/auth/login` | — | Sign in; returns JWT |
| GET | `/auth/me` | Bearer | Current user profile |
| PUT | `/users/me/avatar` | Bearer | Upload or replace avatar (`file` multipart field) |
| DELETE | `/users/me/avatar` | Bearer | Remove avatar |
| GET | `/users/{user_id}/avatar` | — | Avatar image (or SVG placeholder) |

### curl examples

Register:

```bash
curl -s -X POST http://127.0.0.1:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"securepass","display_name":"Ada Lovelace"}'
```

Login:

```bash
curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"securepass"}'
```

Current user (replace `TOKEN`):

```bash
curl -s http://127.0.0.1:8000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

Upload avatar:

```bash
curl -s -X PUT http://127.0.0.1:8000/users/me/avatar \
  -H "Authorization: Bearer TOKEN" \
  -F 'file=@photo.jpg'
```

Fetch avatar:

```bash
curl -s -o avatar.jpg http://127.0.0.1:8000/users/USER_ID/avatar
```

Delete avatar:

```bash
curl -s -X DELETE http://127.0.0.1:8000/users/me/avatar \
  -H "Authorization: Bearer TOKEN"
```

Random quote:

```bash
curl -s http://127.0.0.1:8000/quote
```

## Test

```bash
source .venv/bin/activate   # omit if setup fell back to user-site install
pytest
```

## Failure Lens (CI triage)

TypeScript packages for the Buildroom job `forgeb-20260610-ci-failure-triage-gap` live under `packages/shared/`.

| Path | Purpose |
|------|---------|
| `packages/shared/types/ci-triage.ts` | Shared contracts: `Stage`, `RunRef`, `DistilledLog`, `RootCauseSummary`, `ConfidenceBand` |
| `packages/shared/fixtures/ci-triage/` | Seeded failed/green log pairs (dependency timeout, test assertion, infra flake) |
| `buildroom/jobs/forgeb-20260610-ci-failure-triage-gap/` | Job metadata mirrored from Buildroom |

```bash
pnpm install
pnpm -r typecheck
```

## Project layout

```
packages/
  shared/
    types/ci-triage.ts
    fixtures/ci-triage/
buildroom/
  jobs/forgeb-20260610-ci-failure-triage-gap/
app/
  main.py           # FastAPI app, health/quote routes, static UI mount
  auth.py           # JWT helpers and password hashing
  auth_routes.py    # /auth/register, /auth/login, /auth/me
  avatar_routes.py  # Avatar upload/delete/serve
  avatars.py        # Image validation and placeholder SVG
  database.py       # SQLite + SQLAlchemy setup
  models.py         # User model
  quotes.py         # Quote data and random selection
  storage/          # Avatar storage backends (local, S3)
frontend/
  index.html        # Auth redirect
  login.html        # Login form
  register.html     # Registration form
  profile.html      # Profile + avatar management
  app.js            # Shared fetch/auth helpers
  styles.css        # UI styles
tests/
  test_api.py       # Health and quote tests
  test_auth.py      # Registration, login, /auth/me
  test_avatars.py   # Avatar upload/delete/serve
  test_frontend.py  # Static UI smoke checks
  test_storage.py   # Storage backend unit tests
data/avatars/       # Local avatar files (created at runtime, gitignored)
setup.sh            # Environment setup (Python 3.10+)
requirements.txt
```

## Repository

Canonical product repo: [github.com/al-kutub/a-forgeb](https://github.com/al-kutub/a-forgeb)
