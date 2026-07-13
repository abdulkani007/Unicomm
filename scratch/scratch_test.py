import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scratch_test")

try:
    import soundfile as sf
    logger.info("Imported soundfile successfully.")
    formats = sf.available_formats()
    logger.info(f"Available formats: {formats}")
except Exception as e:
    logger.error(f"Failed: {str(e)}", exc_info=True)
    sys.exit(1)
