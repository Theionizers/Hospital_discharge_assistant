from typing import cast
import fitz

def extract_text(file_path: str) -> str:
    document = fitz.open(file_path)

    try:
        pages = []

        for page in document:
            page_text = cast(str, page.get_text("text"))
            pages.append(page_text)

        return "\n".join(pages)

    finally:
        document.close()