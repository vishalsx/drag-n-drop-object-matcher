from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pictures
from app.routers import voting
from app.routers import TTS_service
from app.routers import getlanguages
from app.routers import savecards
import uvicorn



app = FastAPI(title="Hint and Match API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register Routers
app.include_router(pictures.router)
app.include_router(voting.router)
app.include_router(TTS_service.router)
app.include_router(getlanguages.router)
app.include_router(savecards.router)

@app.get("/health")
async def health():
    return {"status": "ok"}




@app.get("/")
def read_root():
    return {"message": "Hello from hin n match app"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",   # points to this file and the FastAPI instance
        host="0.0.0.0",
        port=8080,
        reload=True   # optional, for auto-reload in dev mode
    )
