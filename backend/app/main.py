import sys
import types
import numpy
try:
    import numpy.core.multiarray as _orig_multiarray
    numpy_core = types.ModuleType("numpy._core")
    numpy_core_multiarray = types.ModuleType("numpy._core.multiarray")
    numpy_core_multiarray._reconstruct = _orig_multiarray._reconstruct
    numpy_core_multiarray.scalar = _orig_multiarray.scalar
    sys.modules["numpy._core"] = numpy_core
    sys.modules["numpy._core.multiarray"] = numpy_core_multiarray
except Exception:
    pass

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import (
    UniCommException,
    unicomm_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.core.security import setup_security
from app.api.v1.router import api_router

# Setup logger before initiating app
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="UniComm AI - Cloud-Based Multimodal Communication Platform for Deaf and Speech-Impaired Individuals Backend"
)

@app.on_event("startup")
def startup_db_client():
    from app.core.database import db


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup security middlewares (Rate limit, security headers)
setup_security(app)

# Register custom exception handlers
app.add_exception_handler(UniCommException, unicomm_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include main router
app.include_router(api_router, prefix=settings.API_V1_STR)



@app.get("/health", status_code=status.HTTP_200_OK, tags=["system"])
async def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "api_version": "v1.0.0"
    }

@app.get("/", tags=["system"])
async def root():
    """
    Root endpoint redirecting to information or API docs.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API. Please navigate to {settings.API_V1_STR}/docs for API documentation."
    }
