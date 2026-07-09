import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MessageCircle,
  LayoutDashboard,
  Settings,
  Rocket,
  BookOpen,
  Zap,
  Shield,
  Activity,
  BarChart2,
  Monitor,
  Moon,
  ChevronDown,
  Trash2,
  Plus,
  Send,
  Bot,
  User,
  AlertCircle,
  X,
  Map,
  Info,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, checkHealth } from './api';
import type { Message } from './types';
import './index.css';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getOrCreateSessionId(): string {
  const key = 'gm_agent_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ────────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────────
const NAV = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Rocket,          label: 'Build' },
  { icon: Settings,        label: 'Configure' },
  { icon: Rocket,          label: 'Deploy' },
  { icon: BookOpen,        label: 'Publish' },
  { icon: MessageCircle,   label: 'Try It', active: true },
];

const SECURITY = [{ icon: Shield, label: 'Credentials' }];
const OBS = [
  { icon: Activity,  label: 'Traces' },
  { icon: Monitor,   label: 'Runtime Logs' },
  { icon: BarChart2, label: 'System Metrics' },
];
const EVAL = [{ icon: Zap, label: 'Monitors' }];

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">AM</div>
        <span className="sidebar-logo-text">Agent Manager</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ icon: Icon, label, active }) => (
          <button key={label} className={`nav-item${active ? ' active' : ''}`}>
            <Icon />
            {label}
          </button>
        ))}

        <div className="nav-section-label">Security</div>
        {SECURITY.map(({ icon: Icon, label }) => (
          <button key={label} className="nav-item"><Icon />{label}</button>
        ))}

        <div className="nav-section-label">Observability</div>
        {OBS.map(({ icon: Icon, label }) => (
          <button key={label} className="nav-item"><Icon />{label}</button>
        ))}

        <div className="nav-section-label">Evaluation</div>
        {EVAL.map(({ icon: Icon, label }) => (
          <button key={label} className="nav-item"><Icon />{label}</button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-copy">© 2026 WSO2 LLC.</span>
        <span className="sidebar-footer-copy">v0.36.8</span>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// Topbar
// ────────────────────────────────────────────────────────────────
type HealthStatus = 'checking' | 'healthy' | 'unhealthy';

function Topbar({ health }: { health: HealthStatus }) {
  const badgeLabel =
    health === 'checking' ? 'Checking…' :
    health === 'healthy'  ? 'API Online' : 'API Offline';

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <div className="topbar-breadcrumb-item">
          Default Project <ChevronDown />
        </div>
        <div className="topbar-breadcrumb-item">
          MCP-google-map-test <ChevronDown />
        </div>
      </div>

      <div className="topbar-right">
        <div className={`health-badge ${health}`}>
          <span className={`status-dot${health === 'unhealthy' ? ' offline' : ''}`} />
          {badgeLabel}
        </div>
        <button className="topbar-icon-btn" title="Toggle theme" aria-label="Toggle theme">
          <Moon />
        </button>
        <button className="avatar-btn" aria-label="User menu">A</button>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────
// Suggestions
// ────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Map,  text: 'Find coffee shops near me' },
  { icon: Map,  text: 'Navigate to Central Park' },
  { icon: Map,  text: 'Restaurants open now nearby' },
  { icon: Map,  text: 'How far is the airport?' },
];

// ────────────────────────────────────────────────────────────────
// Message Bubble
// ────────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`message-row ${msg.role}`}>
      <div className={`message-avatar ${msg.role}`}>
        {isUser ? <User /> : <Bot />}
      </div>

      <div className="message-content-wrapper">
        <div className="message-meta">
          <span className="message-sender">{isUser ? 'You' : 'Maps Agent'}</span>
          <span>{formatTime(msg.timestamp)}</span>
        </div>

        <div className={`message-bubble ${msg.role}`}>
          {isUser ? (
            msg.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Typing Indicator
// ────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="message-row agent">
      <div className="message-avatar agent"><Bot /></div>
      <div className="message-content-wrapper">
        <div className="message-meta">
          <span className="message-sender">Maps Agent</span>
        </div>
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main App
// ────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [health, setHealth]     = useState<HealthStatus>('checking');
  const [sessionId]             = useState(getOrCreateSessionId);

  const feedRef    = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Health check on mount
  useEffect(() => {
    checkHealth()
      .then(() => setHealth('healthy'))
      .catch(() => setHealth('unhealthy'));
  }, []);

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendChatMessage({ session_id: sessionId, message: trimmed });
      const agentMsg: Message = {
        id: uuidv4(),
        role: 'agent',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Topbar health={health} />

        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <h1 className="chat-title">Try It — Maps Agent</h1>
              <div className="chat-subtitle">
                <span className={`status-dot${health === 'unhealthy' ? ' offline' : ''}`} />
                {health === 'healthy' ? 'Connected · MCP-google-map-test' : health === 'checking' ? 'Connecting…' : 'Disconnected'}
              </div>
            </div>

            <div className="chat-header-actions">
              <button className="btn-outline" onClick={clearChat} title="Clear conversation">
                <Trash2 /> Clear
              </button>
              <button
                className="btn-primary"
                onClick={() => submitMessage('Hello! What can you help me with?')}
                disabled={loading}
              >
                <Plus /> New Session
              </button>
            </div>
          </div>

          {/* Session banner */}
          <div className="session-banner">
            <Info />
            <span>Session ID:</span>
            <span className="session-id-code">{sessionId}</span>
          </div>

          {/* Error bar */}
          {error && (
            <div className="error-bar" role="alert">
              <AlertCircle />
              {error}
              <button className="error-bar-close" onClick={() => setError(null)} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Messages feed */}
          <div className="messages-feed" ref={feedRef}>
            {messages.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Map />
                </div>
                <h3>Ask the Maps Agent</h3>
                <p>
                  I can help you find places, get directions, explore restaurants,
                  and answer location-based questions using Google Maps.
                </p>
                <div className="empty-suggestions">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.text}
                      className="suggestion-chip"
                      onClick={() => submitMessage(s.text)}
                    >
                      <s.icon />
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {loading && <TypingIndicator />}
              </>
            )}
          </div>

          {/* Input area */}
          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="Ask about locations, directions, or places…"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                aria-label="Chat message input"
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => submitMessage(input)}
                disabled={!canSend}
                aria-label="Send message"
              >
                <Send />
              </button>
            </div>
            <div className="input-hint">
              <span className="input-hint-text">
                Powered by Google Maps MCP · Session persists across messages
              </span>
              <div className="input-hint-keys">
                <span className="key-badge">Enter</span>
                <span>to send ·</span>
                <span className="key-badge">Shift+Enter</span>
                <span>new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
