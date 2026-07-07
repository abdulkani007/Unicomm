# UniComm AI - Multimodal Communication Platform for Deaf & Speech-Impaired Individuals

UniComm AI is a production-grade, cloud-based communication SaaS platform that leverages advanced artificial intelligence and serverless computing to bridge the dialogue gap between Deaf, Speech-Impaired, and Hearing individuals. 

---

## Technical Architecture & Core Design Decisions

The application follows a decoupled client-server architecture built around MVC and clean architecture principles.

```
+------------------------------------+          +------------------------------------+
|        React 19 Frontend           |          |        FastAPI Backend             |
|   (Vite, TS, Tailwind, Shadcn)     |          |       (Python 3.8+, Uvicorn)       |
+-----------------+------------------+          +-----------------+------------------+
                  |                                               |
                  | <================ REST / HTTPS =============> |
                  |                                               |
  +---------------+---------------+               +---------------+---------------+
  | MediaPipe Hands (WebAssembly) |               | TensorFlow Inference Engine   |
  |  - Landmark coordinates       |               |  - LSTM Sequence Predictor    |
  |  - 30 frame buffer queues     |               |  - Whisper STT / Google TTS   |
  +-------------------------------+               +---------------+---------------+
                                                                  |
                                                  +---------------+---------------+
                                                  |   Google Firestore DB         |
                                                  |   Google Cloud Storage        |
                                                  +-------------------------------+
```

### Key Decisions:
1. **Client-Side MediaPipe Landmark Extraction**: Instead of streaming heavy raw video from the client's webcam to the server (saturating bandwidth and increasing latency), the client-side browser runs MediaPipe Hands compiled in WebAssembly. The browser extracts 21 3D landmarks coordinates per hand (126 features) and sends only this light-weight sequence to the backend `/predict/sign` endpoint.
2. **Keras Sequence LSTM Classifier**: A sequence classification model processes the coordinates temporal arrays over 30 frames (approx. 1 second) to identify signs, ensuring high prediction confidence with low latency.
3. **Mock Mode Fallbacks**: In local development or sandbox testing, both the backend and frontend dynamically fall back to simulated modes if Google Cloud credentials or OpenAI Whisper API keys are missing. This allows immediate execution out of the box.

---

## Directory Structure

```
UniComm_AI/
├── .github/workflows/deploy.yml   # CI/CD Cloud Run deployment workflow
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/      # API endpoints (Auth, Dashboard, ML, History, Settings)
│   │   ├── core/                  # Middleware: Auth verification, Rate limiting, Exceptions
│   │   ├── schemas/               # Pydantic schema validation structures
│   │   ├── services/              # Service layers: ML Model, Whisper, TTS, Firestore
│   │   ├── config.py              # Settings loader
│   │   └── main.py                # FastAPI entry point
│   ├── assets/                    # Compiled TensorFlow baseline models
│   ├── scripts/                   # Model training and generation scripts
│   ├── tests/                     # Pytest unit & integration test suites
│   ├── Dockerfile                 # Hardened Docker container build
│   └── requirements.txt           # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/layout/     # Base Layout, header controls, sidebar
│   │   ├── context/               # Accessibility preferences & Auth contexts
│   │   ├── pages/                 # UI pages (Dashboard, Translation console, History, Settings)
│   │   ├── services/              # API Client mapping
│   │   ├── App.tsx                # Routing definitions
│   │   ├── index.css              # Styling design tokens & dark/contrast configs
│   │   └── main.tsx               # App mount node
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: v18+
- **Python**: v3.8+ (tested on Python 3.8.10)
- **Docker** (optional)

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the model training pipeline to generate the baseline `.h5` model:
   ```bash
   python scripts/train_model.py
   ```
5. Configure environment variables (create a `.env` file in the `backend/` directory):
   ```env
   FIREBASE_PROJECT_ID=unicomm-ai-demo
   MODEL_PATH=assets/sign_model.h5
   ALLOWED_HOSTS=*
   OPENAI_API_KEY=your_openai_whisper_api_key  # Optional: runs in mock if empty
   GOOGLE_APPLICATION_CREDENTIALS=path_to_gcp_creds.json  # Optional: falls back to native TTS if empty
   ```
6. Start the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Configure environment variables (create a `.env` file in the `frontend/` directory):
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   VITE_FIREBASE_API_KEY=your_firebase_key  # Optional: triggers mock auth if empty
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```

---

## Testing & Quality Assurance

The backend includes a comprehensive test suite covering routing, auth middleware, database CRUD, and model prediction logic.

To run the backend tests:
1. Make sure you are in the `backend` folder and the virtual environment is activated.
2. Execute pytest:
   ```bash
   pytest
   ```

---

## Docker Containerization

To run the backend inside a secure Docker container locally:
1. Build the Docker image:
   ```bash
   docker build -t unicomm-backend ./backend
   ```
2. Run the container:
   ```bash
   docker run -p 8080:8080 unicomm-backend
   ```

---

## CI/CD & Deployment

This repository includes a GitHub Actions CI/CD configuration (`.github/workflows/deploy.yml`) that automatically builds, tags, and deploys the backend container to Google Cloud Run whenever changes are pushed to the `main` branch.

### GCP Secret Configurations:
Make sure to add the following secrets to your GitHub repository secrets:
- `GCP_PROJECT_ID`: Your Google Cloud Project ID.
- `GCP_SA_KEY`: The JSON service account key with permissions to push to Artifact Registry and deploy to Cloud Run.
- `FIREBASE_PROJECT_ID`: Your Firebase project identifier.
- `OPENAI_API_KEY`: Your OpenAI API key for Whisper.
