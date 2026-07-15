from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("unicomm.exceptions")

class UniCommException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class AuthenticationError(UniCommException):
    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)

class NotFoundError(UniCommException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)

class PredictionError(UniCommException):
    def __init__(self, message: str = "ML Inference failed"):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)

async def unicomm_exception_handler(request: Request, exc: UniCommException):
    logger.error(f"Application error: {exc.message} on path {request.url.path}")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.message}
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on path {request.url.path}: {exc.errors()}")
    errors = [{"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]} for err in exc.errors()]
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "error": "Validation failed", "details": errors}
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled system error on path {request.url.path}: {str(exc)}")
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": "Internal server error. Please try again later."}
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response
