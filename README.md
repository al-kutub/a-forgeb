# Quote API

A small HTTP Quote API built with Python and [FastAPI](https://fastapi.tiangolo.com/).

## Endpoints

| Method | Path      | Description                       |
|--------|-----------|-----------------------------------|
| GET    | `/health` | Liveness check + quote count      |
| GET    | `/quote`  | Returns a random quote            |

Example responses:

```json
// GET /health
{"status": "ok", "quotes": 10}

// GET /quote
{"text": "Talk is cheap. Show me the code.", "author": "Linus Torvalds"}
```

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
tests/
  test_api.py  # pytest suite
setup.sh       # environment setup (Python 3.10+)
requirements.txt
```
