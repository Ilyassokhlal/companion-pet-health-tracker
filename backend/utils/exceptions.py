

# Utility exceptions for the application
class AppException(Exception):
    """Base exception for all application errors"""
    def __init__(self, detail: str, status_code: int=400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)

class NotFoundException(AppException):
    """Resource not found (404)"""
    def __init__(self, resource: str, resource_id):
        super().__init__(
            detail=f"{resource} with id {resource_id} not found",
            status_code=404
        )

class DuplicateException(AppException):
    """Duplicate resource conflict (409)"""
    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            detail=f"{resource} with {field} '{value}' already exists",
            status_code=409 
        )

class BadRequestException(AppException):
    """Invalid business logic or bad client request (400)"""
    def __init__(self, detail: str = "Bad request"):
        super().__init__(detail=detail, status_code=400)

class ForbiddenException(AppException):
    """The user does not have permission to access this resource (403)"""
    def __init__(self, detail: str = "You do not have permission to access this resource"):
        super().__init__(detail=detail, status_code=403)