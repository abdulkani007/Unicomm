import os
import logging
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings
from app.core.exceptions import AuthenticationError

logger = logging.getLogger("unicomm.auth")
security_bearer = HTTPBearer(auto_error=False)

# Initialize Firebase SDK
firebase_initialized = False

try:
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and not os.path.isabs(cred_path):
        import app
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(app.__file__)))
        cred_path = os.path.join(base_dir, cred_path)

    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        logger.info(f"Firebase Admin SDK initialized with service account certificate: {cred_path}")
    else:
        # Initialize with project ID from settings options
        options = {}
        if settings.FIREBASE_PROJECT_ID:
            options['projectId'] = settings.FIREBASE_PROJECT_ID
        firebase_admin.initialize_app(options=options)
        firebase_initialized = True
        logger.info(f"Firebase Admin SDK initialized with options (Project ID: {settings.FIREBASE_PROJECT_ID}).")
except Exception as e:
    logger.warning(f"Firebase Admin SDK not initialized: {str(e)}. Running in MOCK AUTH MODE.")
    firebase_initialized = False

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> dict:
    if not credentials:
        raise AuthenticationError("Authorization credentials missing")
    
    token = credentials.credentials
    
    # Check if the token is a mock token
    if token.startswith("mock-token-"):
        logger.debug("Using mock auth validation for mock token")
        if token == "mock-token-admin":
            return {"uid": "mock-admin-uid", "email": "admin@unicomm.ai", "name": "Mock Admin", "role": "admin"}
        else:
            uid = token.replace("mock-token-", "")
            return {"uid": uid, "email": f"{uid}@unicomm.ai", "name": f"Mock User {uid}", "role": "user"}

    # If not a mock token, require Firebase initialized and verify
    if not firebase_initialized:
        raise AuthenticationError("Firebase auth is not initialized, and this is not a mock token. Use 'mock-token-<uid>'.")

    try:
        decoded_token = auth.verify_id_token(token)
        # Add basic custom claims role evaluation
        role = decoded_token.get("role", "user")
        decoded_token["role"] = role
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise AuthenticationError(f"Token verification failed: {str(e)}")

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permissions required"
        )
    return user
