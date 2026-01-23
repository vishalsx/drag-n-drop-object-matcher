import httpx
import os
import logging
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

async def trigger_embeddings_update(object_id: str, translation_id: Optional[str] = None):
    """
    Calls the external embeddings update API in the background.
    """
    url = os.getenv("EXTERNAL_EMBEDDINGS_UPDATE_URL", "http://localhost:8000/embeddings/update")
    
    params = {"object_id": object_id}
    if translation_id:
        params["translation_id"] = translation_id
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            logger.info(f"Triggering embeddings update for object_id: {object_id}, translation_id: {translation_id}")
            # The API takes parameters as query params based on the signature provided (FastAPI default for simple types)
            # or as JSON if requested. Usually, @router.post with simple types expects query params or form data.
            # But the signature has `background_tasks: BackgroundTasks = None` which is a dependency.
            # object_id: str and translation_id: Optional[str] will be query params by default in FastAPI POST if not in a model.
            response = await client.post(url, params=params)
            
            if response.status_code == 200:
                logger.info(f"Successfully triggered embeddings update for {object_id}")
            else:
                logger.error(f"Failed to trigger embeddings update for {object_id}: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error triggering embeddings update for {object_id}: {str(e)}")
