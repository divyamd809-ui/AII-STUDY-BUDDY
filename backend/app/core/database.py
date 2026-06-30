import os
import sqlite3
import json

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "study_buddy.db")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Notes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Quizzes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER,
        topic TEXT NOT NULL,
        score INTEGER,
        total_questions INTEGER,
        questions_data TEXT, -- JSON representation of the questions & choices
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
    )
    """)
    
    # 3. Flashcards table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER,
        topic TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        box INTEGER DEFAULT 1, -- Leitner progress box: 1, 2, 3
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
    )
    """)
    
    # 4. Study Sessions table (for progress tracking charts)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        duration_minutes INTEGER NOT NULL,
        activity_type TEXT NOT NULL, -- 'read_summary', 'quiz', 'flashcards', 'chat'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()
