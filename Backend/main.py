from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Backend.Database.database import Base, engine
from Backend.models import uploads

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

@app.get("/")
def home():
    return {
        "message":"hello to the new world"
    }
