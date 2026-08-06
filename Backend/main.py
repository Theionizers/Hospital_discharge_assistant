from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from Backend.Database.database import Base, engine
from Backend.models import uploads, tables

from Backend.Routes.documents import router
Base.metadata.create_all(bind=engine)

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    router,
    prefix="/documents",
    tags=["Documents"]
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "Frontend" / "dist"


@app.get("/")
def home():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return {
        "message": "hello to the new world",
        "frontend": "Run `npm run build` from the Frontend folder to serve the app here.",
    }


if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")


    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        requested_file = FRONTEND_DIST / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(FRONTEND_DIST / "index.html")
