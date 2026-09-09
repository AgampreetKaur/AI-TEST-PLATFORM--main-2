# AI Test Paper Generation & Homework Validation System

An AI-powered educational assessment platform for teachers. Teachers upload NCERT chapter material, and the system generates test papers, answer keys, and lets students ask chapter-grounded doubts through an AI Tutor.

## Features

- **Chapter Management** — Upload chapter PDFs (including scanned/OCR-based) and store them for reuse.
- **Test Paper Generator** — Generates MCQs, short-answer, and long-answer questions with an answer key, formatted for printing with space for written answers. Supports multiple paper sets per chapter.
- **AI Tutor (Chatbot)** — Students can ask doubts about a specific chapter. Answers are generated using Retrieval-Augmented Generation (RAG), so responses are grounded strictly in the uploaded chapter content rather than the model's general knowledge.
- **Homework Validation** *(in progress)* — Planned module for OCR-based extraction and evaluation of handwritten student answers against chapter content.
- **Reports & Analytics** — Dashboard view of usage and generated papers.

## Project Structure

```
internship-project/
├── index.html, generator.html, chatbot.html, ...   # Frontend pages
├── generator-app.js, chatbot-app.js, ...            # Frontend logic (React via CDN + Babel)
├── layouts/                                          # Shared Sidebar, Header, DashboardLayout
├── utils/api.js                                      # Shared frontend API helper
├── components/                                       # Shared UI components
├── backend/                                           # AI Tutor backend (FastAPI)
│   ├── app/
│   │   ├── main.py                                   # FastAPI app entry point
│   │   ├── config.py
│   │   ├── models/schemas.py                         # Request/response schemas
│   │   ├── routers/                                  # chapters.py, chat.py
│   │   └── services/                                 # chunking, embeddings, RAG engine, vector store
│   ├── run.py                                         # Run the backend server
│   ├── requirements.txt
│   └── .env.example                                   # Copy to .env and fill in secrets (not committed)
└── README.md
```

## Architecture

```
┌────────────────────┐        REST API        ┌───────────────────────┐
│   Frontend Portal   │  ───────────────────▶  │   Backend (FastAPI)   │
│  (React + Tailwind, │      /chat              │                       │
│   served as static  │      /chapters          │  ChromaDB (vectors)  │
│   HTML pages)        │  ◀───────────────────  │  Gemini (LLM answers)│
└────────────────────┘        JSON response      └───────────────────────┘
```

**Chapter upload → OCR/text extraction → chunking → embeddings stored in ChromaDB → student question → relevant chunks retrieved → Gemini generates an answer grounded in those chunks.**

## Running the Frontend

The frontend is plain HTML pages with React loaded via CDN — no build step required.

1. Open the project folder with a local static server (e.g. VS Code's Live Server extension).
2. Open `index.html` (dashboard) in the browser.

> Note: some modules read/write to `localStorage` for chapter data used by the Test Generator; this is separate from the backend's own chapter storage used by the AI Tutor (see below).

## Running the Backend

**Requires Python 3.11** (Python 3.12 causes build failures for `chroma-hnswlib` on Windows due to missing prebuilt wheels — install 3.11 specifically if you don't already have it).

```bash
cd backend
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1        # Windows PowerShell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Set up environment variables:

```bash
copy .env.example .env
```

Then edit `.env` and set at minimum:

```
GEMINI_API_KEY=your_key_here          # from https://aistudio.google.com/apikey
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500
```

Run the server:

```bash
python run.py
```

The API will be live at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

## Connecting Frontend to Backend

In `chatbot-app.js`:

```js
const BACKEND_CONNECTED = true;
const CHAT_ENDPOINT = "http://127.0.0.1:8000/chat";
```

The AI Tutor's chapter dropdown is populated live from the backend's `GET /chapters` endpoint, so only chapters that have actually been uploaded to the backend (via `POST /chapters/upload`) will be available for chat.

## Tech Stack

- **Frontend:** React 18 (CDN), Tailwind CSS, Babel Standalone
- **Backend:** FastAPI, ChromaDB (vector store), Google Gemini (`gemini-2.5-flash`), Sentence-Transformers (local embeddings), PyMuPDF + Tesseract OCR (document ingestion)

## Current Status

| Module | Status |
|---|---|
| Chapter Upload / OCR | ✅ Working |
| Test Paper Generator | ✅ Working |
| AI Tutor (Chat) | ✅ Working — backend connected, tested end-to-end |
| Homework Validation | 🟡 In progress |
| Login / Signup | 🟡 In progress |

**Known gaps / next steps:**
- Only one chapter is currently loaded into the backend's vector store for testing. The remaining chapters need to be uploaded via `POST /chapters/upload` before the AI Tutor can answer questions on them.
- The `grounded` flag in chat responses currently returns `false` even for accurate, chapter-based answers — likely a threshold tuning issue in `rag_engine.py`.

## Security Note

`backend/.env` contains a live Gemini API key and is excluded via `.gitignore`. Never commit this file. Share `.env.example` (which has no real values) instead, and each collaborator should create their own local `.env`.
