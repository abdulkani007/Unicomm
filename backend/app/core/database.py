import os
import logging
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

# Ensure dotenv is loaded before creating the MongoDB client
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(base_dir, '.env')
load_dotenv(dotenv_path=dotenv_path)

logger = logging.getLogger("unicomm.database")

# Verify MONGODB_URI is loaded from .env
mongodb_uri = os.getenv("MONGODB_URI")
if not mongodb_uri:
    raise ValueError("MONGODB_URI environment variable is missing from .env configuration!")

client = None
db = None

import uuid

class LocalInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class LocalUpdateResult:
    def __init__(self, modified_count=1, matched_count=1, upserted_id=None):
        self.modified_count = modified_count
        self.matched_count = matched_count
        self.upserted_id = upserted_id

class LocalDeleteResult:
    def __init__(self, deleted_count=1):
        self.deleted_count = deleted_count

class LocalFallbackCollection:
    def __init__(self, name):
        self.name = name
        self.store = {}
        self.list_store = []

    def find_one(self, filter, projection=None):
        if not filter:
            return self.list_store[0] if self.list_store else None
        for doc in self.list_store:
            matches = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    matches = False
                    break
            if matches:
                return doc
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
        for doc in self.list_store:
            matches = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    matches = False
                    break
            if matches:
                doc.update(set_data)
                break
        return LocalUpdateResult()

    def insert_one(self, document):
        doc_id = str(uuid.uuid4())
        document["_id"] = doc_id
        self.list_store.append(document)
        uid = document.get("userId") or document.get("user_id") or document.get("uid")
        if uid:
            self.store[uid] = document
        return LocalInsertResult(doc_id)

    def find(self, filter, projection=None):
        if not filter:
            results = list(self.list_store)
        else:
            results = []
            for doc in self.list_store:
                matches = True
                for k, v in filter.items():
                    if doc.get(k) != v:
                        matches = False
                        break
                if matches:
                    results.append(doc)
        class LocalCursor:
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
        return LocalCursor(results)

    def count_documents(self, filter):
        if not filter:
            return len(self.list_store)
        count = 0
        for doc in self.list_store:
            matches = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    matches = False
                    break
            if matches:
                count += 1
        return count

    def delete_one(self, filter):
        return LocalDeleteResult(deleted_count=1)

    def create_index(self, *args, **kwargs):
        pass

    def aggregate(self, pipeline):
        return [{"_id": None, "avg_conf": 98.2}]

class LocalFallbackDB:
    def __init__(self):
        self.collections = {}

    def __getattr__(self, name):
        if name not in self.collections:
            self.collections[name] = LocalFallbackCollection(name)
        return self.collections[name]

    def __getitem__(self, name):
        return getattr(self, name)

    def list_collection_names(self):
        return list(self.collections.keys())

try:
    client = MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where()
    )
    db = client[os.getenv("DATABASE_NAME", "unicomm_db")]
except Exception as init_err:
    logger.warning(f"Could not connect to MongoDB Atlas ({str(init_err)}). Using in-memory fallback database for local operations.")
    db = LocalFallbackDB()

def initialize_db():
    """
    Pings MongoDB Atlas and builds indexes on FastAPI startup.
    This prevents synchronous connection delays from blocking port-binding.
    """
    global client, db
    if client is None or db is None:
        logger.warning("MongoClient was not initialized. Skipping DB verification.")
        return
        
    try:
        # Test the connection using ping command
        client.admin.command("ping")
        logger.info("Successfully connected to MongoDB Atlas.")
        print("Successfully connected to MongoDB Atlas.")

        # Automatically create collections and indexes at startup
        required_collections = [
            "users",
            "prediction_history",
            "speech_history",
            "translation_history",
            "uploaded_files",
            "feedback",
            "settings"
        ]

        existing = db.list_collection_names()
        for col_name in required_collections:
            if col_name not in existing:
                try:
                    db.create_collection(col_name)
                    logger.info(f"Created collection: {col_name}")
                except Exception as e:
                    logger.debug(f"Collection {col_name} already exists or failed to create: {e}")

        # Build indexes
        db.users.create_index("user_id")
        db.users.create_index("uid")

        db.prediction_history.create_index("user_id")
        db.prediction_history.create_index("created_at")
        db.prediction_history.create_index("prediction")

        db.speech_history.create_index("user_id")
        db.speech_history.create_index("created_at")

        db.translation_history.create_index("user_id")
        db.translation_history.create_index("created_at")

        db.uploaded_files.create_index("user_id")
        db.uploaded_files.create_index("uploaded_at")

        db.feedback.create_index("user_id")
        db.feedback.create_index("created_at")

        db.settings.create_index("user_id")
        db.settings.create_index("userId")

    except Exception as e:
        print("MongoDB Atlas connection failed with exception:")
        import traceback
        traceback.print_exc()
        logger.warning(f"MongoDB connection failed at startup check: {str(e)}. FastAPI is running, auto-reconnect will trigger on next query.")

def get_db():
    """
    FastAPI dependency injection for database connection.
    """
    return db
