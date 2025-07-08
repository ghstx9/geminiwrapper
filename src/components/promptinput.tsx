import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function PromptInput({ 
  onSubmit, 
  disabled = false, 
  placeholder = "Enter a prompt here" 
}: PromptInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSubmit(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className={`
          relative rounded-lg bg-[#610bd215] border transition-all duration-200
          ${isFocused ? 'border-slate-500 shadow-lg' : 'border-slate-600'}
          ${disabled ? 'opacity-50' : ''}
        `}>
          <div className="flex items-center min-h-[60px]">
            {/* Text input */}
            <div className="flex-1 min-h-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                rows={1}
                disabled={disabled}
                className="w-full bg-transparent py-4 pl-6 pr-12 text-white placeholder-slate-400 focus:outline-none resize-none max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent text-base disabled:cursor-not-allowed leading-relaxed"
                style={{ 
                  minHeight: '60px',
                  lineHeight: '1.6'
                }}
              />
            </div>

            {/* Submit button */}
            <div className="flex items-center justify-center h-full p-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || disabled}
                className={`
                  p-2 rounded-xl transition-all duration-200 flex-shrink-0
                  ${input.trim() && !disabled
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white hover:scale-105 shadow-lg' 
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }
                `}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}