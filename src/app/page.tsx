'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, MoonStar, ExternalLink, Copy, Check, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import PromptInput from '../components/promptinput';
import SuggestionButtons from '../components/suggestionbuttons';
import Sidebar from '../components/sidebar';

interface Attachment {
  name: string;
  type: string;
  data: string;
}

interface Message {
  id:string;
  text: string;
  isUser: boolean;
  attachment?: Attachment;
}

interface HistoryPart {
  text: string;
}

interface HistoryItem {
  role: 'user' | 'model';
  parts: HistoryPart[];
}

const ALL_SUGGESTIONS = [
  "Explain quantum computing in simple terms",
  "What are the latest advancements in AI?",
  "Suggest a good book on machine learning",
  "How does blockchain technology work?",
  "What are the benefits of using TypeScript?",
  "Can you summarize the plot of 'Dune'?",
  "Calculate a rocket launch trajectory",
  "What are some effective ways to reduce stress and anxiety?"
];

const MODEL_NAMES: { [key: string]: string } = {
  'gemma-3-27b-it': 'Gemma 3',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'mistralai/mistral-small-3.2-24b-instruct:free': 'Mistral 3.2',
  'qwen/qwen3-30b-a3b:free': 'Qwen 3',
  'deepseek/deepseek-chat-v3-0324:free': 'DeepSeek V3'
};

const SUPPORTED_INDONESIAN_MODELS = ['gemma-3-27b-it', 'gemini-2.5-pro', 'deepseek/deepseek-chat-v3-0324:free'];

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

const CodeBlock = React.memo((props: React.ComponentProps<'code'> & { inline?: boolean }) => {
  const { inline, className, children, ...restProps } = props;
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    const codeString = Array.isArray(children)
      ? children.join('')
      : typeof children === 'string'
      ? children
      : String(children || '');

    if (!codeString) return;

    const success = await copyToClipboard(codeString);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [children]);

  const match = useMemo(() => /language-(\w+)/.exec(className || ''), [className]);

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
});

CodeBlock.displayName = 'CodeBlock';

const getRandomSuggestions = (count: number = 3): string[] => {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const convertUrlsToLinks = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '[$1]($1)');
};

