import os
import shutil
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import UPLOAD_DIR, PORT, FAISS_INDEX_DIR
from app.core.database import init_db, get_db_connection
from app.services.llm import LLMService
from app.services.vector_store import VectorStoreService
from app.models import schemas

app = FastAPI(title="AI Study Buddy API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
llm_service = LLMService()
vector_service = VectorStoreService()

# Initialize DB on Startup
@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def read_root():
    return {"message": "AI Study Buddy API is running. Set GEMINI_API_KEY to enable AI features."}

# ==========================================
# NOTES ENDPOINTS
# ==========================================

@app.post("/api/notes/upload", response_model=schemas.SummaryResponse)
async def upload_note(file: UploadFile = File(...)):
    # Verify file extension
    filename = file.filename
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")
    
    # Define file path
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # Save file locally
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Insert note record to database to get note_id
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notes (filename, file_path, summary) VALUES (?, ?, ?)",
        (filename, file_path, "Processing...")
    )
    note_id = cursor.lastrowid
    conn.commit()
    
    # Extract text and build study materials
    extracted_text = ""
    try:
        if filename.endswith(".pdf"):
            extracted_text = vector_service.extract_text_from_pdf(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
                
        if not extracted_text.strip():
            # Cleanup DB entry and file
            cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
            conn.close()
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="The file contains no readable text.")
            
        # Create Vector Store index
        vector_service.create_index(note_id, extracted_text)
        
        # Generate summary
        summary = llm_service.generate_summary(extracted_text)
        
        # Save summary back to database
        cursor.execute("UPDATE notes SET summary = ? WHERE id = ?", (summary, note_id))
        conn.commit()
        
        # Log study session (uploading & parsing counts as 2 minutes of start session)
        cursor.execute(
            "INSERT INTO study_sessions (duration_minutes, activity_type) VALUES (?, ?)",
            (2, "read_summary")
        )
        conn.commit()
        conn.close()
        
        return {"summary": summary}
        
    except Exception as e:
        # Cleanup on failure
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed processing study note: {str(e)}")

@app.get("/api/notes")
def get_notes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, created_at, length(summary) as summary_length FROM notes ORDER BY id DESC")
    rows = cursor.fetchall()
    notes = [dict(row) for row in rows]
    conn.close()
    return notes

@app.get("/api/notes/{note_id}")
def get_note(note_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found.")
    return dict(row)

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get note details
    cursor.execute("SELECT file_path FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found.")
        
    file_path = row["file_path"]
    
    # Delete database record
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    # Delete related quizzes and flashcards
    cursor.execute("DELETE FROM quizzes WHERE note_id = ?", (note_id,))
    cursor.execute("DELETE FROM flashcards WHERE note_id = ?", (note_id,))
    conn.commit()
    conn.close()
    
    # Delete file
    if os.path.exists(file_path):
        os.remove(file_path)
        
    # Delete FAISS index
    index_path = os.path.join(FAISS_INDEX_DIR, f"note_{note_id}")
    if os.path.exists(index_path):
        shutil.rmtree(index_path)
        
    return {"message": f"Note {note_id} and associated files/indexes deleted successfully."}

# ==========================================
# CHAT ENDPOINTS (TALK TO PDF)
# ==========================================

@app.post("/api/notes/{note_id}/chat", response_model=schemas.ChatResponse)
def chat_with_note(note_id: int, request: schemas.ChatRequest):
    try:
        answer, sources = vector_service.chat_with_note(note_id, request.question)
        
        # Log study session (each message counts as 1 minute of active study chat)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO study_sessions (duration_minutes, activity_type) VALUES (?, ?)",
            (1, "chat")
        )
        conn.commit()
        conn.close()
        
        return {"answer": answer, "sources": sources}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# QUIZ ENDPOINTS
# ==========================================

@app.post("/api/quizzes/generate", response_model=schemas.QuizResponse)
def generate_quiz(request: schemas.QuizRequest):
    text_content = ""
    topic = request.topic or "General Study"
    
    if request.note_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT summary, filename FROM notes WHERE id = ?", (request.note_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Note not found.")
        text_content = row["summary"]
        topic = row["filename"]
        
    # Generate quiz questions using Gemini
    questions = llm_service.generate_quiz(text_content, topic, request.num_questions)
    
    # Save the generated quiz template into SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO quizzes (note_id, topic, score, total_questions, questions_data) VALUES (?, ?, ?, ?, ?)",
        (request.note_id, topic, None, len(questions), json.dumps(questions))
    )
    quiz_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "quiz_id": quiz_id,
        "topic": topic,
        "questions": questions
    }

