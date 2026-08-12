import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from Ai.Graph.graph import invoke_workflow, stream_workflow
from Backend.Schemas.chat import ChatRequest
from Backend.Services.document_storage import load_document_text


router = APIRouter()


@router.post("/chat")
async def chat_with_document(request: ChatRequest):
    document_text = load_document_text(request.stored_filename)

    return invoke_workflow(
        user_message=request.message,
        thread_id=request.thread_id,
        document_text=document_text,
    )


@router.post("/chat/stream")
async def chat_with_document_stream(request: ChatRequest):
    document_text = load_document_text(request.stored_filename)

    def event_stream():
        try:
            for event in stream_workflow(
                user_message=request.message,
                thread_id=request.thread_id,
                document_text=document_text,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            error_event = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
