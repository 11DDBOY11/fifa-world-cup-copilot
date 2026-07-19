import React, { useEffect, useRef } from 'react';
import MessageBubble, { Message } from './MessageBubble';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-8">
          <div className="text-5xl mb-4">⚽</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">
            Fan Copilot
          </h2>
          <p className="text-sm">
            Ask me about directions, crowd levels, weather, accessible facilities,
            transit options, or anything about the stadium!
          </p>
          <p className="text-xs mt-3 text-slate-500">
            También hablo español — solo escríbeme en español.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-scoreboard-amber text-pitch-charcoal flex items-center justify-center text-sm font-bold mr-2.5 mt-1 shadow-sm">
            ⚽
          </div>
          <div className="bg-turf-surface text-sage-muted rounded-lg rounded-bl-none border border-floodlight/10 shadow-[3px_3px_0_rgba(240,244,248,0.03)] px-4 py-3 text-sm">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatWindow;
