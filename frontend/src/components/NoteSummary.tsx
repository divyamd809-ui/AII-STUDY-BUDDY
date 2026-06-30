import React, { useState, useEffect } from 'react';
import { BookOpen, Volume2, VolumeX, Brain, HelpCircle, Loader2 } from 'lucide-react';

interface NoteDetails {
  id: number;
  filename: string;
  summary: string;
}

interface NoteSummaryProps {
  noteId: number;
  onGenerateQuiz: () => void;
  onGenerateFlashcards: () => void;
}

export const NoteSummary: React.FC<NoteSummaryProps> = ({ noteId, onGenerateQuiz, onGenerateFlashcards }) => {
  const [note, setNote] = useState<NoteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/notes/${noteId}`);
        if (response.ok) {
          const data = await response.json();
          setNote(data);
        }
      } catch (err) {
        console.error('Error fetching note summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();

    // Stop speaking when switching notes
    if (synth) {
      synth.cancel();
      setSpeaking(false);
    }
  }, [noteId]);

  // Clean up voice synthesis on unmount
  useEffect(() => {
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!synth || !note) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    // Strip markdown formatting before reading
    const cleanText = note.summary
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeaking(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
    };

    setSpeaking(true);
    synth.speak(utterance);
  };

  // Simple custom Markdown rendering to display headings, bolding, and bullet points
  const renderFormattedSummary = (summaryText: string) => {
    if (!summaryText) return <p>No summary generated yet.</p>;

    const lines = summaryText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} style={{ fontSize: '1.75rem', margin: '20px 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>{trimmed.slice(2)}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} style={{ fontSize: '1.4rem', margin: '18px 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} style={{ fontSize: '1.15rem', margin: '14px 0 6px 0' }}>{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.slice(2);
        // format bold text: **text**
        const formatted = content.split('**').map((chunk, cIdx) => 
          cIdx % 2 === 1 ? <strong key={cIdx} style={{ color: '#fff', fontWeight: '600' }}>{chunk}</strong> : chunk
        );
        return <li key={idx} style={{ marginLeft: '20px', marginBottom: '8px', listStyleType: 'disc' }}>{formatted}</li>;
      }
      if (trimmed === '') {
        return <div key={idx} style={{ height: '8px' }} />;
      }
      
      const formatted = trimmed.split('**').map((chunk, cIdx) => 
        cIdx % 2 === 1 ? <strong key={cIdx} style={{ color: '#fff', fontWeight: '600' }}>{chunk}</strong> : chunk
      );
      return <p key={idx} style={{ marginBottom: '10px', fontSize: '0.98rem', color: 'rgba(243, 244, 246, 0.9)' }}>{formatted}</p>;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Retrieving study guide...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No document selected. Please upload/select a note first.</p>
      </div>
    );
  }

  return (
    <div className="note-summary-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Summary Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Study Summary
          </h3>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {note.filename}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={toggleSpeech}
            className={`btn ${speaking ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minWidth: '150px' }}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {speaking ? 'Stop Speaking' : 'Read Aloud'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '40px', lineHeight: '1.7' }}>
        <div className="markdown-body">
          {renderFormattedSummary(note.summary)}
        </div>
      </div>

      {/* Study Trigger Shortcuts */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--color-cyan)' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Ready to test your knowledge?</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Let the AI tutor generate custom practice quizzes or flashcards based directly on this summary guide.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
          <button onClick={onGenerateFlashcards} className="btn btn-primary" style={{ background: 'var(--gradient-secondary)', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)' }}>
            <Brain size={16} /> Generate Flashcards
          </button>
          <button onClick={onGenerateQuiz} className="btn btn-primary">
            <HelpCircle size={16} /> Generate Practice Quiz
          </button>
        </div>
      </div>

    </div>
  );
};
