from pydantic import BaseModel
from typing import List, Optional

# Chat Schemas
class ChatRequest(BaseModel):
    note_id: Optional[int] = None
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]

# Summary Schemas
class SummaryResponse(BaseModel):
    summary: str

# Quiz Schemas
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str  # The correct option text (should match one of options)
    explanation: str

class QuizRequest(BaseModel):
    note_id: Optional[int] = None
    topic: Optional[str] = "General"
    num_questions: int = 5

class QuizResponse(BaseModel):
    quiz_id: int
    topic: str
    questions: List[QuizQuestion]

class QuizSubmitRequest(BaseModel):
    score: int
    total_questions: int

# Flashcard Schemas
class FlashcardItem(BaseModel):
    id: Optional[int] = None
    front: str
    back: str
    box: int = 1

class FlashcardRequest(BaseModel):
    note_id: Optional[int] = None
    topic: Optional[str] = "General"
    num_cards: int = 5

class FlashcardResponse(BaseModel):
    topic: str
    flashcards: List[FlashcardItem]

class FlashcardProgressUpdate(BaseModel):
    box: int

# Study Session
class StudySessionCreate(BaseModel):
    duration_minutes: int
    activity_type: str  # 'read_summary', 'quiz', 'flashcards', 'chat'

# Stats Response
class ProgressStats(BaseModel):
    total_study_minutes: int
    quizzes_taken: int
    average_quiz_score: float
    flashcards_total: int
    flashcards_mastered: int
    recent_activities: List[dict]