@app.post("/api/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, request: schemas.QuizSubmitRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify quiz exists
    cursor.execute("SELECT id FROM quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found.")
        
    # Update quiz score
    cursor.execute(
        "UPDATE quizzes SET score = ?, total_questions = ? WHERE id = ?",
        (request.score, request.total_questions, quiz_id)
    )
    
    # Log study session (each quiz session is logged as 5 minutes of study session)
    cursor.execute(
        "INSERT INTO study_sessions (duration_minutes, activity_type) VALUES (?, ?)",
        (5, "quiz")
    )
    
    conn.commit()
    conn.close()
    return {"message": "Quiz scores saved successfully."}

@app.get("/api/quizzes")
def get_quizzes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM quizzes WHERE score IS NOT NULL ORDER BY id DESC")
    rows = cursor.fetchall()
    quizzes = [dict(row) for row in rows]
    conn.close()
    return quizzes

# ==========================================
# FLASHCARD ENDPOINTS
# ==========================================

@app.post("/api/flashcards/generate", response_model=schemas.FlashcardResponse)
def generate_flashcards(request: schemas.FlashcardRequest):
    text_content = ""
    topic = request.topic or "General Study"
    
    if request.note_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT summary, filename FROM notes WHERE id = ?", (request.note_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Note not found.")
        text_content = row["summary"]
        topic = row["filename"]
        
    # Generate cards using Gemini
    cards = llm_service.generate_flashcards(text_content, topic, request.num_cards)
    
    # Save generated cards to database
    conn = get_db_connection()
    cursor = conn.cursor()
    saved_cards = []
    for card in cards:
        cursor.execute(
            "INSERT INTO flashcards (note_id, topic, front, back, box) VALUES (?, ?, ?, ?, 1)",
            (request.note_id, topic, card["front"], card["back"])
        )
        card_id = cursor.lastrowid
        saved_cards.append({
            "id": card_id,
            "front": card["front"],
            "back": card["back"],
            "box": 1
        })
        
    conn.commit()
    conn.close()
    
    return {
        "topic": topic,
        "flashcards": saved_cards
    }

@app.get("/api/flashcards", response_model=List[schemas.FlashcardItem])
def get_flashcards(note_id: Optional[int] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if note_id:
        cursor.execute("SELECT * FROM flashcards WHERE note_id = ? ORDER BY id DESC", (note_id,))
    else:
        cursor.execute("SELECT * FROM flashcards ORDER BY id DESC")
    rows = cursor.fetchall()
    cards = [dict(row) for row in rows]
    conn.close()
    return cards

@app.put("/api/flashcards/{card_id}/progress")
def update_flashcard_progress(card_id: int, request: schemas.FlashcardProgressUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM flashcards WHERE id = ?", (card_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Flashcard not found.")
        
    cursor.execute(
        "UPDATE flashcards SET box = ? WHERE id = ?",
        (request.box, card_id)
    )
    
    # Log active study (updating card counts as 1 minute of study time)
    cursor.execute(
        "INSERT INTO study_sessions (duration_minutes, activity_type) VALUES (?, ?)",
        (1, "flashcards")
    )
    
    conn.commit()
    conn.close()
    return {"message": "Flashcard progress updated."}

# ==========================================
# PROGRESS AND SESSION TRACKING ENDPOINTS
# ==========================================

@app.post("/api/study/session")
def create_study_session(session: schemas.StudySessionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO study_sessions (duration_minutes, activity_type) VALUES (?, ?)",
        (session.duration_minutes, session.activity_type)
    )
    conn.commit()
    conn.close()
    return {"message": "Study session logged."}

@app.get("/api/progress/stats", response_model=schemas.ProgressStats)
def get_progress_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total study minutes
    cursor.execute("SELECT SUM(duration_minutes) FROM study_sessions")
    total_minutes = cursor.fetchone()[0] or 0
    
    # 2. Quizzes completed count
    cursor.execute("SELECT COUNT(*) FROM quizzes WHERE score IS NOT NULL")
    quizzes_count = cursor.fetchone()[0] or 0
    
    # 3. Average quiz score
    cursor.execute("SELECT score, total_questions FROM quizzes WHERE score IS NOT NULL")
    quiz_rows = cursor.fetchall()
    avg_score = 0.0
    if quiz_rows:
        percentages = [(r["score"] / r["total_questions"]) * 100 for r in quiz_rows if r["total_questions"] > 0]
        avg_score = sum(percentages) / len(percentages)
        
    # 4. Flashcards statistics
    cursor.execute("SELECT COUNT(*) FROM flashcards")
    total_flashcards = cursor.fetchone()[0] or 0
    
    # Mastered cards (in Box 3)
    cursor.execute("SELECT COUNT(*) FROM flashcards WHERE box = 3")
    mastered_flashcards = cursor.fetchone()[0] or 0
    
    # 5. Recent Activity Feed (Mix notes, quizzes, flashcards, sessions)
    recent_activities = []
    
    # Fetch recent study sessions
    cursor.execute("SELECT duration_minutes, activity_type, created_at FROM study_sessions ORDER BY id DESC LIMIT 5")
    sessions = cursor.fetchall()
    for s in sessions:
        recent_activities.append({
            "type": "session",
            "title": f"Studied {s['activity_type'].replace('_', ' ').title()}",
            "detail": f"{s['duration_minutes']} min study session",
            "time": s["created_at"]
        })
        
    # Fetch recent note uploads
    cursor.execute("SELECT filename, created_at FROM notes ORDER BY id DESC LIMIT 5")
    notes = cursor.fetchall()
    for n in notes:
        recent_activities.append({
            "type": "note",
            "title": "Uploaded Notes",
            "detail": f"Processed and indexed {n['filename']}",
            "time": n["created_at"]
        })
        
    # Sort recent activities by time descending
    recent_activities.sort(key=lambda x: x["time"], reverse=True)
    recent_activities = recent_activities[:6]
    
    conn.close()
    
    return {
        "total_study_minutes": total_minutes,
        "quizzes_taken": quizzes_count,
        "average_quiz_score": round(avg_score, 1),
        "flashcards_total": total_flashcards,
        "flashcards_mastered": mastered_flashcards,
        "recent_activities": recent_activities
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
