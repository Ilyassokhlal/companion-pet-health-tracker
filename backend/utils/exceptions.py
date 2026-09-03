
# Utility exceptions for the application
class AppException(Exception):
    """Base exception for all application errors"""
    # `code` is a stable machine-readable key the clients translate.
    # `params` carries the interpolation values so a translated string can rebuild the sentence.
    # `detail` stays as the English fallback so older clients keep working.
    code = "error"

    def __init__(self, detail: str, status_code: int = 400, code: str | None = None, **params):
        self.detail = detail
        self.status_code = status_code
        if code:
            self.code = code
        self.params = params
        super().__init__(detail)

class NotFoundException(AppException):
    """Resource not found (404)"""
    code = "not_found"

    def __init__(self, resource: str, resource_id):
        super().__init__(
            detail=f"{resource} with id {resource_id} not found",
            status_code=404,
            resource=resource,
            resource_id=resource_id,
        )

class DuplicateException(AppException):
    """Duplicate resource conflict (409)"""
    code = "duplicate"

    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            detail=f"{resource} with {field} '{value}' already exists",
            status_code=409,
            resource=resource,
            field=field,
        )

class BadRequestException(AppException):
    """Invalid business logic or bad client request (400)"""
    code = "bad_request"

    def __init__(self, detail: str = "Bad request", code: str | None = None, **params):
        super().__init__(detail=detail, status_code=400, code=code, **params)

class UnauthorizedException(AppException):
    """Authentication failed or missing (401)"""
    code = "unauthorized"

    def __init__(self, detail: str = "Not authenticated", code: str | None = None, **params):
        super().__init__(detail=detail, status_code=401, code=code, **params)

class ServiceUnavailableException(AppException):
    """An upstream dependency is unreachable (503)"""
    code = "service_unavailable"

    def __init__(self, detail: str = "Service temporarily unavailable", code: str | None = None, **params):
        super().__init__(detail=detail, status_code=503, code=code, **params)

class InternalException(AppException):
    """An unexpected server-side failure (500)"""
    code = "internal_error"

    def __init__(self, detail: str = "Internal server error", code: str | None = None, **params):
        super().__init__(detail=detail, status_code=500, code=code, **params)