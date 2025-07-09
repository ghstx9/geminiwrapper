'use client';

import React, { useState } from 'react';
import { ChevronDown, Check, Cpu, Zap, Brain, Sparkles, Fish } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const models: Model[] = [
  {
    id: 'gemma-3-27b-it',
    name: 'Gemma 3',
    description: "Google's open source model",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'qwen/qwen3-30b-a3b:free',
    name: 'Qwen 3',
    description: 'Newest Qwen Model',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct:free',
    name: 'Mistral 3.2',
    description: 'Optimized model for speed',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324:free', 
    name: 'DeepSeek V3',
    description: 'The infamous DeepSeek model',
    icon: <Fish className="h-4 w-4" />,
  },
  {
    id: 'gemini-2.5-pro', 
    name: 'Gemini 2.5 Pro',
    description: 'Most advanced Google model',
    icon: <Cpu className="h-4 w-4" />,
  }
];

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModelData = models.find(model => model.id === selectedModel) || models[0];


  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200
          ${disabled 
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
            : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'
          }
        `}
      >
        <div className="flex items-center gap-2">
          {selectedModelData.icon}
          <span className="font-medium text-sm">{selectedModelData.name}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 px-2 py-1">Select Model</h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-200
                  ${model.id === selectedModel 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-200 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3 flex-1">
                  {model.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{model.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{model.description}</p>
                  </div>
                </div>
                
                {model.id === selectedModel && (
                  <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ModelSelector;
