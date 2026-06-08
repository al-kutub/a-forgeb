# Forge API

A small HTTP API built with Python and [FastAPI](https://fastapi.tiangolo.com/). It serves random quotes and supports user profiles with uploadable profile photos.

## Endpoints

| Method | Path                    | Description                              |
|--------|-------------------------|------------------------------------------|
| GET    | `/health`               | Liveness check + quote/user counts       |
| GET    | `/quote`                | Returns a random quote                   |
| POST   | `/users`                | Create a user profile                    |
| GET    | `/users/{id}`           | Fetch a user profile                     |
| POST   | `/users/{id}/photo`     | Upload or replace a profile photo        |
| GET    | `/users/{id}/photo`     | Download the stored profile photo        |

Example responses:

```json
// POST /users {"name": "Ada Lovelace"}
{"id": "…", "name": "Ada Lovelace", "photo_url": null}

// POST /users/{id}/photo (multipart file field: file)
{"id": "…", "name": "Ada Lovelace", "photo_url": "/users/{id}/photo"}
```

Supported photo types: JPEG, PNG, WebP, GIF.

## Requirements

- Python 3.10+

## Setup

```bash
./setup.sh
```

This creates a `.venv` virtual environment and installs dependencies from
`requirements.txt`.

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

The API is then available at <http://127.0.0.1:8000>. Interactive docs are at
<http://127.0.0.1:8000/docs>.

## Test

```bash
source .venv/bin/activate
pytest
```

## Project layout

```
app/
  main.py      # FastAPI app + routes
  quotes.py    # quote data and random selection
  users.py     # user profiles + photo storage
tests/
  test_api.py    # quote/health tests
  test_users.py  # profile photo tests
setup.sh         # environment setup (Python 3.10+)
requirements.txt
uploads/           # created at runtime for profile photos (gitignored)
```

## Repository

Canonical product repo: [github.com/al-kutub/a-forgeb](https://github.com/al-kutub/a-forgeb)
