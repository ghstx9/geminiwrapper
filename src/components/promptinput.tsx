import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { ArrowUp, Paperclip, Mic, X, File as FileIcon } from 'lucide-react';

interface Attachment {
  name: string;
  type: string;
  data: string; // base64 encoded
}

interface PromptInputProps {
  onSubmit: (message: string, attachment?: Attachment) => void;
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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if ((input.trim() || attachment) && !disabled) {
      onSubmit(input, attachment || undefined);
      setInput('');
      setAttachment(null);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64Data = (loadEvent.target?.result as string)?.split(',')[1];
        if (base64Data) {
          setAttachment({
            name: file.name,
            type: file.type,
            data: base64Data,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          relative rounded-xl bg-slate-800/50 border-2 backdrop-blur-sm transition-all duration-200 
          ${isFocused ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-600'}
          ${disabled ? 'opacity-50' : ''}
        `}>
          <div className="flex items-start min-h-[60px]">
            {/* attachment button */}
            <div className="flex items-center justify-center p-4 self-center">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={disabled || !!attachment}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,.txt,.md"
              />
            </div>

            {/* text input */}
            <div className="flex-1 min-h-0 py-2">
              {attachment && (
                <div className="mb-2 px-2">
                  <div className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg p-2 max-w-xs">
                    <FileIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300 truncate" title={attachment.name}>
                      {attachment.name}
                    </span>
                    <button
                      onClick={handleRemoveAttachment}
                      className="ml-auto p-1 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white"
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
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
                className="w-full bg-transparent py-4 pr-2 text-white placeholder-slate-400 focus:outline-none resize-none max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent text-base disabled:cursor-not-allowed leading-relaxed"
                style={{ 
                  minHeight: '60px',
                  lineHeight: '1.6'
                }}
              />
            </div>

            {/* voice and submit buttons */}
            <div className="flex items-center justify-center gap-2 p-4 self-center">
              <button
                type="button"
                disabled={disabled}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 disabled:cursor-not-allowed"
                aria-label="Voice input"
              >
                <Mic className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!input.trim() && !attachment) || disabled}
                className={`
                  p-2 rounded-lg transition-all duration-200 flex-shrink-0
                  ${(input.trim() || attachment) && !disabled
                    ? 'bg-white text-black hover:bg-gray-200 shadow-lg' 
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
