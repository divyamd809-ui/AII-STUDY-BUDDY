import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, BookOpen, MessageSquare, Brain, HelpCircle, Check, Loader2 } from 'lucide-react';

interface Note {
  id: number;
  filename: string;
  created_at: string;
  summary_length: number;
}

interface NoteUploadProps {
  onSelectNote: (noteId: number, targetTab: string) => void;
  activeNoteId: number | null;
}

export const NoteUpload: React.FC<NoteUploadProps> = ({ onSelectNote, activeNoteId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setSuccess(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const isPdf = file.name.endsWith('.pdf');
    const isTxt = file.name.endsWith('.txt');
    
    if (!isPdf && !isTxt) {
      setError('Only PDF and TXT files are supported.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/notes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      setSuccess(`"${file.name}" uploaded and indexed successfully!`);
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || 'Server error uploading file. Make sure backend is running and GEMINI_API_KEY is configured.');
    } finally {
      setUploading(false);
    }
  };

  const deleteNote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study note and all its generated materials?')) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/notes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== id));
        if (activeNoteId === id) {
          onSelectNote(-1, 'dashboard'); // reset active note
        }
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="note-uploader-section animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* File Dropzone Panel */}
      <div 
        className={`glass-panel ${dragActive ? 'pulse-glow' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          padding: '40px',
          textAlign: 'center',
          border: dragActive ? '2px dashed var(--color-primary)' : '1px dashed var(--border-color)',
          background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <input 
          type="file" 
          id="file-upload-input" 
          accept=".pdf,.txt" 
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {uploading ? (
            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-primary)' }} />
          ) : (
            <Upload size={48} style={{ color: 'var(--text-muted)' }} />
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>
              {uploading ? 'Processing note & generating index...' : 'Upload your study notes'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {uploading ? 'This might take a minute depending on the document length.' : 'Drag & drop PDF or TXT files, or click to browse'}
            </p>
          </div>
        </label>

        {error && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#a7f3d0', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Check size={16} />
            {success}
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} style={{ color: 'var(--color-primary)' }} />
          Your Study Notes ({notes.length})
        </h2>
        
        {notes.length === 0 ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <BookOpen size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No documents uploaded yet. Upload a PDF above to begin learning!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {notes.map((note) => (
              <div 
                key={note.id} 
                className={`glass-panel ${activeNoteId === note.id ? 'pulse-glow' : ''}`}
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'between',
                  gap: '20px',
                  borderLeft: activeNoteId === note.id ? '4px solid var(--color-primary)' : '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', wordBreak: 'break-all', fontWeight: '600' }}>{note.filename}</h3>
                    <button 
                      onClick={(e) => deleteNote(note.id, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                      title="Delete document"
                    >
                      <Trash2 size={18} className="hover-red" style={{ transition: 'color 0.2s' }} />
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                    Uploaded {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => onSelectNote(note.id, 'summary')} 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  >
                    <BookOpen size={14} /> Summary
                  </button>
                  <button 
                    onClick={() => onSelectNote(note.id, 'chat')} 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  >
                    <MessageSquare size={14} /> AI Chat
                  </button>
                  <button 
                    onClick={() => onSelectNote(note.id, 'flashcards')} 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  >
                    <Brain size={14} /> Flashcards
                  </button>
                  <button 
                    onClick={() => onSelectNote(note.id, 'quizzes')} 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  >
                    <HelpCircle size={14} /> Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
