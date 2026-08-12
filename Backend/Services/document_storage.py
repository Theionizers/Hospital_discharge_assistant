from pathlib import Path

from Backend.Services.json_services import read_extracted_json


UPLOAD_DIR = Path("uploads")
JSON_DIR = Path("extracted_json")

UPLOAD_DIR.mkdir(exist_ok=True)
JSON_DIR.mkdir(exist_ok=True)


def document_json_path(stored_filename: str) -> Path:
    return JSON_DIR / stored_filename.replace(".pdf", ".json")


def load_document_text(stored_filename: str | None) -> str | None:
    if not stored_filename:
        return None

    json_path = document_json_path(stored_filename)
    if not json_path.exists():
        return None

    return read_extracted_json(str(json_path)).get("full_text")


def delete_previous_uploads(current_filename: str) -> None:
    for pdf_path in UPLOAD_DIR.glob("*.pdf"):
        if pdf_path.name == current_filename:
            continue
        pdf_path.unlink(missing_ok=True)
        JSON_DIR.joinpath(f"{pdf_path.stem}.json").unlink(missing_ok=True)
