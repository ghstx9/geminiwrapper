'use client';

import { useState, FormEvent, useEffect, useRef, KeyboardEvent } from 'react';
import { Send, User, MoonStar, Plus, ExternalLink, Copy, Check, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

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

// custom component for rendering code blocks with a copy button
const CodeBlock = (props: React.ComponentProps<'code'> & { inline?: boolean }) => {
    const { inline, className, children, ...restProps } = props;
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        const codeString = Array.isArray(children) 
            ? children.join('') 
            : typeof children === 'string' 
                ? children 
                : String(children || '');
        
        if (!codeString) return;

        const textArea = document.createElement('textarea');
        textArea.value = codeString;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
        }
        document.body.removeChild(textArea);
    };

    const match = /language-(\w+)/.exec(className || '');

    if (inline) {
        return (
            <code className="bg-slate-800/60 text-cyan-300 px-2 py-1 rounded-md text-sm font-mono border border-slate-700/50" {...restProps}>
                {children}
            </code>
        );
    }

    return (
        <div className="relative group/code-block my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">{match ? match[1] : 'code'}</span>
                <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200 border border-slate-700/50"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 text-green-400" />
                            <span className="text-xs font-medium">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" />
                            <span className="text-xs font-medium">Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="bg-slate-900/80 text-slate-200 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
                <code className={className} {...restProps}>
                    {children}
                </code>
            </pre>
        </div>
    );
};

const allSuggestions = [
  "Explain quantum computing in simple terms",
  "What are the latest advancements in AI?",
  "Suggest a good book on machine learning",
  "How does blockchain technology work?",
  "What are the benefits of using TypeScript?",
  "Can you summarize the plot of 'Dune'?",
  "Calculate a rocket launch trajectory",
  "What are some effective ways to reduce stress and anxiety?"
];

const getRandomSuggestions = () => {
  const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>(allSuggestions.slice(0, 3));
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPromptSuggestions(getRandomSuggestions());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };
  
  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setPromptSuggestions(getRandomSuggestions());
    setIsMobileSidebarOpen(false);
  };

  const handleCopy = (text: string, index: number) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedMessageIndex(index);

      setTimeout(() => {
        setCopiedMessageIndex(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (promptSuggestions.length > 0) {
        setPromptSuggestions([]);
    }
    
    const userMessage: Message = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);

    const history: HistoryItem[] = messages.map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

    setIsLoading(true);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: history }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.response) {
          const aiMessage: Message = { text: data.response, isUser: false };
          setMessages((prev) => [...prev, aiMessage]);
          return; 
        }
        
        throw new Error(data.error || data.response || `API error: ${response.statusText}`);
      }

      const aiMessage: Message = { text: data.response, isUser: false };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setMessages((prev) => [...prev, { text: `Error: ${errorMessage}`, isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        formRef.current?.requestSubmit();
    }
  };

  const convertUrlsToLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '[$1]($1)');
  };

  const markdownComponents: Components = {
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/50 hover:decoration-cyan-300/70 transition-all duration-200 inline-flex items-center gap-1"
        {...props}
      >
        {children}
        <ExternalLink className="h-3 w-3 opacity-70" />
      </a>
    ),
    p: ({ children, ...props }) => (
      <p className="mb-3 last:mb-0 text-slate-100 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-3 space-y-2 text-slate-100" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-3 space-y-2 text-slate-100" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-slate-100 leading-relaxed" {...props}>
        {children}
      </li>
    ),
    code: CodeBlock as Components['code'],
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-gradient-to-b from-cyan-500 to-blue-500 bg-slate-800/30 pl-4 pr-4 py-2 italic text-slate-200 my-4 rounded-r-lg" {...props}>
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold text-slate-100 mb-4 mt-6 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-semibold text-slate-100 mb-3 mt-5 first:mt-0" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-medium text-slate-100 mb-2 mt-4 first:mt-0" {...props}>
        {children}
      </h3>
    ),
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      {/* desktop sidebar */}
      <aside className="w-72 bg-slate-800/40 backdrop-blur-sm border-r border-slate-700/50 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10">
            <div className="relative">
              <MoonStar className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">gemini-wrapper</h1>
              <p className="text-xs text-slate-400">AI-powered conversations</p>
            </div>
        </div>
        <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <Plus className="h-5 w-5" />
            <span>New Chat</span>
        </button>
      </aside>

      {/* mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MoonStar className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-100">gemini-wrapper</h1>
                  <p className="text-xs text-slate-400">AI Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
              <Plus className="h-5 w-5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* mobile header - only show when there are messages */}
        {hasMessages && (
          <header className="md:hidden bg-slate-800/40 backdrop-blur-sm border-b border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MoonStar className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-100">gemini-wrapper</h1>
                </div>
              </div>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-slate-800/40">
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col">
                {/* mobile header integrated into welcome screen - only show when no messages */}
                <div className="md:hidden flex items-center justify-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <MoonStar className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-100">gemini-wrapper</h1>
                      <p className="text-xs text-slate-400">AI Assistant</p>
                    </div>
                  </div>
                </div>

                {/* welcome content - centered on remaining space */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-2xl mx-auto">
                    <div className="mb-8">
                      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
                        Hey there, ember.
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                    {!msg.isUser && (
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                        <MoonStar className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className={`group relative rounded-2xl p-5 max-w-3xl shadow-lg ${
                      msg.isUser 
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white ml-auto' 
                        : 'bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 text-slate-100'
                    }`}>
                      {msg.isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      ) : (
                        <>
                          <div className="prose prose-invert prose-slate max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                              {convertUrlsToLinks(msg.text)}
                            </ReactMarkdown>
                          </div>
                          <button
                            onClick={() => handleCopy(msg.text, index)}
                            className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800/50 backdrop-blur-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 border border-slate-700/50"
                            aria-label="Copy message"
                          >
                            {copiedMessageIndex === index ? (
                                <Check className="h-4 w-4 text-green-400" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                    {msg.isUser && (
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 flex items-center justify-center shadow-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                      <MoonStar className="h-5 w-5 text-white" />
                    </div>
                    <div className="rounded-2xl p-5 max-w-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 shadow-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 text-center">Thinking...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
        </main>

        <footer className="p-4 md:p-8 bg-slate-900/50 backdrop-blur-sm border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !isLoading && promptSuggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 text-sm text-slate-300 rounded-xl py-3 px-5 hover:bg-slate-700/60 hover:border-cyan-500/50 hover:text-cyan-300 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <form ref={formRef} onSubmit={handleSubmit} className="relative">
              <div className="relative rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full bg-transparent py-4 pl-6 pr-16 text-white placeholder-slate-400 focus:outline-none resize-none max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/40 rounded-2xl"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="absolute right-3 bottom-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center transform hover:scale-105 shadow-lg hover:shadow-xl"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
            <p className="text-xs text-center text-slate-500 mt-4">
              AI still can make mistakes. Please double-check responses.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}