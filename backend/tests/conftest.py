import sys
from unittest.mock import MagicMock

# Create a mock database implementation for pytest
class MockCollection:
    def __init__(self, name):
        self.name = name
        self.store = {}
        self.list_store = []

    def find_one(self, filter, projection=None):
        uid = filter.get("uid") or filter.get("userId") or filter.get("user_id")
        if uid in self.store:
            return self.store[uid]
        return None

    def update_one(self, filter, update, upsert=False):
        uid = filter.get("uid") or filter.get("userId") or filter.get("user_id")
        set_data = update.get("$set", {})
        if uid not in self.store:
            self.store[uid] = {}
        self.store[uid].update(set_data)
        return MagicMock()

    def insert_one(self, document):
        self.list_store.append(document)
        document["_id"] = "mock_id"
        uid = document.get("userId") or document.get("user_id")
        if uid:
            self.store[uid] = document
        return MagicMock(inserted_id="mock_id")

    def find(self, filter, projection=None):
        uid = filter.get("userId") or filter.get("user_id")
        results = [doc for doc in self.list_store if doc.get("userId") == uid or doc.get("user_id") == uid]
        
        class MockCursor:
            def __init__(self, data):
                self.data = data
            def sort(self, *args, **kwargs):
                return self
            def skip(self, *args, **kwargs):
                return self
            def limit(self, *args, **kwargs):
                return self
            def __iter__(self):
                return iter(self.data)
        return MockCursor(results)

    def count_documents(self, filter):
        uid = filter.get("userId") or filter.get("user_id")
        return sum(1 for doc in self.list_store if doc.get("userId") == uid or doc.get("user_id") == uid)

    def delete_one(self, filter):
        return MagicMock(deleted_count=1)

    def create_index(self, *args, **kwargs):
        pass

    def aggregate(self, pipeline):
        # Handle simple aggregation for stats
        avg_val = 98.2
        return [{"_id": None, "avg_conf": avg_val}]

class MockDB:
    def __init__(self):
        self.collections = {}

    def __getattr__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]

    def list_collection_names(self):
        return list(self.collections.keys())

# Inject mock db before importing app
mock_database_instance = MockDB()

# Setup defaults for the test user settings
mock_database_instance.settings.update_one({"userId": "user123"}, {"$set": {
    "userId": "user123",
    "interfaceLanguage": "en",
    "speechSpeed": 1.0,
    "theme": "dark",
    "highContrast": False,
    "largeText": False,
    "cameraResolution": "720p"
}})

# Mock the entire app.core.database module
class MockDatabaseModule:
    db = mock_database_instance
    client = MagicMock()
    mongodb_atlas = MagicMock()
    @staticmethod
    def get_db():
        return mock_database_instance

sys.modules['app.core.database'] = MockDatabaseModule

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
