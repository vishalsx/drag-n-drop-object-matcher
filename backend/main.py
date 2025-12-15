from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pictures
from app.routers import voting
from app.routers import TTS_service
from app.routers import getlanguages
from app.routers import savecards
from app.routers import determine_org
from app.routers import auth
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
app.include_router(getlanguages.router)
app.include_router(savecards.router)
app.include_router(determine_org.router)
app.include_router(auth.router)
app.include_router(curriculum.router)

@app.get("/health")
async def health():
    return {"status": "ok"}





# Define path to frontend build
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

# Check if the build directory exists
if os.path.isdir(frontend_path):
    # Mount assets directory (e.g. /assets/index.css)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    # Serve index.html at root
    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(frontend_path, "index.html"))

    # Catch-all route to serve index.html for SPA routing (e.g. /GLA)
    # This must be the last route defined to allow API routes to take precedence
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if it's a file that exists in dist (e.g. favicon.ico)
        file_path = os.path.join(frontend_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise return index.html
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    # Fallback if frontend is not built
    @app.get("/")
    def read_root():
        return {"message": "Hello from hin n match app (Frontend build not found)"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",   # points to this file and the FastAPI instance
        host="0.0.0.0",
        port=8081,
        reload=True   # optional, for auto-reload in dev mode
    )
