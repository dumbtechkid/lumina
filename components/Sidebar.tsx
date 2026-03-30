import React from 'react';
import { Plus, MessageSquare, Trash2, X, Sparkles } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  toggleSidebar
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-950/80 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                Lumina
              </h1>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-6 pb-2">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className="group w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-200 py-3.5 px-4 rounded-2xl transition-all duration-200 font-medium"
            >
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                 <Plus size={18} />
              </div>
              <span>New Conversation</span>
            </button>
          </div>

          <div className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            History
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-2">
                <div className="p-3 bg-white/5 rounded-full">
                   <MessageSquare size={20} className="opacity-50" />
                </div>
                <p className="text-sm">No chats yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={`
                    group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent
                    ${currentSessionId === session.id 
                      ? 'bg-blue-500/10 text-blue-100 border-blue-500/20 shadow-sm' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                  `}
                >
                  <MessageSquare size={16} className={currentSessionId === session.id ? 'text-blue-400' : 'text-slate-600'} />
                  <div className="flex-1 truncate text-sm font-medium">
                    {session.title || "Untitled Chat"}
                  </div>
                  <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5 shadow-lg">
               <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                 Pro
               </div>
               <div className="flex-1">
                 <div className="text-xs font-medium text-slate-200">Lumina Plus</div>
                 <div className="text-[10px] text-slate-400">By Vedant</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;