'use client';

import { useState, useEffect, useRef } from 'react';
import { User, MoonStar, Plus, ExternalLink, Copy, Check, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import PromptInput from '../components/promptinput';
import SuggestionButtons from '../components/suggestionbuttons';

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
      <code className="bg-slate-800 text-cyan-300 px-2 py-1 rounded-md text-sm font-mono border border-slate-700" {...restProps}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group/code-block my-6 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-medium text-slate-300">{match ? match[1] : 'code'}</span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors duration-200 text-xs font-medium"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
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
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [promptSuggestions, setPromptSuggestions] = useState<string[]>(allSuggestions.slice(0, 3));
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPromptSuggestions(getRandomSuggestions());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSuggestionClick = (suggestion: string) => {
    handlePromptSubmit(suggestion);
  };

  const handleNewChat = () => {
    setMessages([]);
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

  const handlePromptSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;

    if (promptSuggestions.length > 0) {
      setPromptSuggestions([]);
    }

    const userMessage: Message = { text: message, isUser: true };
    setMessages((prev) => [...prev, userMessage]);

    const history: HistoryItem[] = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
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
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/50 hover:decoration-cyan-300 transition-colors duration-200 inline-flex items-center gap-1"
        {...props}
      >
        {children}
        <ExternalLink className="h-3 w-3 opacity-70" />
      </a>
    ),
    p: ({ children, ...props }) => (
      <p className="mb-4 last:mb-0 text-slate-100 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-slate-100" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-100" {...props}>
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
      <blockquote className="border-l-4 border-cyan-500 bg-slate-800 pl-4 pr-4 py-3 italic text-slate-200 my-4 rounded-r-lg" {...props}>
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-semibold text-white mb-3 mt-6 first:mt-0" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-medium text-white mb-2 mt-4 first:mt-0" {...props}>
        {children}
      </h3>
    ),
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-[#081423] text-white">
      {/* desktop sidebar */}
      <aside className="w-80 bg-[#0F1528] border-r border-[#0F1528] hidden md:flex flex-col">
        <div className="p-6 border-b border-[#0F1528]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-cyan-500 rounded-lg flex items-center justify-center">
              <MoonStar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ricky&#39;s LM Demo</h1>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 p-6">
          {/* Chat history could go here */}
        </div>
      </aside>

      {/* mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-80 bg-slate-800 border-r border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <MoonStar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Ricky&#39;s LM Demo</h1>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                <span>New Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* mobile header - only show when there are messages */}
        {hasMessages && (
          <header className="md:hidden bg-slate-800 border-b border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <MoonStar className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-white">Ricky&#39;s LM Demo</h1>
              </div>
              <div className="w-9" />
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col">
              {/* mobile header integrated into welcome screen */}
              <div className="md:hidden flex items-center justify-center p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <MoonStar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Integrated Header</h1>
                  </div>
                </div>
              </div>

              {/* welcome content */}
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                      Good to see you, Ricky.
                    </h1>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 md:p-8">
              <div className="space-y-8">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-4 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      msg.isUser 
                        ? 'bg-slate-700' 
                        : 'bg-cyan-500'
                    }`}>
                      {msg.isUser ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <MoonStar className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className={`group relative rounded-2xl p-6 max-w-3xl ${
                      msg.isUser 
                        ? 'bg-slate-700 text-white' 
                        : 'bg-slate-800 border border-slate-700 text-slate-100'
                    }`}>
                      {msg.isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      ) : (
                        <>
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                              {convertUrlsToLinks(msg.text)}
                            </ReactMarkdown>
                          </div>
                          <button
                            onClick={() => handleCopy(msg.text, index)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
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
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center">
                      <MoonStar className="h-5 w-5 text-white" />
                    </div>
                    <div className="rounded-2xl p-6 max-w-lg bg-slate-800 border border-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                        <span className="text-sm text-slate-400 ml-2">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </main>

        <footer className="bg-[#081423] p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
           <SuggestionButtons
              suggestions={messages.length === 0 && !isLoading ? promptSuggestions : []}
              onSuggestionClick={handleSuggestionClick}
              disabled={isLoading}
            />

            {/* PromptInput replaces the old form */}
            <PromptInput
              onSubmit={handlePromptSubmit}
              disabled={isLoading}
              placeholder="Ask anything..."
            />
            <p className="text-xs text-center text-slate-500 mt-4">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}