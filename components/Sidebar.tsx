
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onCloseMobile: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onLogout: () => void;
  userName: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  sessions, 
  currentSessionId, 
  onNewChat, 
  onSelectSession,
  onCloseMobile,
  onRenameSession,
  onDeleteSession,
  onLogout,
  userName
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameSession(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteSession(id);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#f8f9fa]/95 dark:bg-[#0a0a14]/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/60 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col h-full shadow-2xl lg:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header with Brain Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50">
        <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 relative z-10">
              <defs>
                <linearGradient id="sidebarBrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              {/* Brain Outline */}
              <path d="M12 4C14.2091 4 16 5.79086 16 8C16 8.35064 15.9554 8.68965 15.8708 9.01344C15.9135 9.00456 15.9566 9 16 9C18.7614 9 21 11.2386 21 14C21 16.7614 18.7614 19 16 19H8C5.23858 19 3 16.7614 3 14C3 11.2386 5.23858 9 8 9C8.04343 9 8.08647 9.00456 8.12918 9.01344C8.04464 8.68965 8 8.35064 8 8C8 5.79086 9.79086 4 12 4Z" stroke="url(#sidebarBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Growth Arrow */}
              <path d="M8 14L10.5 16.5L13.5 13.5L16 16" stroke="url(#sidebarBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13V16H13" stroke="url(#sidebarBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Brain folds/details */}
              <path d="M12 4V7" stroke="url(#sidebarBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 16V19" stroke="url(#sidebarBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
           </svg>
        </div>
        <div>
           <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none block">NextStep</span>
           <span className="text-[10px] font-semibold text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded-full inline-block mt-1">AI Agent</span>
        </div>
        <button onClick={onCloseMobile} className="lg:hidden ml-auto text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 py-4">
        <button 
          onClick={onNewChat}
          className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Conversation
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide pb-4">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase px-3 mb-2 tracking-wider">Your Sessions</h3>
        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-xl mx-2">
            <p className="text-slate-400 dark:text-slate-600 text-sm">No history yet.</p>
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => editingId !== session.id && onSelectSession(session.id)}
            className={`group relative w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center gap-3 cursor-pointer border ${
              currentSessionId === session.id 
                ? 'bg-blue-50/80 border-blue-100 text-blue-900 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-white shadow-sm' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className={`shrink-0 ${currentSessionId === session.id ? 'text-primary' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            
            {editingId === session.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKeyDown}
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-blue-500 dark:border-slate-600 rounded px-2 py-1 w-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1">{session.title || 'Untitled Chat'}</span>
            )}

            {/* Action Buttons */}
            {!editingId && (
              <div className={`flex items-center gap-1 ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <button 
                  onClick={(e) => startEditing(e, session)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Rename"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Delete"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
        
        {/* User Info */}
        <div className="flex items-center gap-3 p-2 rounded-lg transition-colors group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-primary dark:text-white ring-2 ring-white dark:ring-slate-800">
            {getInitials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userName || 'Guest'}</p>
            <p className="text-[10px] font-medium text-primary uppercase tracking-wide">Free Plan</p>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-all"
            title="Log out & Clear History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
