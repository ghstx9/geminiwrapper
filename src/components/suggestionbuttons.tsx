import React from 'react';

interface SuggestionButtonsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestionButtons({ 
  suggestions, 
  onSuggestionClick, 
  disabled = false 
}: SuggestionButtonsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="flex flex-wrap justify-center gap-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={disabled}
            className={`
              relative rounded-lg border transition-all duration-200 text-sm py-3 px-5
              ${disabled 
                ? 'bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed opacity-50' 
                : 'bg-[#610bd215] border-slate-600 text-slate-200 hover:border-slate-500 hover:bg-slate-700/50 hover:scale-105 hover:shadow-lg'
              }
            `}
          >
            <span className="relative z-10">{suggestion}</span>
            {!disabled && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-600/10 to-blue-600/10 opacity-0 hover:opacity-100 transition-opacity duration-200" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}