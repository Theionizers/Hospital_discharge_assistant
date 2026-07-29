from fastapi import FastAPI

from Database.database import Base,engine

from Routes.documents import router
Base.metadata.create_all(bind=engine)

app=FastAPI()

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