"""Quote data and selection logic."""

QUOTES = [
    {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
    {"text": "Simplicity is the soul of efficiency.", "author": "Austin Freeman"},
    {"text": "Talk is cheap. Show me the code.", "author": "Linus Torvalds"},
    {"text": "Premature optimization is the root of all evil.", "author": "Donald Knuth"},
    {"text": "First, solve the problem. Then, write the code.", "author": "John Johnson"},
    {"text": "Make it work, make it right, make it fast.", "author": "Kent Beck"},
    {"text": "Programs must be written for people to read.", "author": "Harold Abelson"},
    {"text": "The best error message is the one that never shows up.", "author": "Thomas Fuchs"},
    {"text": "Code is like humor. When you have to explain it, it's bad.", "author": "Cory House"},
    {"text": "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", "author": "Martin Fowler"},
]


def random_quote(rng=None):
    """Return a random quote. Accepts an optional RNG for deterministic testing."""
    import random

    chooser = rng if rng is not None else random
    return chooser.choice(QUOTES)
