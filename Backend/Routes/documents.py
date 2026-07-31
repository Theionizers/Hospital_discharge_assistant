from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from Backend.Services.pdf_services import extract_pages
from Backend.Services.json_services import save_extracted_json, read_extracted_json
from Ai.Graph.graph import invoke_workflow
import uuid


router = APIRouter()

UPLOAD_DIR = Path("uploads")
JSON_DIR = Path("extracted_json")
UPLOAD_DIR.mkdir(exist_ok=True)
JSON_DIR.mkdir(exist_ok=True)


def delete_previous_uploads(current_filename: str) -> None:
    for pdf_path in UPLOAD_DIR.glob("*.pdf"):
        if pdf_path.name == current_filename:
            continue

        pdf_path.unlink(missing_ok=True)
        JSON_DIR.joinpath(f"{pdf_path.stem}.json").unlink(missing_ok=True)


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    stored_filename = f"{uuid.uuid4()}.pdf"
    file_path = UPLOAD_DIR / stored_filename

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    delete_previous_uploads(stored_filename)

    extracted_data = extract_pages(str(file_path))

    extracted_data["original_filename"] = file.filename
    extracted_data["stored_filename"] = stored_filename

    json_path = save_extracted_json(stored_filename, extracted_data)

    saved_json = read_extracted_json(json_path)

    result = invoke_workflow(
        user_message="Summarize this hospital discharge document",
        document_text=saved_json["full_text"]
    )

    return {
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "json_path": json_path,
        "pages": saved_json["pages"],
        "llm_response": result["response"]
    }
