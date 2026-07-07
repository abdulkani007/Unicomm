import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    """
    Creates a pytest TestClient instance for backend API integration tests.
    """
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_auth_headers():
    """
    Generates standard bearer authorization headers with a mock token.
    """
    return {"Authorization": "Bearer mock-token-user123"}

@pytest.fixture
def mock_admin_headers():
    """
    Generates bearer authorization headers with a mock admin token.
    """
    return {"Authorization": "Bearer mock-token-admin"}