const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemma-3-27b-it');
  const [showAlert, setShowAlert] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPromptSuggestions(getRandomSuggestions());
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, isLoading, scrollToBottom]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handlePromptSubmit(suggestion);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setPromptSuggestions(getRandomSuggestions());
    setShowAlert(false);
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    
    const hideAlert = localStorage.getItem('hideIndonesianAlert') === 'true';
    const shouldShowAlert = !SUPPORTED_INDONESIAN_MODELS.includes(modelId) && !hideAlert;
    setShowAlert(shouldShowAlert);

    if (messages.length > 0) {
      const modelName = MODEL_NAMES[modelId] || modelId;
      const modelChangeMessage: Message = {
        id: generateMessageId(),
        text: `Switched to **${modelName}**. Your conversation will continue with the new model.`,
        isUser: false
      };
      setMessages(prev => [...prev, modelChangeMessage]);
    }
  }, [messages.length]);

  const handleCopy = useCallback(async (text: string, messageId: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedMessageIndex(messageId);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    }
  }, []);

  const handlePromptSubmit = useCallback(async (message: string, attachment?: Attachment) => {
    if (!message.trim() && !attachment || isLoading) return;

    if (promptSuggestions.length > 0) {
      setPromptSuggestions([]);
    }

    const userMessage: Message = { 
      id: generateMessageId(),
      text: message, 
      isUser: true,
      attachment,
    };
    setMessages(prev => [...prev, userMessage]);

    const history: HistoryItem[] = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          history,
          modelId: selectedModel,
          attachment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.response) {
          const aiMessage: Message = { 
            id: generateMessageId(),
            text: data.response, 
            isUser: false 
          };
          setMessages(prev => [...prev, aiMessage]);
          return;
        }
        throw new Error(data.error || data.response || `API error: ${response.statusText}`);
      }

      const aiMessage: Message = { 
        id: generateMessageId(),
        text: data.response, 
        isUser: false 
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const errorMsg = `❌ **Error**: ${errorMessage}`;
      setMessages(prev => [...prev, { 
        id: generateMessageId(),
        text: errorMsg, 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, promptSuggestions.length, messages, selectedModel]);

  const markdownComponents: Components = useMemo(() => ({
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
  }), []);

  const handleAlertClose = useCallback(() => setShowAlert(false), []);
  
  const handleSwitchToGemini = useCallback(() => {
    setSelectedModel('gemini-2.5-pro');
    setShowAlert(false);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem('hideIndonesianAlert', 'true');
    setShowAlert(false);
  }, []);

  const shouldShowSuggestions = useMemo(() => 
    messages.length === 0 && !isLoading, 
    [messages.length, isLoading]
  );

  const displaySuggestions = useMemo(() => 
    shouldShowSuggestions ? promptSuggestions : [], 
    [shouldShowSuggestions, promptSuggestions]
  );

  return (
    <div className="flex h-screen bg-[#081423] text-white">
      {/* desktop sidebar */}
      <Sidebar 
        onNewChat={handleNewChat} 
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        disabled={isLoading}
      />

      {/* mobile sidebar */}
      <Sidebar 
        onNewChat={handleNewChat} 
        isMobile={true} 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        disabled={isLoading}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* mobile header */}
        <header className="md:hidden bg-[#0F1528] border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-[#0b36d23f] rounded-lg flex items-center justify-center">
                <MoonStar className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">Ricky&#39;s LM Demo</h1>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {shouldShowSuggestions ? (
            <div className="flex h-full flex-col">
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
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      msg.isUser ? 'bg-slate-700' : 'bg-[#0b36d23f]'
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
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.attachment && (
                            <div className="mb-2">
                              <img src={`data:${msg.attachment.type};base64,${msg.attachment.data}`} alt={msg.attachment.name} className="max-w-xs rounded-lg" />
                            </div>
                          )}
                          <p>{msg.text}</p>
                        </div>
                      ) : (
                        <>
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                              {convertUrlsToLinks(msg.text)}
                            </ReactMarkdown>
                          </div>
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                            aria-label="Copy message"
                          >
                            {copiedMessageIndex === msg.id ? (
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
              suggestions={displaySuggestions}
              onSuggestionClick={handleSuggestionClick}
              disabled={isLoading}
            />
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

      {/* alert modal */}
      {showAlert && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" 
            onClick={handleAlertClose}
          />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* close button for mobile */}
            <button
              onClick={handleAlertClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center leading-tight">
              Pemberitahuan Dukungan Bahasa
            </h2>
            
            <div className="space-y-3 sm:space-y-4 text-slate-300">
              <p className="text-center text-sm sm:text-base">
                <strong className="text-amber-400">Dukungan Bahasa Indonesia</strong> sangat minimal di beberapa model.
              </p>
              
              <div className="bg-slate-900 rounded-lg p-3 sm:p-4 border border-slate-600">
                <p className="text-sm font-medium text-green-400 mb-2">✅ Bisa dipakai:</p>
                <ul className="text-sm space-y-1 text-slate-300">
                  <li>• Gemini 2.5 Pro</li>
                  <li>• Gemma 3</li>
                  <li>• DeepSeek V3</li>
                </ul>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-3 sm:p-4 border border-slate-600">
                <p className="text-sm font-medium text-amber-400 mb-2">⚠️ Minimal atau sedikit:</p>
                <ul className="text-sm space-y-1 text-slate-300">
                  <li>• Mistral 3.2</li>
                  <li>• Qwen 3</li>
                </ul>
              </div>
              
              <p className="text-xs sm:text-sm text-center text-slate-400 leading-relaxed">
                Please click <span className="text-sky-500">don&#39;t show again</span> if you&#39;re not using Indonesian language.
              </p>
            </div>
            
            <div className="space-y-3 mt-6 sm:mt-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSwitchToGemini}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 active:bg-cyan-800 transition-colors duration-200 font-medium text-sm touch-manipulation"
                >
                  Ganti Ke Gemini
                </button>
                <button
                  onClick={handleAlertClose}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 active:bg-slate-700 transition-colors duration-200 font-medium text-sm touch-manipulation"
                >
                  Lanjut Saja
                </button>
              </div>
              
              <button
                onClick={handleDontShowAgain}
                className="w-full px-4 py-3 sm:py-2 text-slate-400 hover:text-slate-300 active:text-slate-200 text-sm underline hover:no-underline transition-colors duration-200 touch-manipulation"
              >
                Don&#39;t show this again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
