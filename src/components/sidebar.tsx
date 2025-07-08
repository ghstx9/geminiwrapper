import { MoonStar, Plus, X } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ 
  onNewChat, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
  const handleNewChat = () => {
    onNewChat();
    if (isMobile && onClose) {
      onClose();
    }
  };

  // desktop sidebar
  if (!isMobile) {
    return (
      <aside className="w-80 bg-[#0F1528] border-r border-[#0F1528] hidden md:flex flex-col">
        <div className="p-6 border-b border-[#0F1528]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-[#0b36d23f] rounded-lg flex items-center justify-center">
              <MoonStar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ricky&#39;s LM Demo</h1>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-3 w-full bg-[#0b36d23f] text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 p-6">
          {/* chat history could go here */}
        </div>
      </aside>
    );
  }

  // mobile sidebar overlay
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-80 bg-slate-800 border-r border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#0b36d23f] rounded-lg flex items-center justify-center">
                <MoonStar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Ricky&#39;s LM Demo</h1>
              </div>
            </div>
            <button
              onClick={onClose}
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
        <div className="flex-1 p-6">
          {/* chat history could go here */}
        </div>
      </div>
    </div>
  );
}