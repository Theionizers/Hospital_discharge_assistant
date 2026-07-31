import json
from functools import lru_cache
from pathlib import Path

from Ai.State.Graph_state import Hopitaldata


SAMPLE_DISCHARGE_PATH = Path("Ai/sample_discharge.json")


@lru_cache(maxsize=1)
def load_sample_discharge() -> dict:
    with open(SAMPLE_DISCHARGE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def get_discharge_context(state: Hopitaldata, *sections: str) -> str:
    document_text = state.get("document_text")
    if document_text:
        return f"Uploaded Discharge Summary Text:\n{document_text}"

    sample_data = load_sample_discharge()
    selected_sections = sections or tuple(sample_data.keys())

    context_parts = []
    for section in selected_sections:
        section_title = section.replace("_", " ").title()
        section_data = sample_data.get(section, {})
        context_parts.append(
            f"{section_title}:\n{json.dumps(section_data, indent=2)}"
        )

    return "\n\n".join(context_parts)
