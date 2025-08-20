from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pictures
from app.routers import pictures


app = FastAPI(title="Game Pictures API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(pictures.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
