from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    stored_filename: str | None = None
