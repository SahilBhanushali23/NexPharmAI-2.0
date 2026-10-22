'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  Cpu,
  RefreshCw,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  context?: any;
  timestamp: string;
}

const PRESET_PROMPTS = [
  'What is the current health status of the machine fleet?',
  'Are there any critical alerts requiring maintenance dispatch?',
  'Show me the active production schedule and makespan',
  'Which materials are currently below the safety reorder point?',
  'What is our current plant OEE efficiency?',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'I can answer operational questions using current machine, alert, schedule, inventory, and OEE records from the manufacturing database. What would you like to check?',
      timestamp: '',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages((prev) => prev.map((message) =>
      message.id === 'welcome' && !message.timestamp
        ? { ...message, timestamp: new Date().toLocaleTimeString() }
        : message
    ));
  }, []);

  async function handleSend(queryText?: string) {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.queryAssistant(q);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        context: res.data_context,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error connecting to Assistant engine: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">AI Decision Assistant</h1>
          <p className="page-description">
            Natural language factory co-pilot querying live database records, predictive maintenance models, and scheduling heuristics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
          <Sparkles size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            Live Database Queries
          </span>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {PRESET_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-accent)',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="card" style={{ height: '580px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Messages Stream */}
        <div ref={messagesContainerRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '75%',
                    background: isUser ? 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)' : 'var(--bg-tertiary)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    padding: '0.85rem 1.15rem',
                    borderRadius: 'var(--radius-md)',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  {isUser && (
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.25rem', opacity: 0.8 }}>
                      YOU ASKED
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                  {m.context && Object.keys(m.context).length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Database size={12} /> Database Entities Queried:
                      </div>
                      <div>{Object.keys(m.context).join(', ')}</div>
                    </div>
                  )}

                  {m.timestamp && (
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', marginTop: '0.35rem', opacity: 0.6 }}>
                      {m.timestamp}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>
              <Sparkles size={16} className="spin" style={{ color: 'var(--primary)' }} />
              <span>Analyzing telemetry & database records...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Ask anything about machine health, schedule makespan, or shortage alerts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="input-field"
            style={{ flex: 1 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={16} />
            <span>Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
