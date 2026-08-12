from fastapi import APIRouter

from Backend.Routes import chat, document_upload, voice


router = APIRouter()

router.include_router(document_upload.router)
router.include_router(chat.router)
router.include_router(voice.router)
