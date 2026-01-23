from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pictures
from app.routers import voting
from app.routers import TTS_service
from app.routers import languages
from app.routers import savecards
from app.routers import determine_org
from app.routers import auth
from app.routers import analytics
from app.routers import contest
from app.routers import game_play
from app.routers import curriculum
import uvicorn



app = FastAPI(title="Hint and Match API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.middleware import AuthMiddleware
app.add_middleware(AuthMiddleware)


# Register Routers
app.include_router(pictures.router)
app.include_router(voting.router)
app.include_router(TTS_service.router)
app.include_router(languages.router)
app.include_router(savecards.router)
app.include_router(determine_org.router)
app.include_router(auth.router, tags=["auth"])
app.include_router(contest.router, tags=["contest"])
app.include_router(curriculum.router)
app.include_router(analytics.router)
app.include_router(game_play.router, tags=["game_play"])

@app.get("/health")
async def health():
    return {"status": "ok"}






# Define path to frontend build

@app.get("/")
def read_root():
    return {"message": "Hint and Match API is running"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",   # points to this file and the FastAPI instance
        host="0.0.0.0",
        port=8081,
        reload=True   # optional, for auto-reload in dev mode
    )
