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

class LocalFallbackCollection:
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
        return True

    def insert_one(self, document):
        self.list_store.append(document)
        document["_id"] = "local_id"
        uid = document.get("userId") or document.get("user_id") or document.get("uid")
        if uid:
            self.store[uid] = document
        return document

    def find(self, filter, projection=None):
        uid = filter.get("userId") or filter.get("user_id") or filter.get("uid")
        results = [doc for doc in self.list_store if doc.get("userId") == uid or doc.get("user_id") == uid or doc.get("uid") == uid] if uid else self.list_store
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
        return len(self.list_store)

    def delete_one(self, filter):
        return True

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
