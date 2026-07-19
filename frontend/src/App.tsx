import React, { useState, useCallback, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import LanguageToggle, { Language } from './components/LanguageToggle';
import StadiumCard, { Stadium } from './components/StadiumCard';
import HeroLanding from './components/HeroLanding';
import { sendMessage, getGeneralInfo, getVenues } from './api';
import footballImage from '../football.jpg';
import type { Message } from './components/MessageBubble';

const LANGUAGE_PREFIXES: Record<Language, string> = {
  en: '',
  es: '[respond in Spanish] ',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Stable session ID for the browser session
const SESSION_ID = generateId();

// All 16 host stadiums + 1 bonus venue (starts as isLive: false, loaded dynamically)
const INITIAL_STADIUMS: Stadium[] = [
  { id: null, name: 'MetLife Stadium', city: 'East Rutherford, NJ', country: 'USA', isLive: false },
  { id: null, name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', isLive: false },
  { id: null, name: 'BC Place', city: 'Vancouver, BC', country: 'Canada', isLive: false },
  { id: null, name: 'Sree Kanteerava Stadium', city: 'Bangalore', country: 'India', isLive: false }, // Bonus Live Venue
  { id: null, name: 'BMO Field', city: 'Toronto, ON', country: 'Canada', isLive: false },
  { id: null, name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', isLive: false },
  { id: null, name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', isLive: false },
  { id: null, name: 'Lumen Field', city: 'Seattle, WA', country: 'USA', isLive: false },
  { id: null, name: 'Levi\'s Stadium', city: 'Santa Clara, CA', country: 'USA', isLive: false },
  { id: null, name: 'SoFi Stadium', city: 'Inglewood, CA', country: 'USA', isLive: false },
  { id: null, name: 'NRG Stadium', city: 'Houston, TX', country: 'USA', isLive: false },
  { id: null, name: 'AT&T Stadium', city: 'Arlington, TX', country: 'USA', isLive: false },
  { id: null, name: 'Arrowhead Stadium', city: 'Kansas City, MO', country: 'USA', isLive: false },
  { id: null, name: 'Mercedes-Benz Stadium', city: 'Atlanta, GA', country: 'USA', isLive: false },
  { id: null, name: 'Hard Rock Stadium', city: 'Miami, FL', country: 'USA', isLive: false },
  { id: null, name: 'Gillette Stadium', city: 'Foxborough, MA', country: 'USA', isLive: false },
  { id: null, name: 'Lincoln Financial Field', city: 'Philadelphia, PA', country: 'USA', isLive: false },
];

type Theme = 'dark' | 'light';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<'home' | 'app'>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [stadiums, setStadiums] = useState<Stadium[]>(INITIAL_STADIUMS);

  // Fetch live venues from backend to determine dynamic active states
  useEffect(() => {
    let active = true;
    getVenues()
      .then((liveVenues) => {
        if (!active) return;
        setStadiums((prev) =>
          prev.map((stadium) => {
            const liveMatch = liveVenues.find(
              (v) => v.name.toLowerCase().trim() === stadium.name.toLowerCase().trim()
            );
            if (liveMatch) {
              return {
                ...stadium,
                id: liveMatch.id,
                isLive: true,
              };
            }
            return stadium;
          })
        );
      })
      .catch((err) => {
        console.error('Failed to load live venues from backend:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Theme: read from localStorage, then system preference, default dark
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('fan-copilot-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync data-theme attribute whenever theme state changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fan-copilot-theme', next);
      return next;
    });
  }, []);

  // Trigger venue selection and automated introduction messages
  const handleStadiumClick = useCallback(
    async (stadium: Stadium) => {
      if (isLoading) return;

      // Switch to app screen
      setViewState('app');

      if (stadium.isLive && stadium.id) {
        setVenueId(stadium.id);
        setMessages([]); // Clear chat for fresh venue context
        setIsLoading(true);

        const initialUserMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `Tell me about ${stadium.name}`,
        };
        setMessages([initialUserMsg]);

        try {
          const prefix = LANGUAGE_PREFIXES[language];
          const reply = await sendMessage(SESSION_ID, prefix + 'Tell me about this venue', stadium.id);
          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: reply,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
          const errorMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: `⚠️ Error: ${err instanceof Error ? err.message : 'Could not reach the server.'}`,
          };
          setMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Coming soon card click — do NOT change selection, just call general-info
        setVenueId(null);
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `Tell me about ${stadium.name}`,
        };
        setMessages([userMsg]);
        setIsLoading(true);

        try {
          const reply = await getGeneralInfo(stadium.name, stadium.city);
          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: reply,
            isGeneralKnowledge: true,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
          const errorMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: `⚠️ Error: ${err instanceof Error ? err.message : 'Could not reach the server.'}`,
          };
          setMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [isLoading, language]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading || !venueId) return;

      setInput('');

      const prefix = LANGUAGE_PREFIXES[language];
      const backendMessage = prefix + text;

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const reply = await sendMessage(SESSION_ID, backendMessage, venueId);
        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `⚠️ Error: ${err instanceof Error ? err.message : 'Could not reach the server.'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, language, venueId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const selectedStadium = stadiums.find((v) => v.id === venueId) ?? null;
  const canSend = !!venueId && !isLoading;

  if (viewState === 'home') {
    return (
      <HeroLanding
        stadiums={stadiums}
        onStadiumClick={handleStadiumClick}
        onEnterChat={() => setViewState('app')}
      />
    );
  }

  return (
    <div 
      className="flex flex-col h-screen text-floodlight overflow-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(var(--overlay), var(--overlay)), url(${footballImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-turf-surface border-b border-floodlight/10 shadow-[0_4px_10px_rgba(0,0,0,0.3)] z-10 flex-wrap gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0 cursor-pointer" onClick={() => { setViewState('home'); setVenueId(null); setMessages([]); }}>⚽</span>
          <div className="min-w-0">
            <h1 
              className="text-lg font-bold tracking-tight leading-tight cursor-pointer hover:text-scoreboard-amber transition-colors" 
              onClick={() => { setViewState('home'); setVenueId(null); setMessages([]); }}
            >
              Fan Copilot
            </h1>
            <p className="text-xs text-sage-muted font-medium truncate leading-tight">
              {selectedStadium
                ? `${selectedStadium.name} · ${selectedStadium.city}`
                : 'FIFA World Cup 2026 Venue Assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <LanguageToggle language={language} onChange={setLanguage} />
          {/* Theme toggle — sun = light mode active, moon = dark mode active */}
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-floodlight/15 text-floodlight hover:border-scoreboard-amber/50 hover:text-scoreboard-amber transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              /* Sun icon — click to go light */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
              </svg>
            ) : (
              /* Moon icon — click to go dark */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar — Stadium List */}
        <aside className="w-[320px] md:w-[360px] flex-shrink-0 bg-pitch-charcoal border-r border-floodlight/10 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-floodlight/10 bg-turf-surface/30">
            <h2 className="text-xs font-bold tracking-wider text-sage-muted uppercase">
              Select Venue
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {stadiums.map((stadium, idx) => (
              <StadiumCard
                key={stadium.name}
                stadium={stadium}
                isSelected={venueId === stadium.id && stadium.id !== null}
                onClick={() => handleStadiumClick(stadium)}
                index={idx}
              />
            ))}
          </div>
        </aside>

        {/* Right Section — Chat Window */}
        <main className="flex-1 flex flex-col bg-pitch-charcoal/50 min-w-0">
          {/* Welcome Screen or Message List */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 max-w-lg mx-auto select-none">
              <span className="text-6xl animate-bounce" style={{ animationDuration: '3s' }}>🏟️</span>
              <h2 className="text-xl font-bold tracking-tight text-floodlight">
                Welcome to Fan Copilot
              </h2>
              <p className="text-sm text-sage-muted leading-relaxed">
                Click a stadium card on the left to start a tool-use session.
              </p>
              <div className="text-xs text-sage-muted/70 bg-turf-surface/40 border border-floodlight/5 rounded-lg px-4 py-3 w-full">
                <p className="font-semibold text-floodlight mb-1">💡 Copilot Features</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li><strong>Live Venues:</strong> Chat using weather, crowd level, and stadium guide tools.</li>
                  <li><strong>Coming Soon Venues:</strong> Read general stadium highlights powered by AI.</li>
                </ul>
              </div>
            </div>
          ) : (
            <ChatWindow messages={messages} isLoading={isLoading} />
          )}

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={handleSubmit}
            className="px-6 py-4 bg-turf-surface/30 border-t border-floodlight/10 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
              <textarea
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  venueId
                    ? 'Ask about directions, gates, weather, crowd levels…'
                    : 'Select a Live stadium on the left to start chatting'
                }
                rows={1}
                className="flex-1 resize-none rounded-lg bg-turf-surface border border-floodlight/15 text-floodlight placeholder-sage-muted/70 px-4 py-3 text-sm focus:outline-none focus:border-scoreboard-amber focus:ring-1 focus:ring-scoreboard-amber max-h-32 overflow-y-auto disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ lineHeight: '1.5' }}
                disabled={!canSend}
                aria-label="Chat input"
              />
              <button
                id="chat-submit"
                type="submit"
                disabled={!canSend || !input.trim()}
                className="flex-shrink-0 w-11 h-11 rounded-lg bg-scoreboard-amber hover:bg-scoreboard-amber/90 disabled:bg-sage-muted/20 disabled:text-sage-muted/50 text-pitch-charcoal flex items-center justify-center font-bold transition-all active:scale-95 shadow-[4px_4px_0px_rgba(255,176,0,0.2)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default App;

