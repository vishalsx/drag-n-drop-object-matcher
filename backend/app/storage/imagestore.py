
from PIL import Image
import io
from fastapi import UploadFile, HTTPException
import base64
from datetime import datetime, timezone
from typing import Union, Any

# --- Storage clients ---
from app.storage.storage_config import STORAGE_PROVIDER, BUCKET_NAME, CDN_BASE_URL, s3_client, gcs_client

from botocore.exceptions import ClientError


async def image_to_base64(image: Union[UploadFile, bytes, str, Image.Image]) -> str:
    """
    Convert any image into original base64 (preserves original quality).
    """
    # Return original image as base64 without normalization
    if hasattr(image, 'read') and hasattr(image, 'file'):  # Check for UploadFile-like object
        image_bytes = await image.read()
        image.file.seek(0)
        return base64.b64encode(image_bytes).decode("utf-8")
    elif isinstance(image, bytes):
        return base64.b64encode(image).decode("utf-8")
    elif isinstance(image, str):
        # If already base64, return as-is (strip prefix if present)
        return image.split(",")[1] if "," in image else image
    elif isinstance(image, Image.Image):
        # Convert PIL image to bytes then base64
        buffer = io.BytesIO()
        img_format = image.format if image.format else "PNG"
        image.save(buffer, format=img_format)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    else:
        raise ValueError(f"Unsupported input type: {type(image)}")
    
 

async def retrieve_image (image_store: dict) -> str:
    # To be called whenever a real image has to be retrieved from storage. E.g.in Worklists, Thumbnail, Hints game...
    # Returns stored image as a file based on search on image_hash
    # extract the image_store attributes from  object colletion and calls get function to retrieve image from bucket.
    storage_provider = image_store.get("storage_provider")
    object_key = image_store.get("object_key")

    if not storage_provider or not object_key:
        raise HTTPException(status_code=400, detail="Invalid image_store dict")

    try:
        if storage_provider == "aws_s3":
            # Fetch from AWS S3
            response = s3_client.get_object(Bucket=BUCKET_NAME, Key=object_key)
            image_data = response["Body"].read()

        elif storage_provider == "gcs":
            # Fetch from Google Cloud Storage
            client = gcs_client.Client()
            bucket = client.bucket(BUCKET_NAME)
            blob = bucket.blob(object_key)
            image_data = blob.download_as_bytes()

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported storage provider: {storage_provider}")

        # Convert to base64
        image_base64 = await image_to_base64(image_data)
        return image_base64

    except ClientError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Unable to retrieve {object_key} from {storage_provider}: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error retrieving image: {str(e)}"
        )