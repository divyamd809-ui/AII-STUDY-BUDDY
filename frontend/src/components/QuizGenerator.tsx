import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2, Award, BookOpen } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface Note {
  id: number;
  filename: string;
}

interface QuizGeneratorProps {
  noteId: number | null;
  onStudyComplete?: () => void;
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({ noteId, onStudyComplete }) => {
  // Config state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(noteId ? String(noteId) : 'general');
  const [customTopic, setCustomTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);

  // Play state
  const [quizId, setQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizState, setQuizState] = useState<'config' | 'loading' | 'playing' | 'completed'>('config');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/notes');
        if (response.ok) {
          const data = await response.json();
          setNotes(data);
        }
      } catch (err) {
        console.error('Error fetching notes:', err);
      }
    };
    fetchNotes();
  }, []);

  // Update selected note if parent noteId changes
  useEffect(() => {
    if (noteId) {
      setSelectedNoteId(String(noteId));
      setQuizState('config');
    }
  }, [noteId]);

  const handleStartQuiz = async () => {
    setQuizState('loading');
    
    const payload: any = {
      num_questions: numQuestions
    };
    
    if (selectedNoteId !== 'general') {
      payload.note_id = Number(selectedNoteId);
    } else {
      payload.topic = customTopic.trim() || 'General Study';
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await response.json();
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setCorrectCount(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizState('playing');
    } catch (err) {
      console.error(err);
      setQuizState('config');
      alert('Error generating quiz. Make sure your backend and API key are configured properly.');
    }
  };

  const handleOptionSelect = (option: string) => {
    if (selectedAnswer !== null) return; // Locked after selection
    
    setSelectedAnswer(option);
    const isCorrect = option === questions[currentIndex].answer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Completed! Submit score to backend
      setQuizState('completed');
      if (quizId) {
        try {
          await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              score: correctCount,
              total_questions: questions.length
            }),
          });
          if (onStudyComplete) onStudyComplete(); // trigger dashboard refresh
        } catch (err) {
          console.error('Error submitting quiz score:', err);
        }
      }
    }
  };

  const resetQuiz = () => {
    setQuizState('config');
    setQuestions([]);
    setQuizId(null);
  };

  return (
    <div className="quiz-generator-section animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto' }}>
      
      {/* 1. CONFIGURATION SCREEN */}
      {quizState === 'config' && (
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <HelpCircle size={32} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>Generate Practice Quiz</h2>
            <p style={{ color: 'var(--text-muted)' }}>Generate customized Multiple Choice Questions using AI to test your knowledge.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Note Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Study Material Source</label>
              <select 
                className="input-field" 
                value={selectedNoteId} 
                onChange={(e) => setSelectedNoteId(e.target.value)}
                style={{ background: 'var(--bg-input)' }}
              >
                <option value="general">Custom general topic (No notes source)</option>
                {notes.map(note => (
                  <option key={note.id} value={note.id}>Study note: {note.filename}</option>
                ))}
              </select>
            </div>

            {/* Custom Topic Input */}
            {selectedNoteId === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="animate-fade-in">
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>What topic should we test you on?</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Newton's Laws, Linear Algebra..."
                />
              </div>
            )}

            {/* Num Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Number of Questions</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[3, 5, 10, 15].map((num) => (
                  <button 
                    key={num}
                    onClick={() => setNumQuestions(num)}
                    className="btn"
                    style={{ 
                      flexGrow: 1, 
                      background: numQuestions === num ? 'var(--gradient-primary)' : 'rgba(255, 255, 255, 0.03)',
                      border: numQuestions === num ? 'none' : '1px solid var(--border-color)',
                      color: '#fff'
                    }}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

          </div>

          <button onClick={handleStartQuiz} className="btn btn-primary" style={{ padding: '14px', marginTop: '10px' }}>
            <RefreshCw size={18} /> Start Generating Quiz
          </button>
        </div>
      )}

      {/* 2. LOADING SCREEN */}
      {quizState === 'loading' && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '6px' }}>Tutor is compiling your quiz...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing topics, writing question items, and preparing answers. This should take 15-30 seconds.</p>
          </div>
        </div>
      )}

      {/* 3. PLAYING SCREEN */}
      {quizState === 'playing' && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Progress Header */}
          <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Question <strong style={{ color: '#fff' }}>{currentIndex + 1}</strong> of {questions.length}
            </span>
            
            {/* Simple progress bar */}
            <div style={{ flexGrow: 1, margin: '0 20px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${((currentIndex) / questions.length) * 100}%`, 
                  height: '100%', 
                  background: 'var(--gradient-primary)',
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>

            <span style={{ fontSize: '0.9rem', color: 'var(--color-cyan)', fontWeight: '600' }}>
              Score: {correctCount}
            </span>
          </div>

          {/* Question Card */}
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '600', lineHeight: '1.5' }}>
              {questions[currentIndex].question}
            </h2>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions[currentIndex].options.map((option, optIdx) => {
                const isSelected = selectedAnswer === option;
                const isCorrectAnswer = option === questions[currentIndex].answer;
                const showCorrectStyle = selectedAnswer !== null && isCorrectAnswer;
                const showWrongStyle = isSelected && !isCorrectAnswer;

                let background = 'rgba(255, 255, 255, 0.03)';
                let border = '1px solid var(--border-color)';
                let color = 'var(--text-main)';

                if (showCorrectStyle) {
                  background = 'rgba(16, 185, 129, 0.1)';
                  border = '1px solid rgba(16, 185, 129, 0.4)';
                  color = '#34d399';
                } else if (showWrongStyle) {
                  background = 'rgba(239, 68, 68, 0.1)';
                  border = '1px solid rgba(239, 68, 68, 0.4)';
                  color = '#fca5a5';
                } else if (selectedAnswer !== null) {
                  // options that weren't picked and aren't correct when locked
                  background = 'rgba(255,255,255,0.01)';
                  opacity: 0.5;
                } else if (isSelected) {
                  background = 'var(--gradient-primary)';
                  border = 'none';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(option)}
                    className="btn"
                    disabled={selectedAnswer !== null}
                    style={{
                      justifyContent: 'flex-start',
                      padding: '16px 20px',
                      background,
                      border,
                      color,
                      fontSize: '0.98rem',
                      textAlign: 'left',
                      lineHeight: '1.3'
                    }}
                  >
                    <span style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.08)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginRight: '12px',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span style={{ flexGrow: 1 }}>{option}</span>
                    
                    {showCorrectStyle && <CheckCircle2 size={18} style={{ color: '#34d399', marginLeft: '10px', flexShrink: 0 }} />}
                    {showWrongStyle && <XCircle size={18} style={{ color: '#f87171', marginLeft: '10px', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {/* Answer Explanation */}
            {showExplanation && (
              <div 
                className="animate-fade-in"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: selectedAnswer === questions[currentIndex].answer ? '#34d399' : '#f87171', fontWeight: '600' }}>
                  {selectedAnswer === questions[currentIndex].answer ? (
                    <>
                      <CheckCircle2 size={16} /> Correct Explanation
                    </>
                  ) : (
                    <>
                      <XCircle size={16} /> Incorrect Explanation
                    </>
                  )}
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {questions[currentIndex].explanation}
                </p>
              </div>
            )}

            {/* Next Button */}
            {selectedAnswer !== null && (
              <button onClick={handleNext} className="btn btn-primary" style={{ alignSelf: 'flex-end', minWidth: '150px' }}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                <ArrowRight size={16} />
              </button>
            )}

          </div>
        </div>
      )}

      {/* 4. COMPLETED SCREEN */}
      {quizState === 'completed' && (
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={44} style={{ color: 'rgba(245, 158, 11, 0.9)' }} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>Quiz Completed!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Fantastic job testing your skills. Here is your scorecard:</p>
          </div>

          <div style={{ display: 'flex', gap: '40px', background: 'rgba(255,255,255,0.02)', padding: '24px 40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '10px 0' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                {Math.round((correctCount / questions.length) * 100)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Accuracy Grade</div>
            </div>
            <div style={{ borderRight: '1px solid var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-cyan)' }}>
                {correctCount} / {questions.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Questions Correct</div>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {correctCount === questions.length ? 'Perfect score! You have completely mastered this material.' : 
             correctCount >= questions.length * 0.7 ? 'Great score! You understand this material very well.' :
             'A good attempt! Re-read the summary and try again to improve your score.'}
          </p>

          <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '400px' }}>
            <button onClick={resetQuiz} className="btn btn-secondary" style={{ flexGrow: 1 }}>
              <BookOpen size={16} /> New Quiz Settings
            </button>
            <button onClick={handleStartQuiz} className="btn btn-primary" style={{ flexGrow: 1 }}>
              <RefreshCw size={16} /> Retake Quiz
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
