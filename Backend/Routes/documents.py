from fastapi import APIRouter,UploadFile,File
from Backend.Services.pdf_services import extract_text
import os
import uuid
router=APIRouter()

UPLOAD_DIR="uploads"
os.makedirs(UPLOAD_DIR,exist_ok=True)


@router.post("/upload")
async def upload_document(file:UploadFile=File(...)):
    stored_filename=f"{uuid.uuid4()}.pdf"

    file_path=os.path.join(UPLOAD_DIR,stored_filename)

    with open(file_path,"wb") as buffer:
        buffer.write(await file.read())

    extracted_text=extract_text(file_path)

    return {
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "content_type": file.content_type,
        "text": extracted_text
    }
