from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

import base64
import uuid
import io
import json

from Backend.Services.pdf_services import extract_pages
from Backend.Services.json_services import (
    save_extracted_json,
    read_extracted_json,
)

from Ai.Graph.graph import invoke_workflow, stream_workflow


# ============================================================
# Environment + OpenAI
# ============================================================

load_dotenv()

client = OpenAI()

router = APIRouter()


# ============================================================
# Directories
# ============================================================

UPLOAD_DIR = Path("uploads")
JSON_DIR = Path("extracted_json")

UPLOAD_DIR.mkdir(exist_ok=True)
JSON_DIR.mkdir(exist_ok=True)


# ============================================================
# Speech to Text
# ============================================================

async def speech_to_text(audio_bytes: bytes, filename: str) -> str:
    """Convert audio bytes to text using OpenAI Whisper."""
    # Ensure the filename has a recognised audio extension so the API
    # can identify the format.  Browser recordings are typically webm.
    if not any(filename.lower().endswith(ext) for ext in
               (".webm", ".wav", ".mp3", ".ogg", ".m4a", ".mp4", ".flac")):
        filename = filename + ".webm"

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    print(f"STT | Sending {len(audio_bytes)} bytes to Whisper (name={filename})")

    transcript = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file,
    )

    result_text = ""
    # gpt-4o-mini-transcribe may return the text in .text or as a
    # structured object. Handle both.
    if hasattr(transcript, "text"):
        result_text = transcript.text or ""
    elif isinstance(transcript, dict):
        result_text = transcript.get("text", "")
    else:
        result_text = str(transcript)

    print(f"STT | Raw transcript: {repr(result_text)}")

    # Fallback: if gpt-4o-mini-transcribe returned nothing, retry with
    # whisper-1 which is more tolerant of short/noisy WebM clips.
    if not result_text.strip():
        print("STT | Empty transcript – retrying with whisper-1 ...")
        audio_file2 = io.BytesIO(audio_bytes)
        audio_file2.name = filename
        transcript2 = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file2,
        )
        if hasattr(transcript2, "text"):
            result_text = transcript2.text or ""
        elif isinstance(transcript2, dict):
            result_text = transcript2.get("text", "")
        else:
            result_text = str(transcript2)
        print(f"STT | whisper-1 transcript: {repr(result_text)}")

    return result_text.strip()


# ============================================================
# Text to Speech
# ============================================================

async def text_to_speech(text: str) -> bytes:
    """Convert text to speech audio bytes (MP3) using OpenAI TTS."""
    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=text,
        response_format="mp3",
    )

    audio_bytes = getattr(response, "content", None)

    if not audio_bytes:
        print("TTS returned empty audio bytes or no 'content' field on response.")
        return b""

    return audio_bytes


# ============================================================
# Chat Request Schema
# ============================================================

class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    stored_filename: str | None = None


# ============================================================
# Helpers
# ============================================================

def _load_document_text(stored_filename: str | None) -> str | None:
    """Load the extracted full_text for a given stored PDF filename."""
    if not stored_filename:
        return None

    json_path = JSON_DIR / stored_filename.replace(".pdf", ".json")
    if not json_path.exists():
        return None

    return read_extracted_json(str(json_path)).get("full_text")


def delete_previous_uploads(current_filename: str) -> None:
    """Remove all PDFs and their JSONs except the current upload."""
    for pdf_path in UPLOAD_DIR.glob("*.pdf"):
        if pdf_path.name == current_filename:
            continue
        pdf_path.unlink(missing_ok=True)
        JSON_DIR.joinpath(f"{pdf_path.stem}.json").unlink(missing_ok=True)


# ============================================================
# Upload Document
# ============================================================

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    stored_filename = "a.pdf"
    file_path = UPLOAD_DIR / stored_filename

    try:
        # Save PDF
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Delete previous documents
        delete_previous_uploads(stored_filename)

        # Extract PDF text using PyMuPDF
        extracted_data = extract_pages(str(file_path))
        extracted_data["original_filename"] = file.filename
        extracted_data["stored_filename"] = stored_filename

        # Save extracted JSON
        json_path = save_extracted_json(stored_filename, extracted_data)
        saved_json = read_extracted_json(json_path)

        # Run LangGraph to produce an initial summary
        result = invoke_workflow(
            user_message="Summarize this hospital discharge document",
            document_text=saved_json["full_text"],
        )

        return {
            "original_filename": file.filename,
            "stored_filename": stored_filename,
            "thread_id": result["thread_id"],
            "json_path": json_path,
            "pages": len(saved_json["pages"]),
            "llm_response": result["response"],
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ============================================================
# Chat With Document
# ============================================================

@router.post("/chat")
async def chat_with_document(request: ChatRequest):
    document_text = _load_document_text(request.stored_filename)

    result = invoke_workflow(
        user_message=request.message,
        thread_id=request.thread_id,
        document_text=document_text,
    )

    return result


@router.post("/chat/stream")
async def chat_with_document_stream(request: ChatRequest):
    document_text = _load_document_text(request.stored_filename)

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


# ============================================================
# Voice Chat
# ============================================================

@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    thread_id: str | None = Form(None),
    stored_filename: str | None = Form(None),
):
    """Voice chat endpoint.

    Accepts an audio file (recorded from the browser or uploaded).
    Returns a **JSON** response with:
      - ``text``:         what the user said (STT transcript)
      - ``response``:     the AI assistant's text reply
      - ``audio_base64``: base64-encoded MP3 audio of the reply (TTS)
      - ``thread_id``:    conversation thread identifier
    """
    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        print(f"Voice | file={audio.filename}  type={audio.content_type}  size={len(audio_bytes)}")

        # 1. Speech → Text
        user_text = await speech_to_text(audio_bytes, audio.filename)
        print(f"Voice | user said: {user_text}")

        # 2. Load document context if available
        document_text = _load_document_text(stored_filename)

        # 3. Text → LangGraph
        result = invoke_workflow(
            user_message=user_text,
            thread_id=thread_id,
            document_text=document_text,
        )

        response_text = result["response"]
        print(f"Voice | AI response: {response_text}")

        # 4. Text → Speech
        tts_bytes = await text_to_speech(response_text)

        audio_b64 = ""
        if tts_bytes:
            audio_b64 = base64.b64encode(tts_bytes).decode("utf-8")

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
            yield f"data: {json.dumps({'type': 'status', 'message': 'Transcribing your voice...'})}\n\n"

            user_text = await speech_to_text(audio_bytes, filename)
            print(f"Voice stream | user said: {user_text}")

            if not user_text:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No voice detected. Please speak louder or hold the microphone closer and try again.'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'transcript', 'text': user_text})}\n\n"
            yield f"data: {json.dumps({'type': 'status', 'message': 'Writing the answer...'})}\n\n"

            document_text = _load_document_text(stored_filename)
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

                yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'type': 'status', 'message': 'Creating voice reply...'})}\n\n"

            tts_bytes = await text_to_speech(response_text)
            audio_b64 = base64.b64encode(tts_bytes).decode("utf-8") if tts_bytes else ""

            yield f"data: {json.dumps({'type': 'audio', 'audio_base64': audio_b64})}\n\n"
            yield f"data: {json.dumps({'type': 'voice_done', 'text': user_text, 'response': response_text, 'thread_id': response_thread_id, 'intention': response_intention})}\n\n"

        except Exception as exc:
            print(f"Voice stream error: {exc}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
