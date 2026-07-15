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

try:
    client = MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where()
    )
    db = client[os.getenv("DATABASE_NAME", "unicomm_db")]
except Exception as init_err:
    logger.error(f"Failed to instantiate MongoClient: {str(init_err)}")

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
