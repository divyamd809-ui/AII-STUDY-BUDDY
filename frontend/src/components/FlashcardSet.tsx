import React, { useState, useEffect } from 'react';
import { Brain, HelpCircle, ArrowLeft, ArrowRight, RotateCw, Check, Loader2, Sparkles } from 'lucide-react';

interface Flashcard {
  id: number;
  front: str;
  back: string;
  box: number;
}

interface Note {
  id: number;
  filename: string;
}

interface FlashcardSetProps {
  noteId: number | null;
  onStudyComplete?: () => void;
}

export const FlashcardSet: React.FC<FlashcardSetProps> = ({ noteId, onStudyComplete }) => {
  // Config state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(noteId ? String(noteId) : 'general');
  const [customTopic, setCustomTopic] = useState('');
  const [numCards, setNumCards] = useState(5);

  // Active play state
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<'config' | 'playing' | 'completed'>('config');

  // Track results for final slide
  const [deckResults, setDeckResults] = useState<{box1: number, box2: number, box3: number}>({ box1: 0, box2: 0, box3: 0 });

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

  // Update selection when parent changes active note
  useEffect(() => {
    if (noteId) {
      setSelectedNoteId(String(noteId));
      setGameState('config');
    }
  }, [noteId]);

  const handleGenerateCards = async () => {
    setLoading(true);
    
    const payload: any = {
      num_cards: numCards
    };
    
    if (selectedNoteId !== 'general') {
      payload.note_id = Number(selectedNoteId);
    } else {
      payload.topic = customTopic.trim() || 'General Study';
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const data = await response.json();
      setCards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setDeckResults({ box1: 0, box2: 0, box3: 0 });
      setGameState('playing');
    } catch (err) {
      console.error(err);
      alert('Failed to generate cards. Please check backend connection and Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeitnerProgress = async (boxValue: number) => {
    const currentCard = cards[currentIndex];
    
    // Save results locally for completed screen
    setDeckResults(prev => {
      const updated = { ...prev };
      if (boxValue === 1) updated.box1 += 1;
      else if (boxValue === 2) updated.box2 += 1;
      else if (boxValue === 3) updated.box3 += 1;
      return updated;
    });

    // Update progress on backend database
    try {
      await fetch(`http://127.0.0.1:8000/api/flashcards/${currentCard.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ box: boxValue }),
      });
      if (onStudyComplete) onStudyComplete(); // trigger dashboard refresh
    } catch (err) {
      console.error('Error logging flashcard progress:', err);
    }

    // Go to next card or complete
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      // Let flip animation reset before changing content
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setGameState('completed');
    }
  };

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  return (
    <div className="flashcards-section animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
      
      {/* CONFIGURATION SCREEN */}
      {gameState === 'config' && (
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '6px' }}>AI Tutor is creating flashcards...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Extracting core terms, definitions, and study concepts. Ready in a moment.</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <Brain size={32} style={{ color: 'var(--color-secondary)' }} />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>Generate Study Flashcards</h2>
                <p style={{ color: 'var(--text-muted)' }}>Generate interactive 3D study cards mapping key vocabulary, terms, or historical timelines.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Note Source */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Study Material Source</label>
                  <select 
                    className="input-field" 
                    value={selectedNoteId} 
                    onChange={(e) => setSelectedNoteId(e.target.value)}
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
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>What topic should we build cards for?</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Basic Spanish Vocabulary, Chemistry Elements, World War II..."
                    />
                  </div>
                )}

                {/* Num Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Number of Flashcards</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[5, 10, 15].map((num) => (
                      <button 
                        key={num}
                        onClick={() => setNumCards(num)}
                        className="btn"
                        style={{ 
                          flexGrow: 1, 
                          background: numCards === num ? 'var(--gradient-primary)' : 'rgba(255, 255, 255, 0.03)',
                          border: numCards === num ? 'none' : '1px solid var(--border-color)',
                          color: '#fff'
                        }}
                      >
                        {num} Cards
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button onClick={handleGenerateCards} className="btn btn-primary" style={{ padding: '14px', marginTop: '10px' }}>
                <Brain size={18} /> Start Generating Deck
              </button>
            </>
          )}

        </div>
      )}

      {/* PLAYING SCREEN */}
      {gameState === 'playing' && cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card counter header */}
          <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Flashcard <strong style={{ color: '#fff' }}>{currentIndex + 1}</strong> of {cards.length}
            </span>
            <div style={{ flexGrow: 1, margin: '0 25px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${((currentIndex) / cards.length) * 100}%`, 
                  height: '100%', 
                  background: 'var(--gradient-secondary)',
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCw size={14} /> Click card to flip
            </span>
          </div>

          {/* 3D Flipping Card Container */}
          <div className="flashcard-container">
            <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
              
              {/* Card Front */}
              <div className="flashcard-front">
                <h3 style={{ fontSize: '1.45rem', fontWeight: '600', color: '#fff', wordBreak: 'break-word', lineHeight: '1.4' }}>
                  {cards[currentIndex].front}
                </h3>
                <span className="flashcard-indicator">Concept / Term</span>
              </div>

              {/* Card Back */}
              <div className="flashcard-back">
                <h3 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#e0e7ff', wordBreak: 'break-word', lineHeight: '1.5' }}>
                  {cards[currentIndex].back}
                </h3>
                <span className="flashcard-indicator" style={{ color: 'var(--color-secondary)' }}>Definition / Explanation</span>
              </div>

            </div>
          </div>

          {/* Controller / Leitner Evaluation toolbar */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            {isFlipped ? (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Did you recall this correctly?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <button 
                    onClick={() => handleLeitnerProgress(1)} 
                    className="btn btn-secondary" 
                    style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', background: 'rgba(239, 68, 68, 0.02)' }}
                  >
                    Still Learning
                  </button>
                  <button 
                    onClick={() => handleLeitnerProgress(2)} 
                    className="btn btn-secondary"
                    style={{ border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.02)' }}
                  >
                    Familiar
                  </button>
                  <button 
                    onClick={() => handleLeitnerProgress(3)} 
                    className="btn btn-secondary"
                    style={{ border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', background: 'rgba(16, 185, 129, 0.02)' }}
                  >
                    Mastered
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleFlip} className="btn btn-secondary" style={{ width: '100%', gap: '8px' }}>
                <RotateCw size={16} /> Flip Card to Reveal Answer
              </button>
            )}
          </div>

        </div>
      )}

      {/* COMPLETED SCREEN */}
      {gameState === 'completed' && (
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={44} style={{ color: 'var(--color-secondary)' }} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>Deck Completed!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Your active recall deck has been finished. Let's see your retention:</p>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', width: '100%', background: 'rgba(255,255,255,0.02)', padding: '24px 30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f87171' }}>{deckResults.box1}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Still Learning</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>{deckResults.box2}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Familiar</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399' }}>{deckResults.box3}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Mastered</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '400px' }}>
            <button onClick={() => setGameState('config')} className="btn btn-secondary" style={{ flexGrow: 1 }}>
              Configure New Deck
            </button>
            <button onClick={handleGenerateCards} className="btn btn-primary" style={{ flexGrow: 1, background: 'var(--gradient-secondary)' }}>
              Restart Study
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
