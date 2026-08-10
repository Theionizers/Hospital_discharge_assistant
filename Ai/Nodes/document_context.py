import json
from pathlib import Path
from Ai.State.Graph_state import Hopitaldata


def _extracted_json_path() -> Path:
    # Project root is two levels up from Ai/Nodes
    return Path(__file__).resolve().parents[2] / "extracted_json" / "a.json"


def _load_a_json() -> dict:
    """Read extracted_json/a.json from disk every time (no cache).

    Previously this was decorated with @lru_cache which caused stale
    document data after re-uploading a PDF.
    """
    path = _extracted_json_path()
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def get_discharge_context(state: Hopitaldata, *sections: str) -> str:
    """Return discharge-document context for LLM prompts.

    Priority order:
    1. ``state['document_text']`` – set by the upload/chat routes when
       the caller already has the extracted text.
    2. ``extracted_json/a.json`` on disk – backward-compatible fallback.
    """
    # 1. Prefer text already carried in the graph state
    doc_text = state.get("document_text")
    if doc_text:
        return f"Uploaded Discharge Summary Text:\n{doc_text}"

    # 2. Fall back to the JSON file on disk
    data = _load_a_json()
    if not data:
        return (
            "No discharge summary found in extracted_json/a.json. "
            "Please upload a PDF to create that file."
        )

    full_text = data.get("full_text") or data.get("text")
    if full_text:
        return f"Uploaded Discharge Summary Text:\n{full_text}"

    return (
        "extracted_json/a.json exists but contains no 'full_text'. "
        "Please regenerate the extracted JSON."
    )
