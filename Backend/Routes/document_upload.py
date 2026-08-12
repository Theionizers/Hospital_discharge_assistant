from fastapi import APIRouter, File, HTTPException, UploadFile

from Ai.Graph.graph import invoke_workflow
from Backend.Services.document_storage import UPLOAD_DIR, delete_previous_uploads
from Backend.Services.json_services import read_extracted_json, save_extracted_json
from Backend.Services.pdf_services import extract_pages


router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    stored_filename = "a.pdf"
    file_path = UPLOAD_DIR / stored_filename

    try:
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
