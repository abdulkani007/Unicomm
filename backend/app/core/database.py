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
    # Initialize PyMongo using required client block (securing connection with certifi CA bundle)
    client = MongoClient(
        os.getenv("MONGODB_URI"),
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where()
    )

    db = client[os.getenv("DATABASE_NAME", "unicomm_db")]

    # Test the connection using ping command
    client.admin.command("ping")

    # Log successful connection
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
    # Print the complete exception
    print("MongoDB Atlas connection failed with exception:")
    import traceback
    traceback.print_exc()
    logger.warning(f"MongoDB connection failed at startup: {str(e)}. FastAPI will boot and attempt auto-reconnect on-demand.")
    # Initialize client and db fallback so other modules don't crash on import
    if client is None:
        try:
            client = MongoClient(
                os.getenv("MONGODB_URI"),
                serverSelectionTimeoutMS=5000,
                tlsCAFile=certifi.where()
            )
        except Exception:
            pass
    if db is None and client is not None:
        db = client[os.getenv("DATABASE_NAME", "unicomm_db")]

def get_db():
    """
    FastAPI dependency injection for database connection.
    """
    return db
