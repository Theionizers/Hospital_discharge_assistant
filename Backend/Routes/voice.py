import base64
import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from Ai.Graph.graph import invoke_workflow, stream_workflow
from Backend.Services.document_storage import load_document_text
from Backend.Services.speech_services import speech_to_text, text_to_speech


router = APIRouter()


@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    thread_id: str | None = Form(None),
    stored_filename: str | None = Form(None),
):
    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        print(f"Voice | file={audio.filename}  type={audio.content_type}  size={len(audio_bytes)}")

        user_text = await speech_to_text(audio_bytes, audio.filename)
        print(f"Voice | user said: {user_text}")

        document_text = load_document_text(stored_filename)

        result = invoke_workflow(
            user_message=user_text,
            thread_id=thread_id,
            document_text=document_text,
        )

        response_text = result["response"]
        print(f"Voice | AI response: {response_text}")

        tts_bytes = await text_to_speech(response_text)
        audio_b64 = base64.b64encode(tts_bytes).decode("utf-8") if tts_bytes else ""

        return {
            "text": user_text,
            "response": response_text,
            "audio_base64": audio_b64,
            "thread_id": result.get("thread_id", thread_id or ""),
        }

    except HTTPException:
        raise

    except Exception as exc:
        print(f"Voice error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/voice/stream")
async def voice_chat_stream(
    audio: UploadFile = File(...),
    thread_id: str | None = Form(None),
    stored_filename: str | None = Form(None),
):
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    filename = audio.filename
    print(f"Voice stream | file={filename}  type={audio.content_type}  size={len(audio_bytes)}")

    async def event_stream():
        try:
            yield _sse({"type": "status", "message": "Transcribing your voice..."})

            user_text = await speech_to_text(audio_bytes, filename)
            print(f"Voice stream | user said: {user_text}")

            if not user_text:
                yield _sse({
                    "type": "error",
                    "message": "No voice detected. Please speak louder or hold the microphone closer and try again.",
                })
                return

            yield _sse({"type": "transcript", "text": user_text})
            yield _sse({"type": "status", "message": "Writing the answer..."})

            document_text = load_document_text(stored_filename)
            response_text = ""
            response_thread_id = thread_id or ""
            response_intention = ""

            for event in stream_workflow(
                user_message=user_text,
                thread_id=thread_id,
                document_text=document_text,
            ):
                if event.get("type") == "token":
                    response_text += event.get("content", "")

                if event.get("type") == "done":
                    response_text = event.get("response") or response_text
                    response_thread_id = event.get("thread_id", response_thread_id)
                    response_intention = event.get("intention", "")

                yield _sse(event)

            yield _sse({"type": "status", "message": "Creating voice reply..."})

            tts_bytes = await text_to_speech(response_text)
            audio_b64 = base64.b64encode(tts_bytes).decode("utf-8") if tts_bytes else ""

            yield _sse({"type": "audio", "audio_base64": audio_b64})
            yield _sse({
                "type": "voice_done",
                "text": user_text,
                "response": response_text,
                "thread_id": response_thread_id,
                "intention": response_intention,
            })

        except Exception as exc:
            print(f"Voice stream error: {exc}")
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/voice/transcribe-only")
async def voice_transcribe_only(
    audio: UploadFile = File(...),
):
    """Transcribe voice to text without sending to AI"""
    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        filename = audio.filename
        print(f"Voice transcribe-only | file={filename}  type={audio.content_type}  size={len(audio_bytes)}")

        user_text = await speech_to_text(audio_bytes, filename)
        print(f"Voice transcribe-only | user said: {user_text}")

        if not user_text:
            raise HTTPException(status_code=400, detail="No voice detected. Please speak louder or hold the microphone closer and try again.")

        return {
            "text": user_text,
            "success": True,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print(f"Voice transcribe-only error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"
