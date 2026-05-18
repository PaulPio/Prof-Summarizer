import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { API } from '../services/api';

const SUGGESTIONS = [
  'What are the main topics?',
  'Can you explain the key terms?',
  'What should I focus on for the exam?',
];

interface ChatWindowProps {
  transcript: string;
  isOpen: boolean;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ transcript, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const reply = await API.chat(transcript, allMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I could not respond: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div
        className="w-full max-w-md bg-[#faf8f5] rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[85vh] pointer-events-auto overflow-hidden"
        role="dialog"
        aria-labelledby="chat-professor-title"
      >
        <header className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-amber-900 to-amber-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50/20 border border-amber-50/30 rounded-full flex items-center justify-center">
              <span className="text-lg" aria-hidden>🎓</span>
            </div>
            <div>
              <h3 id="chat-professor-title" className="font-serif text-lg text-amber-50 italic leading-tight">
                Ask Professor
              </h3>
              <p className="text-xs text-amber-200/90">About this lecture</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-amber-950/30 rounded-lg transition-colors text-amber-50"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[280px] bg-white">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden>💬</span>
              </div>
              <p className="text-stone-600 text-sm font-medium">Ask anything from this lecture</p>
              <p className="text-stone-400 text-xs mt-1 mb-4">Answers use your transcript and notes context.</p>
              <div className="space-y-2 text-left">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="block w-full px-3 py-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 rounded-xl text-sm text-stone-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-800 text-amber-50 rounded-br-md'
                    : 'bg-stone-100 text-stone-800 border border-stone-200 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-stone-100 border border-stone-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-amber-600/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-600/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-600/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <footer className="p-4 border-t border-stone-200 bg-stone-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              className="flex-1 px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-800/25 focus:border-amber-300 text-sm text-stone-900 placeholder:text-stone-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-amber-800 text-amber-50 rounded-xl hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatWindow;
