import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { API } from '../services/api';

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

            const assistantMessage: ChatMessage = { role: 'assistant', content: reply };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `I'm sorry, I encountered an error: ${error.message}`
            };
            setMessages(prev => [...prev, errorMessage]);
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
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border flex flex-col max-h-[80vh] pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="text-xl">🎓</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Chat with Professor</h3>
                            <p className="text-xs text-indigo-200">Ask about this lecture</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">💬</span>
                            </div>
                            <p className="text-gray-600 text-sm">
                                Ask any question about this lecture!
                            </p>
                            <div className="mt-4 space-y-2">
                                {['What are the main topics?', 'Can you explain the key terms?', 'What should I focus on for the exam?'].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(suggestion)}
                                        className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
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
                                className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question..."
                            className="flex-1 px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
