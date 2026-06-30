import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Volume2, VolumeX, Eye, HelpCircle, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

interface NoteDetails {
  id: number;
  filename: string;
  summary: string;
}

interface DocumentChatProps {
  noteId: number;
}

export const DocumentChat: React.FC<DocumentChatProps> = ({ noteId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [noteDetails, setNoteDetails] = useState<NoteDetails | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showSourcesIndex, setShowSourcesIndex] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    const fetchNoteDetails = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/notes/${noteId}`);
        if (response.ok) {
          const data = await response.json();
          setNoteDetails(data);
          // Initial greeting
          setMessages([
            {
              sender: 'ai',
              text: `Hi! I've loaded and indexed **${data.filename}**. Ask me any question about this document, or type a concept you need explained!`
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching note details:', err);
      }
    };

    fetchNoteDetails();
    
    // Stop any speech when switching notes
    if (synth) {
      synth.cancel();
      setSpeakingIndex(null);
    }
  }, [noteId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMessageText }]);
    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/notes/${noteId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessageText }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from study assistant');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: data.answer, 
        sources: data.sources 
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Sorry, I encountered an error answering your question. Details: ${err.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = (text: string, index: number) => {
    if (!synth) return;

    if (speakingIndex === index) {
      synth.cancel();
      setSpeakingIndex(null);
      return;
    }

    synth.cancel(); // stop any current speech
    
    // Strip markdown before speaking for a cleaner voice output
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeakingIndex(null);
    };
    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    setSpeakingIndex(index);
    synth.speak(utterance);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', height: 'calc(100vh - 160px)', minHeight: '550px' }}>
      
      {/* Left panel: Info about the active document */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <div>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Active Document
          </h3>
          <h2 style={{ fontSize: '1.25rem', wordBreak: 'break-all', fontWeight: '700' }}>
            {noteDetails ? noteDetails.filename : 'Loading...'}
          </h2>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-muted)' }}>Quick Instructions:</h4>
          <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>Ask specific questions about dates, names, equations, or concepts inside your PDF.</li>
            <li>Use the Speaker icon on any answer to hear the AI explanation out loud.</li>
            <li>Click "Show Sources" to see the exact text paragraphs retrieved from your document.</li>
          </ul>
        </div>

        <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'start', gap: '12px' }}>
          <Sparkles size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            AI searches your notes using semantic vector embeddings (FAISS) to fetch the most relevant knowledge.
          </p>
        </div>
      </div>

      {/* Right panel: Chat Workspace */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Tutor Chat Assistant</h3>
        </div>

        {/* Message Thread */}
        <div style={{ flexGrow: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              style={{ 
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div 
                style={{ 
                  background: msg.sender === 'user' ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.03)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '14px 18px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  fontSize: '0.95rem'
                }}
              >
                <div className="markdown-body">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    // Simple inline bolding formatter
                    const formatted = paragraph.split('**').map((chunk, cIdx) => 
                      cIdx % 2 === 1 ? <strong key={cIdx} style={{ color: '#fff' }}>{chunk}</strong> : chunk
                    );
                    return <p key={pIdx} style={{ marginBottom: pIdx === msg.text.split('\n\n').length - 1 ? 0 : '12px' }}>{formatted}</p>;
                  })}
                </div>
              </div>

              {/* Action Toolbar for AI responses */}
              {msg.sender === 'ai' && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-dim)', paddingLeft: '4px' }}>
                  <button 
                    onClick={() => toggleSpeech(msg.text, index)}
                    style={{ background: 'none', border: 'none', color: speakingIndex === index ? 'var(--color-primary)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    {speakingIndex === index ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {speakingIndex === index ? 'Stop Voice' : 'Read Aloud'}
                  </button>

                  {msg.sources && msg.sources.length > 0 && (
                    <button 
                      onClick={() => setShowSourcesIndex(showSourcesIndex === index ? null : index)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      <Eye size={14} />
                      {showSourcesIndex === index ? 'Hide Sources' : 'Show Sources'}
                    </button>
                  )}
                </div>
              )}

              {/* Retrieved document sources display */}
              {msg.sender === 'ai' && showSourcesIndex === index && msg.sources && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retrieved Context Snippets:</h4>
                  {msg.sources.map((source, sIdx) => (
                    <div key={sIdx} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '2px solid var(--color-cyan)', lineHeight: '1.4' }}>
                      "{source.trim()}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '14px 18px', borderRadius: '16px 16px 16px 0' }}>
              <Loader2 className="animate-spin" size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>AI Tutor is researching...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this document..."
            disabled={loading}
            style={{ flexGrow: 1 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ padding: '12px' }}
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};
