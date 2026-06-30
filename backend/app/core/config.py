import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Server configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
FAISS_INDEX_DIR = os.path.join(BASE_DIR, "faiss_index")

# Ensure upload and FAISS directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
