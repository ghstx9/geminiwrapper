  'use client';

  import { useState, FormEvent, useEffect, useRef, KeyboardEvent } from 'react';
  import { Send, User, MoonStar, Plus, ExternalLink, Copy, Check } from 'lucide-react';
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

  interface CodeNode {
    children?: Array<{
    type: string;
    value: string;
  }>;
}

  interface CodeBlockProps {
    node?: CodeNode;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
}

  // custom component for rendering code blocks with a copy button
  const CodeBlock = ({ node, inline, className, children, ...props }: CodeBlockProps) => {
      const [copied, setCopied] = useState(false);

      const handleCopyCode = () => {
          const codeString = node?.children[0]?.type === 'text' ? node.children[0].value : '';
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
              <code className="bg-slate-800 text-blue-300 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
              </code>
          );
      }

      return (
          <div className="relative group/code-block my-2">
              <div className="flex items-center justify-between bg-slate-900/80 px-4 py-2 rounded-t-lg border-b border-slate-700">
                  <span className="text-xs font-sans text-slate-400">{match ? match[1] : 'code'}</span>
                  <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200"
                      aria-label="Copy code"
                  >
                      {copied ? (
                          <>
                              <Check className="h-4 w-4 text-green-400" />
                              <span className="text-xs">Copied!</span>
                          </>
                      ) : (
                          <>
                              <Copy className="h-4 w-4" />
                              <span className="text-xs">Copy</span>
                          </>
                      )}
                  </button>
              </div>
              <pre className="bg-slate-800 text-slate-200 p-4 rounded-b-lg overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
                  <code className={className} {...props}>
                      {children}
                  </code>
              </pre>
          </div>
      );
  };


  export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
      const fetchSuggestions = async () => {
        try {
          const response = await fetch('/api/chat');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch suggestions. Status: ${response.status}`);
          }

          const data = await response.json();
          setPromptSuggestions(data.suggestions);

        } catch (err) {
          console.error(err);
          setPromptSuggestions([
            "Explain the theory of relativity",
            "What are some healthy dinner recipes?",
            "Write a short story about a time traveler"
          ]);
        }
      };
      
      if (messages.length === 0) {
          fetchSuggestions();
      }
    }, [messages.length]);
    
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
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/50 hover:decoration-blue-300/70 transition-colors duration-200 inline-flex items-center gap-1"
          {...props}
        >
          {children}
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      ),
      p: ({ children, ...props }) => (
        <p className="mb-2 last:mb-0" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="text-slate-200" {...props}>
          {children}
        </li>
      ),
      code: CodeBlock, // custom codeblock component
      blockquote: ({ children, ...props }) => (
        <blockquote className="border-l-4 border-slate-500 pl-4 italic text-slate-300 my-2" {...props}>
          {children}
        </blockquote>
      ),
    };

    return (
      <div className="flex h-screen bg-slate-900 text-white font-sans">
        {/* desktop sidebar */}
        <aside className="w-64 bg-slate-800/50 p-4 hidden md:flex flex-col">
          <div className="flex items-center gap-2 mb-8">
              <MoonStar className="h-6 w-6" />
              <h1 className="text-xl font-bold text-slate-100">gemini-wrapper</h1>
          </div>
          <button
              onClick={handleNewChat}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
              <Plus className="h-6 w-6" />
              New Chat
          </button>
        </aside>

        <div className="flex-1 flex flex-col">
          {/* mobile header with new chat btn */}
          <header className="md:hidden bg-slate-800/50 p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MoonStar className="h-6 w-6" />
                <h1 className="text-lg font-bold text-slate-100">gemini-wrapper</h1>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-200">
                <Plus className="h-5 w-5" />
                <span className="text-sm">New Chat</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-slate-800/40">
              {messages.length === 0 && !isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <h1 className="text-4xl font-medium bg-gradient-to-r from-indigo-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
                    Hey there, ember.
                  </h1>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-4`}>
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${msg.isUser ? 'bg-blue-500' : 'bg-slate-700'}`}>
                          {msg.isUser ? <User className="h-6 w-6" /> : <MoonStar className="h-6 w-6" />}
                      </div>
                      <div className={`group relative rounded-2xl p-4 max-w-2xl text-slate-100 ${msg.isUser ? 'bg-slate-800' : 'bg-slate-700/80'}`}>
                        {msg.isUser ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <>
                            <div className="prose prose-invert prose-slate max-w-none">
                              <ReactMarkdown components={markdownComponents}>
                                {convertUrlsToLinks(msg.text)}
                              </ReactMarkdown>
                            </div>
                            <button
                              onClick={() => handleCopy(msg.text, index)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200"
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
              )}
          </main>

          <footer className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 && !isLoading && promptSuggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {promptSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="bg-slate-800 border border-slate-700 text-sm text-slate-300 rounded-xl py-2 px-4 hover:bg-slate-700 transition duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <form ref={formRef} onSubmit={handleSubmit} className="relative">
                <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Gemini"
                rows={1}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-5 pr-14 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-200 resize-none max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/40"
                disabled={isLoading}
              />

                <button
                  type="submit"
                  className="absolute right-3 bottom-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-lg transition duration-200 flex items-center justify-center"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <p className="text-xs text-center text-slate-500 mt-2">
                {/* footer text can go here */}
              </p>
            </div>
          </footer>
        </div>
      </div>
    );
  }