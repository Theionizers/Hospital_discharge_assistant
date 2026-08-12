import io

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

client = OpenAI()


async def speech_to_text(audio_bytes: bytes, filename: str) -> str:
    if not any(
        filename.lower().endswith(ext)
        for ext in (".webm", ".wav", ".mp3", ".ogg", ".m4a", ".mp4", ".flac")
    ):
        filename = filename + ".webm"

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    print(f"STT | Sending {len(audio_bytes)} bytes to Whisper (name={filename})")

    transcript = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file,
    )

    result_text = _extract_text(transcript)
    print(f"STT | Raw transcript: {repr(result_text)}")

    if not result_text.strip():
        print("STT | Empty transcript - retrying with whisper-1 ...")
        audio_file2 = io.BytesIO(audio_bytes)
        audio_file2.name = filename
        transcript2 = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file2,
        )
        result_text = _extract_text(transcript2)
        print(f"STT | whisper-1 transcript: {repr(result_text)}")

    return result_text.strip()


async def text_to_speech(text: str) -> bytes:
    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=text,
        response_format="mp3",
    )

    audio_bytes = getattr(response, "content", None)

    if not audio_bytes:
        print("TTS returned empty audio bytes or no 'content' field on response.")
        return b""

    return audio_bytes


def _extract_text(transcript) -> str:
    if hasattr(transcript, "text"):
        return transcript.text or ""
    if isinstance(transcript, dict):
        return transcript.get("text", "")
    return str(transcript)
