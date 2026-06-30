import { useState, useEffect } from 'react';
import { NoteUpload } from './components/NoteUpload';
import { DocumentChat } from './components/DocumentChat';
import { NoteSummary } from './components/NoteSummary';
import { QuizGenerator } from './components/QuizGenerator';
import { FlashcardSet } from './components/FlashcardSet';
import { ProgressTracker } from './components/ProgressTracker';

import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  MessageSquare, 
  Brain, 
  HelpCircle, 
  BarChart3, 
  Sparkles,
  BookOpenCheck,
  AlertCircle
} from 'lucide-react';

interface StatsOverview {
  total_study_minutes: number;
  quizzes_taken: number;
  average_quiz_score: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [activeNoteName, setActiveNoteName] = useState<string>('');
  const [overviewStats, setOverviewStats] = useState<StatsOverview>({
    total_study_minutes: 0,
    quizzes_taken: 0,
    average_quiz_score: 0
  });

  const fetchOverviewStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/progress/stats');
      if (response.ok) {
        const data = await response.json();
        setOverviewStats({
          total_study_minutes: data.total_study_minutes,
          quizzes_taken: data.quizzes_taken,
          average_quiz_score: data.average_quiz_score
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, [activeTab]);

  const handleSelectNote = async (id: number, targetTab: string) => {
    if (id === -1) {
      setActiveNoteId(null);
      setActiveNoteName('');
      setActiveTab('notes');
      return;
    }

    setActiveNoteId(id);
    setActiveTab(targetTab);
    
    // Fetch filename
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/notes/${id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveNoteName(data.filename);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'notes':
        return <NoteUpload onSelectNote={handleSelectNote} activeNoteId={activeNoteId} />;
      case 'summary':
        return activeNoteId ? (
          <NoteSummary 
            noteId={activeNoteId} 
            onGenerateQuiz={() => setActiveTab('quizzes')} 
            onGenerateFlashcards={() => setActiveTab('flashcards')} 
          />
        ) : (
          renderNoNoteFallback('Study Summary')
        );
      case 'chat':
        return activeNoteId ? (
          <DocumentChat noteId={activeNoteId} />
        ) : (
          renderNoNoteFallback('AI Tutor Chat')
        );
      case 'quizzes':
        return <QuizGenerator noteId={activeNoteId} onStudyComplete={fetchOverviewStats} />;
      case 'flashcards':
        return <FlashcardSet noteId={activeNoteId} onStudyComplete={fetchOverviewStats} />;
      case 'progress':
        return <ProgressTracker />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Welcome Card */}
        <div className="glass-panel" style={{ padding: '40px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)', borderLeft: '4px solid var(--color-primary)' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            Welcome to AI Study Buddy <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '750px', lineHeight: '1.6' }}>
            Your personal smart study assistant. Upload documents to generate comprehensive summaries, hold contextual chat conversations, test your recall skills with 3D flashcards, and run generated quizzes.
          </p>
        </div>

        {/* Overview Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Duration</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{overviewStats.total_study_minutes} mins</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)' }}>
              <BookOpenCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quizzes Done</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{overviewStats.quizzes_taken}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)' }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Accuracy</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{overviewStats.average_quiz_score}%</div>
            </div>
          </div>

        </div>

        {/* Quick Start Guide */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px' }}>Quick Start Study Modules</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            <div 
              className="glass-panel" 
              onClick={() => setActiveTab('notes')}
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <FileText size={24} style={{ color: 'var(--color-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>1. Upload Notes</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload textbook chapters or draft lecture PDFs to parse and index knowledge.</p>
            </div>

            <div 
              className="glass-panel"
              onClick={() => setActiveTab('quizzes')}
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <HelpCircle size={24} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>2. Generate Quiz</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI creates customized multiple-choice tests to evaluate retention of topics.</p>
            </div>

            <div 
              className="glass-panel"
              onClick={() => setActiveTab('flashcards')}
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <Brain size={24} style={{ color: 'var(--color-secondary)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>3. Review Flashcards</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Study vocabulary definitions or core formulas with 3D active recall decks.</p>
            </div>

          </div>
        </div>

      </div>
    );
  };

  const renderNoNoteFallback = (moduleName: string) => {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <AlertCircle size={48} style={{ color: 'var(--color-cyan)' }} />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>No Study Notes Selected</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
            To view the {moduleName} module, you must first upload a study note document or select an active document from your list.
          </p>
        </div>
        <button onClick={() => setActiveTab('notes')} className="btn btn-primary">
          Go to Note Uploader
        </button>
      </div>
    );
  };

  return (
    <div className="app-container">
      
      {/* Background Glowing Orbs */}
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* App Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} style={{ color: '#fff' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.02em', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            STUDY BUDDY
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'dashboard' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'dashboard' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button 
            onClick={() => setActiveTab('notes')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'notes' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'notes' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'notes' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <FileText size={18} /> Study Notes
          </button>

          <button 
            onClick={() => setActiveTab('summary')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'summary' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'summary' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'summary' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <BookOpen size={18} /> Summary Guide
          </button>

          <button 
            onClick={() => setActiveTab('chat')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'chat' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'chat' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'chat' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <MessageSquare size={18} /> Tutor AI Chat
          </button>

          <button 
            onClick={() => setActiveTab('quizzes')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'quizzes' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'quizzes' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'quizzes' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <HelpCircle size={18} /> Practice Quiz
          </button>

          <button 
            onClick={() => setActiveTab('flashcards')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'flashcards' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'flashcards' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'flashcards' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <Brain size={18} /> Flashcards
          </button>

          <button 
            onClick={() => setActiveTab('progress')} 
            className="btn"
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'progress' ? 'rgba(255,255,255,0.05)' : 'none',
              borderLeft: activeTab === 'progress' ? '3px solid var(--color-primary)' : '3px solid transparent',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              color: activeTab === 'progress' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <BarChart3 size={18} /> Progress Stats
          </button>

        </nav>

        {/* Selected Document Info Badge */}
        {activeNoteId && (
          <div className="glass-panel" style={{ marginTop: 'auto', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Active Study context</span>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', wordBreak: 'break-all', display: 'block' }}>{activeNoteName}</span>
          </div>
        )}

      </aside>

      {/* Main Study Panel */}
      <main className="main-content">
        {renderActiveTabContent()}
      </main>

    </div>
  );
}
