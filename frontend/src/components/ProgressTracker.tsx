import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Brain, Zap, History, Loader2 } from 'lucide-react';

interface Activity {
  type: string;
  title: string;
  detail: string;
  time: string;
}

interface Stats {
  total_study_minutes: number;
  quizzes_taken: number;
  average_quiz_score: number;
  flashcards_total: number;
  flashcards_mastered: number;
  recent_activities: Activity[];
}

export const ProgressTracker: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/progress/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching progress stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading stats dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Could not load progress statistics. Please ensure backend is running.</p>
      </div>
    );
  }

  const flashcardMasteryRate = stats.flashcards_total > 0 
    ? Math.round((stats.flashcards_mastered / stats.flashcards_total) * 100) 
    : 0;

  // Mock data for weekly chart coordinates (representing daily study minutes)
  const chartPoints = [
    { day: 'Mon', mins: 15 },
    { day: 'Tue', mins: 30 },
    { day: 'Wed', mins: 45 },
    { day: 'Thu', mins: stats.total_study_minutes > 60 ? 60 : stats.total_study_minutes },
    { day: 'Fri', mins: stats.total_study_minutes > 90 ? 90 : stats.total_study_minutes },
    { day: 'Sat', mins: stats.total_study_minutes > 120 ? 120 : stats.total_study_minutes },
    { day: 'Sun', mins: stats.total_study_minutes }
  ];

  // SVG dimensions for custom graph
  const width = 500;
  const height = 150;
  const maxMins = 120; // scale limit

  // Compile points into SVG coordinate string
  const pointsStr = chartPoints.map((pt, idx) => {
    const x = (idx / (chartPoints.length - 1)) * (width - 60) + 30;
    const y = height - 20 - (Math.min(pt.mins, maxMins) / maxMins) * (height - 40);
    return `${x},${y}`;
  }).join(' ');

  // Compile points into an area block that connects to base (y = height - 20)
  const areaPointsStr = `${30},${height - 20} ${pointsStr} ${width - 30},${height - 20}`;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Dashboard Headline */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '6px' }}>Study Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Track your active learning stats, recall retention, and quiz scores.</p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Study Time */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Time</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{stats.total_study_minutes} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>mins</span></div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Across all study sections</p>
          </div>
        </div>

        {/* Card 2: Quizzes Taken */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={24} style={{ color: 'var(--color-cyan)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quizzes</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{stats.quizzes_taken} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>taken</span></div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Avg Score: {stats.average_quiz_score}%</p>
          </div>
        </div>

        {/* Card 3: Flashcard Mastery */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={24} style={{ color: 'var(--color-secondary)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flashcards</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{stats.flashcards_mastered} / {stats.flashcards_total}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Mastered rate: {flashcardMasteryRate}%</p>
          </div>
        </div>

      </div>

      {/* Main Charts & Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '30px' }}>
        
        {/* Custom SVG Study Chart */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px' }}>Weekly Progress Chart</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Daily logged learning session minutes</p>
          </div>

          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              style={{ width: '100%', height: 'auto', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2={width - 30} y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30" y1="65" x2={width - 30} y2="65" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30" y1="110" x2={width - 30} y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* Area Under Curve */}
              <polygon points={areaPointsStr} fill="url(#chartGlow)" />

              {/* Line Curve */}
              <polyline 
                fill="none" 
                stroke="var(--color-primary)" 
                strokeWidth="3" 
                points={pointsStr} 
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0px 4px 8px rgba(99, 102, 241, 0.4))' }}
              />

              {/* Dots & Labels */}
              {chartPoints.map((pt, idx) => {
                const x = (idx / (chartPoints.length - 1)) * (width - 60) + 30;
                const y = height - 20 - (Math.min(pt.mins, maxMins) / maxMins) * (height - 40);
                return (
                  <g key={idx}>
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="4" 
                      fill="var(--color-secondary)" 
                      stroke="#08090e" 
                      strokeWidth="2" 
                    />
                    <text 
                      x={x} 
                      y={height - 5} 
                      textAnchor="middle" 
                      fill="var(--text-dim)" 
                      fontSize="9" 
                      fontFamily="var(--font-heading)"
                    >
                      {pt.day}
                    </text>
                    <text 
                      x={x} 
                      y={y - 8} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="8" 
                      fontWeight="600"
                    >
                      {pt.mins}m
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'var(--color-primary)' }} />
            Recent Activities
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {stats.recent_activities.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
                No recent activity. Upload a note to begin!
              </p>
            ) : (
              stats.recent_activities.map((act, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: act.type === 'note' ? 'rgba(6,182,212,0.1)' : 'rgba(99,102,241,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {act.type === 'note' ? (
                      <BookOpen size={14} style={{ color: 'var(--color-cyan)' }} />
                    ) : (
                      <Zap size={14} style={{ color: 'var(--color-primary)' }} />
                    )}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>{act.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{act.detail}</p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
