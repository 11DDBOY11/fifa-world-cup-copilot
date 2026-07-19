import React from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGeneralKnowledge?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full mb-4 animate-message-entrance ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-scoreboard-amber text-pitch-charcoal flex items-center justify-center text-sm font-bold mr-2.5 mt-1 shadow-sm">
          ⚽
        </div>
      )}
      <div className="flex flex-col max-w-[80%]">
        <div
          className={`rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-scoreboard-amber text-pitch-charcoal rounded-br-none shadow-[3px_3px_0_rgba(255,176,0,0.15)] font-medium'
              : 'bg-turf-surface text-floodlight rounded-bl-none border border-floodlight/10 shadow-[3px_3px_0_rgba(240,244,248,0.03)]'
          }`}
        >
          {message.content}
        </div>
        {message.isGeneralKnowledge && (
          <span className="text-[10px] text-sage-muted font-mono tracking-wide mt-1.5 ml-1">
            General knowledge — not live venue data
          </span>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-turf-surface text-scoreboard-amber border border-scoreboard-amber/20 flex items-center justify-center text-sm font-bold ml-2.5 mt-1 shadow-sm">
          👤
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
