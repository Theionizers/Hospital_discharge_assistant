from typing import cast
import fitz


def extract_pages(file_path: str) -> dict:
    document = fitz.open(file_path)

    try:
        pages = []

        for page_number, page in enumerate(document, start=1):
            page_text = cast(str, page.get_text("text"))

            pages.append({
                "page_number": page_number,
                "text": page_text
            })

        full_text = "\n".join(page["text"] for page in pages)

        return {
            "pages": pages,
            "full_text": full_text
        }

    finally:
        document.close()