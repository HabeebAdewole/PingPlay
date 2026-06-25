from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import asyncio

app = FastAPI(title="PingPlay Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Difficulty → (min_ratio, max_ratio) of max possible score
DIFFICULTY_RANGES = {
    "easy":   {"basketball": (0.15, 0.40), "archery": (0.10, 0.40)},
    "medium": {"basketball": (0.35, 0.60), "archery": (0.35, 0.65)},
    "hard":   {"basketball": (0.55, 0.82), "archery": (0.60, 0.90)},
}

MAX_SCORES = {
    "basketball": 20,   # realistic max baskets in 30 seconds
    "archery": 30,      # 3 arrows × 10 pts
}

class ScoreRequest(BaseModel):
    game: str           # "basketball" | "archery"
    difficulty: str     # "easy" | "medium" | "hard"
    player_score: int

class ScoreResponse(BaseModel):
    bot_score: int
    difficulty_used: str
    breakdown: list[int]  # per-arrow scores for archery, empty for basketball

@app.post("/bot/score", response_model=ScoreResponse)
async def get_bot_score(req: ScoreRequest):
    # Simulate bot "thinking / playing"
    await asyncio.sleep(random.uniform(1.8, 3.2))

    difficulty = req.difficulty if req.difficulty in DIFFICULTY_RANGES else "medium"
    lo, hi = DIFFICULTY_RANGES[difficulty][req.game]
    max_score = MAX_SCORES.get(req.game, 20)

    # Small adaptive nudge: if player crushed it, bot stretches toward hi end
    player_ratio = req.player_score / max_score
    if player_ratio > 0.75:
        hi = min(hi + 0.08, 0.95)
    elif player_ratio < 0.25:
        lo = max(lo - 0.08, 0.05)

    bot_score = round(random.uniform(lo, hi) * max_score)
    bot_score = max(0, min(bot_score, max_score))

    # Archery breakdown: distribute bot_score across 3 arrows
    breakdown: list[int] = []
    if req.game == "archery":
        breakdown = _archery_breakdown(bot_score)

    return ScoreResponse(bot_score=bot_score, difficulty_used=difficulty, breakdown=breakdown)

def _archery_breakdown(total: int) -> list[int]:
    """Distribute total archery score across 3 arrows in valid increments (0,2,4,6,8,10)."""
    valid = [0, 2, 4, 6, 8, 10]
    best = None
    for _ in range(200):
        arrows = [random.choice(valid) for _ in range(3)]
        if sum(arrows) == total:
            return arrows
        if best is None or abs(sum(arrows) - total) < abs(sum(best) - total):
            best = arrows
    return best or [0, 0, 0]

@app.get("/health")
def health():
    return {"status": "ok", "service": "PingPlay Bot API"}
