from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from gtts import gTTS
from gtts.lang import tts_langs
import base64
import io
import hashlib
import logging
from app.redis_connection import redis_client, TTS_CACHE_TTL

router = APIRouter(prefix="", tags=["TTS Service"])

# ---------- Setup logging ----------
logger = logging.getLogger(__name__)

# ---------- Request schema ----------
class TTSRequest(BaseModel):
    text: str
    languageCode: str = "en"

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
    language = req.languageCode.split('-')[0]  # normalize like 'en-US' → 'en'

    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    cache_key = _generate_cache_key(text, language)

    cached_audio = None
    try:
        # Try fetching from Redis cache
        cached_audio = redis_client.get(cache_key)
    except Exception as e:
        logger.error(f"Redis fetch error: {e}")

    if cached_audio:
        return {"audioBase64": cached_audio, "cached": True}

    try:
        # Generate new TTS
        audio_data_uri = await _generate_tts_audio(text, language)

        # Try to store in Redis (non-fatal)
        if audio_data_uri is not None:
            try:
                redis_client.set(cache_key, audio_data_uri, ex=TTS_CACHE_TTL)
            except Exception as e:
                logger.error(f"Redis set error: {e}")

        return {"audioBase64": audio_data_uri, "cached": False}

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail="TTS generation failed.")
