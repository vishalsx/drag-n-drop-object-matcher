from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from typing import Optional
from gtts import gTTS
from gtts.lang import tts_langs
import base64
import io
import hashlib
import logging
from app.redis_connection import redis_client, TTS_CACHE_TTL
from app.routers.languages import get_language_code

router = APIRouter(prefix="", tags=["TTS Service"])

# ---------- Setup logging ----------
logger = logging.getLogger(__name__)

# ---------- Request schema ----------
class TTSRequest(BaseModel):
    text: str
    languageCode: str = "en"
    languageName: Optional[str] = None  # Optional - used in contest mode (e.g., "Hindi", "Bengali")

# ---------- Helper functions ----------
def _generate_cache_key(text: str, lang: str) -> str:
    """Generate a stable SHA256-based Redis cache key."""
    key_hash = hashlib.sha256(f"{lang}:{text}".encode("utf-8")).hexdigest()
    return f"tts:{lang}:{key_hash}"

async def _generate_tts_audio(text: str, language: str) -> str:
    """Generate Base64-encoded MP3 audio using gTTS."""
    supported_langs = tts_langs()  # dict of supported languages

    if language not in supported_langs:
        logger.warning(f"TTS skipped: Language '{language}' is not supported. Supported languages: {list(supported_langs.keys())}")
        return None


    tts = gTTS(text=text, lang=language)
    audio_stream = io.BytesIO()
    tts.write_to_fp(audio_stream)
    audio_stream.seek(0)
    audio_base64 = base64.b64encode(audio_stream.read()).decode("utf-8")
    return f"data:audio/mpeg;base64,{audio_base64}"

# ---------- API endpoint ----------
@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Converts input text to speech using gTTS.
    Attempts to use Redis for caching, but continues gracefully if Redis is unavailable.
    """
    text = req.text.strip()
    
    # Resolve language: prefer languageName if provided (contest mode), otherwise use languageCode
    if req.languageName:
        # Use the get_language_code helper to resolve language name to ISO code
        language_code = await get_language_code(req.languageName)
        language = language_code.split('-')[0]  # normalize like 'hi-IN' → 'hi'
        logger.info(f"[TTS] Resolved languageName '{req.languageName}' to '{language}'")
    else:
        # If languageName is not provided, use languageCode and resolve it
        language_code = await get_language_code(req.languageCode)
        language = language_code.split('-')[0]  # normalize like 'en-US' → 'en'
    
    print(f"TTS text:{text}\nTTS Language:{language}")
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    logger.info(f"[TTS] Request: text='{text[:20]}...', resolved_lang='{language}'")

    cache_key = _generate_cache_key(text, language)

    cached_audio = None
    try:
        # Try fetching from Redis cache
        cached_audio = redis_client.get(cache_key)
    except Exception as e:
        logger.error(f"Redis fetch error: {e}")

    if cached_audio:
        logger.info(f"[TTS] Cache hit for '{language}'")
        return {"audioBase64": cached_audio, "cached": True}

    try:
        # Generate new TTS
        audio_data_uri = await _generate_tts_audio(text, language)

        if audio_data_uri is None:
            logger.warning(f"[TTS] Generation skipped: Language '{language}' not supported by gTTS.")
            return {"audioBase64": None, "cached": False, "error": "Unsupported language"}

        # Try to store in Redis (non-fatal)
        try:
            redis_client.set(cache_key, audio_data_uri, ex=TTS_CACHE_TTL)
        except Exception as e:
            logger.error(f"Redis set error: {e}")

        logger.info(f"[TTS] Successfully generated audio for '{language}'")
        return {"audioBase64": audio_data_uri, "cached": False}

    except Exception as e:
        logger.error(f"[TTS] Generation failed for '{text[:20]}' in '{language}': {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
