// app/page.tsx
'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Send, User, MoonStar, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // Import the component

interface Message {
  text: string;
  isUser: boolean;
}

interface HistoryPart {
    text: string;
}
interface HistoryItem {
    role: 'user' | 'model';
    parts: HistoryPart[];
}


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { text: input, isUser: true };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    const history: HistoryItem[] = messages.map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

    setIsLoading(true);
    setError(null);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: history }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiMessage: Message = { text: data.response, isUser: false };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setMessages((prev) => [...prev, { text: `Error: ${errorMessage}`, isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/50 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-8">
            <MoonStar className="h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-100">AI Assistant</h1>
        </div>
        <button className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
            <Plus className="h-6 w-6" />
            New Chat
        </button>
        <div className="flex-1 mt-8 space-y-2">
            <div className="text-slate-400 text-sm p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer">Previous conversation...</div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-4`}>
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${msg.isUser ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    {msg.isUser ? <User className="h-6 w-6" /> : <MoonStar className="h-6 w-6" />}
                </div>
                <div className={`rounded-2xl p-4 max-w-2xl text-slate-100 prose prose-invert prose-slate ${msg.isUser ? 'bg-slate-800' : 'bg-slate-700/80'}`}>
                  {/*
                    Change is here: Use ReactMarkdown for AI messages.
                    User messages are kept as plain text to prevent markdown injection by the user.
                  */}
                  {msg.isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <MoonStar className="h-6 w-6" />
                </div>
                <div className="rounded-2xl p-4 max-w-lg bg-slate-700/80">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-5 pr-14 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-200"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-lg transition duration-200 flex items-center justify-center"
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                <Send className="h-6 w-6" />
              </button>
            </form>
            <p className="text-xs text-center text-slate-500 mt-2">
                
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}