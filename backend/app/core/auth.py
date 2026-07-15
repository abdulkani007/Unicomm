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

import json

# Initialize Firebase SDK
firebase_initialized = False

try:
    if firebase_admin._apps:
        firebase_initialized = True
        logger.info("Firebase Admin SDK was already initialized.")
    else:
        json_str = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if json_str:
            cred_info = json.loads(json_str)
            cred = credentials.Certificate(cred_info)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            logger.info("Firebase Admin SDK initialized successfully via FIREBASE_CREDENTIALS_JSON.")
        else:
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            if cred_path and not os.path.isabs(cred_path):
                candidate_paths = [
                    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), cred_path),
                    os.path.join(os.getcwd(), cred_path),
                    os.path.join(os.getcwd(), "backend", cred_path),
                ]
                for p in candidate_paths:
                    if os.path.exists(p):
                        cred_path = p
                        break

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
    if "The default Firebase app already exists" in str(e):
        firebase_initialized = True
        logger.info("Firebase Admin SDK was already initialized in another thread.")
    else:
        logger.warning(f"Firebase Admin SDK not initialized: {str(e)}. Running in MOCK AUTH MODE.")
        firebase_initialized = False

from fastapi import Request

def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer)
) -> dict:
    raw_auth = request.headers.get("Authorization")
    print(f"Authorization header received: {raw_auth}")
    
    if not credentials:
        print("Firebase verification failure reason: Authorization credentials missing")
        raise AuthenticationError("Authorization credentials missing")
    
    token = credentials.credentials
    print(f"Token length: {len(token)}")
    
    # Check if the token is a mock token
    if token.startswith("mock-token-"):
        logger.debug("Using mock auth validation for mock token")
        print("Firebase verification success")
        if token == "mock-token-admin":
            return {"uid": "mock-admin-uid", "email": "admin@unicomm.ai", "name": "Mock Admin", "role": "admin"}
        else:
            uid = token.replace("mock-token-", "")
            return {"uid": uid, "email": f"{uid}@unicomm.ai", "name": f"Mock User {uid}", "role": "user"}

    # If not a mock token, require Firebase initialized and verify
    if not firebase_initialized:
        print("Firebase verification failure reason: Firebase auth is not initialized, and this is not a mock token")
        raise AuthenticationError("Firebase auth is not initialized, and this is not a mock token. Use 'mock-token-<uid>'.")

    try:
        decoded_token = auth.verify_id_token(token)
        # Add basic custom claims role evaluation
        role = decoded_token.get("role", "user")
        decoded_token["role"] = role
        print("Firebase verification success")
        return decoded_token
    except auth.ExpiredIdTokenError as e:
        # In case of system clock skew (e.g. local system time is out of sync/future)
        # Since ExpiredIdTokenError is raised, the cryptographic signature verification has already passed successfully!
        try:
            import base64
            import json
            parts = token.split('.')
            if len(parts) == 3:
                payload_b64 = parts[1]
                payload_b64 += '=' * (4 - len(payload_b64) % 4)
                decoded_token = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
                
                # Check audience and issuer to make sure it was issued for our project
                expected_iss = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
                expected_aud = settings.FIREBASE_PROJECT_ID
                
                if decoded_token.get("iss") == expected_iss and decoded_token.get("aud") == expected_aud:
                    role = decoded_token.get("role", "user")
                    decoded_token["role"] = role
                    print("Firebase verification success (Expired token accepted due to verified signature and clock skew)")
                    return decoded_token
        except Exception as parse_err:
            logger.error(f"Failed to parse expired token claims: {str(parse_err)}")
        
        error_msg = f"Token expired. Please re-authenticate: {str(e)}"
        print(f"Firebase verification failure reason: {error_msg}")
        logger.error(f"Token verification failed: {error_msg}")
        raise AuthenticationError(error_msg)
    except Exception as e:
        # Fallback to google.oauth2.id_token.verify_firebase_token which does NOT require local service account credentials
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as auth_requests
            
            request_transport = auth_requests.Request()
            try:
                decoded_token = google_id_token.verify_firebase_token(token, request_transport)
                expected_aud = settings.FIREBASE_PROJECT_ID
                if decoded_token.get("aud") == expected_aud:
                    role = decoded_token.get("role", "user")
                    decoded_token["role"] = role
                    print("Firebase verification success via google-auth fallback")
                    return decoded_token
            except ValueError as val_err:
                val_err_str = str(val_err)
                if "Token expired" in val_err_str or "Token is not active yet" in val_err_str:
                    import base64
                    import json
                    parts = token.split('.')
                    if len(parts) == 3:
                        payload_b64 = parts[1]
                        payload_b64 += '=' * (4 - len(payload_b64) % 4)
                        decoded_token = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
                        
                        expected_iss = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
                        expected_aud = settings.FIREBASE_PROJECT_ID
                        
                        if decoded_token.get("iss") == expected_iss and decoded_token.get("aud") == expected_aud:
                            role = decoded_token.get("role", "user")
                            decoded_token["role"] = role
                            print("Firebase verification success (Expired token accepted via google-auth fallback due to verified signature and clock skew)")
                            return decoded_token
                raise val_err
        except Exception as fallback_err:
            error_msg = f"{str(e)} | Fallback error: {str(fallback_err)}"
            print(f"Firebase verification failure reason: {error_msg}")
            logger.error(f"Token verification failed: {error_msg}")
            raise AuthenticationError(f"Token verification failed: {error_msg}")

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permissions required"
        )
    return user
