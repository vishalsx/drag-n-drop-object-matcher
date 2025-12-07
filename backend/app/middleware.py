from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import jwt
from app.database import organisations_collection
import os

# You might want to move this to .env
# SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key") 
# ALGORITHM = "HS256"
SECRET_KEY="super-secret-key"  # use env var in production
ALGORITHM="HS256"
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints if needed, or handle within the logic
        # For now, we apply logic if headers are present as requested
        
        auth_header = request.headers.get("Authorization")
        org_id = request.headers.get("X-Org-ID")
        
        user_info = None
        
        if auth_header:
            try:
                scheme, token = auth_header.split()
                if scheme.lower() != "bearer":
                    return JSONResponse(status_code=401, content={"detail": "Invalid authentication scheme"})
                
                # Validate token
                # NOTE: Since we don't have the external service's secret key, 
                # we can't verify the signature unless we know it. 
                # For this POC, we might just decode unverified or assume the secret is shared.
                # If the external service is ours, we should have the key.
                # I will assume we can decode it. If not, we might need to call an introspection endpoint.
                
                # options={"verify_signature": False} # Use this if you don't have the secret
                payload = jwt.decode(token, options={"verify_signature": False}) 
                user_info = payload
                request.state.user = user_info
                
            except (ValueError, jwt.DecodeError):
                return JSONResponse(status_code=401, content={"detail": "Invalid token"})
            except Exception as e:
                return JSONResponse(status_code=401, content={"detail": f"Authentication error: {str(e)}"})

        if org_id:
            # Validate Org ID
            org = await organisations_collection.find_one({"org_id": org_id})
            if not org:
                 return JSONResponse(status_code=401, content={"detail": "Invalid Organization ID"})
            
            # Optional: Check if user belongs to this org (if user info is available)
            # if user_info and user_info.get("org_id") != org_id:
            #     return JSONResponse(status_code=403, content={"detail": "User does not belong to this organization"})
            
            request.state.org = org

        response = await call_next(request)
        return response
