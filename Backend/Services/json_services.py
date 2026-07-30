import json
import os


JSON_DIR = "extracted_json"
os.makedirs(JSON_DIR, exist_ok=True)


def save_extracted_json(stored_filename: str, extracted_data: dict) -> str:
    json_filename = stored_filename.replace(".pdf", ".json")
    json_path = os.path.join(JSON_DIR, json_filename)

    with open(json_path, "w", encoding="utf-8") as file:
        json.dump(extracted_data, file, indent=4, ensure_ascii=False)

    return json_path


def read_extracted_json(json_path: str) -> dict:
    with open(json_path, "r", encoding="utf-8") as file:
        return json.load(file)