from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

import uuid
import io

from Backend.Services.pdf_services import extract_pages
from Backend.Services.json_services import (
    save_extracted_json,
    read_extracted_json,
)

from Ai.Graph.graph import invoke_workflow


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

async def speech_to_text(audio_bytes: bytes, filename: str):

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file
    )

    return transcript.text


# ============================================================
# Text to Speech
# ============================================================

async def text_to_speech(text: str):

    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=text,
        response_format="mp3",
    )

    return response.content


# ============================================================
# Chat Request Schema
# ============================================================

class ChatRequest(BaseModel):

    message: str

    thread_id: str | None = None

    stored_filename: str | None = None


# ============================================================
# Delete Previous Uploads
# ============================================================

def delete_previous_uploads(current_filename: str) -> None:

    for pdf_path in UPLOAD_DIR.glob("*.pdf"):

        if pdf_path.name == current_filename:
            continue

        pdf_path.unlink(missing_ok=True)

        JSON_DIR.joinpath(
            f"{pdf_path.stem}.json"
        ).unlink(missing_ok=True)


# ============================================================
# Upload Document
# ============================================================

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    stored_filename = f"{uuid.uuid4()}.pdf"

    file_path = UPLOAD_DIR / stored_filename

    try:

        # Save PDF
        with open(file_path, "wb") as buffer:

            buffer.write(
                await file.read()
            )

        # Delete previous documents
        delete_previous_uploads(
            stored_filename
        )

        # Extract PDF
        extracted_data = extract_pages(
            str(file_path)
        )

        extracted_data["original_filename"] = (
            file.filename
        )

        extracted_data["stored_filename"] = (
            stored_filename
        )

        # Save extracted JSON
        json_path = save_extracted_json(
            stored_filename,
            extracted_data,
        )

        saved_json = read_extracted_json(
            json_path
        )

        # Run LangGraph
        result = invoke_workflow(
            user_message=(
                "Summarize this hospital "
                "discharge document"
            ),
            document_text=saved_json["full_text"],
        )

        return {

            "original_filename": file.filename,

            "stored_filename": stored_filename,

            "thread_id": result["thread_id"],

            "json_path": json_path,

            "pages": len(
                saved_json["pages"]
            ),

            "llm_response": result["response"],
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# Chat With Document
# ============================================================

@router.post("/chat")
async def chat_with_document(
    request: ChatRequest
):

    document_text = None

    # Load document if filename is provided
    if request.stored_filename:

        json_path = (
            JSON_DIR
            / request.stored_filename.replace(
                ".pdf",
                ".json"
            )
        )

        if json_path.exists():

            document_text = (
                read_extracted_json(
                    str(json_path)
                ).get("full_text")
            )

    # Run LangGraph
    result = invoke_workflow(

        user_message=request.message,

        thread_id=request.thread_id,

        document_text=document_text,
    )

    return result


# ============================================================
# Voice Chat
# ============================================================

@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...)
):

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty"
            )

        print("Filename:", audio.filename)
        print("Content type:", audio.content_type)
        print("Size:", len(audio_bytes))

        # Speech → Text
        text = await speech_to_text(
            audio_bytes,
            audio.filename
        )

        print("User said:", text)

        # Text → LangGraph
        result = invoke_workflow(
            user_message=text,
            thread_id="user-1"
        )

        response_text = result["response"]

        print("AI response:", response_text)

        # Text → Speech
        audio_response = await text_to_speech(
            response_text
        )

        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/mpeg"
        )

    except HTTPException:
        raise

    except Exception as exc:
        print("Voice error:", str(exc))

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        ) from exc