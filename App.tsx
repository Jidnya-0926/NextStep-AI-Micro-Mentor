
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import { Message, ChatSession, RoadmapData, CourseData, AgentType, AgentHandoffData, GroundingMetadata } from './types';
import { createChatSession, sendMessage, extractJson } from './services/geminiService';
import { Chat } from '@google/genai';
import { SUGGESTED_PROMPTS, AGENTS } from './constants';

// Simple ID generator replacement since uuid package might not be available in strict env
const generateId = () => Math.random().toString(36).substring(2, 9);

// Local Storage Keys
const LS_SESSIONS_KEY = 'nextstep_sessions';
const LS_MSG_PREFIX = 'nextstep_msg_';
const LS_LAST_SESSION_KEY = 'nextstep_last_session_id';
const LS_THEME_KEY = 'nextstep_theme';
const LS_USERNAME_KEY = 'nextstep_username';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem(LS_THEME_KEY) as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // User Name State
  const [userName, setUserName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempNameInput, setTempNameInput] = useState('');
  
  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(LS_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Initialize sessions from Local Storage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(LS_SESSIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load sessions from storage", e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Agent Menu State
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentQuery, setAgentQuery] = useState('');
  const [filteredAgents, setFilteredAgents] = useState<AgentType[]>(AGENTS);
  
  // Refs to persist the Chat object across renders without triggering re-renders
  const chatInstanceRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // --- Session Management Functions ---

  // NOTE: Defined before useEffect so it can be used inside it if needed, 
  // though typically we use it in event handlers.
  
  const handleSelectSession = (id: string) => {
    if (id !== currentSessionId) {
      // CRITICAL FIX: Clear messages from state BEFORE switching ID.
      // This prevents the 'save messages' effect from writing the OLD messages 
      // to the NEW session ID's localStorage key during the render cycle.
      setMessages([]); 
      setCurrentSessionId(id);
      setSidebarOpen(false);
    }
  };

  const createNewChat = () => {
    const newSessionId = generateId();
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Chat',
      preview: 'Start a conversation...',
      updatedAt: Date.now()
    };
    
    setSessions(prev => [newSession, ...prev]);
    
    // Explicitly clear messages and select new session
    setMessages([]);
    setCurrentSessionId(newSessionId);
    setSidebarOpen(false);
  };

  // Initialize App Data
  useEffect(() => {
    const initApp = () => {
      // 1. Check for User Name
      const storedName = localStorage.getItem(LS_USERNAME_KEY);
      if (storedName) {
        setUserName(storedName);
      } else {
        setShowNameModal(true);
      }

      // 2. Try to restore last active session
      const lastSessionId = localStorage.getItem(LS_LAST_SESSION_KEY);
      
      if (lastSessionId && sessions.some(s => s.id === lastSessionId)) {
        handleSelectSession(lastSessionId);
      } 
      // 3. If no last session, but sessions exist, load the most recent (first)
      else if (sessions.length > 0) {
        handleSelectSession(sessions[0].id);
      }
      // 4. If absolutely no data, create a brand new chat
      else if (sessions.length === 0) {
        createNewChat();
      }
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    if (showNameModal && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showNameModal]);

  // Save Sessions to Local Storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions to localStorage", e);
    }
  }, [sessions]);

  // Load Messages from Local Storage when Session ID changes
  useEffect(() => {
    if (currentSessionId) {
      // Persist the current session ID as the "last active" one
      localStorage.setItem(LS_LAST_SESSION_KEY, currentSessionId);

      const savedMsgs = localStorage.getItem(LS_MSG_PREFIX + currentSessionId);
      if (savedMsgs) {
        try {
          const parsedMessages = JSON.parse(savedMsgs);
          setMessages(parsedMessages);
          // Restore Gemini Chat Context with history
          chatInstanceRef.current = createChatSession(parsedMessages);
        } catch (e) {
          console.error("Failed to parse messages", e);
          setMessages([]);
          chatInstanceRef.current = createChatSession();
        }
      } else {
        setMessages([]);
        chatInstanceRef.current = createChatSession();
      }
    }
  }, [currentSessionId]);

  // Save Messages to Local Storage whenever they change (for the current session)
  useEffect(() => {
    // Only save if we have a valid session ID and there are messages to save.
    // This guard combined with setMessages([]) in handleSelectSession prevents overwrites.
    if (currentSessionId && messages.length > 0) {
      try {
        localStorage.setItem(LS_MSG_PREFIX + currentSessionId, JSON.stringify(messages));
      } catch (e) {
         console.error("Failed to save messages to localStorage", e);
      }
    }
  }, [messages, currentSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle filtering agents when typing
  useEffect(() => {
    if (showAgentMenu) {
      const lowerQuery = agentQuery.toLowerCase();
      const filtered = AGENTS.filter(agent => 
        agent.name.toLowerCase().includes(lowerQuery) || 
        agent.id.toLowerCase().includes(lowerQuery)
      );
      setFilteredAgents(filtered);
    }
  }, [agentQuery, showAgentMenu]);

  const handleSaveName = () => {
    const trimmedName = tempNameInput.trim();
    if (trimmedName) {
      setUserName(trimmedName);
      localStorage.setItem(LS_USERNAME_KEY, trimmedName);
      setShowNameModal(false);
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === id ? { ...session, title: newTitle } : session
    ));
  };

  const handleDeleteSession = (id: string) => {
    // 1. Remove from Local Storage
    localStorage.removeItem(LS_MSG_PREFIX + id);
    
    // 2. Remove from State
    setSessions(prev => {
      const filtered = prev.filter(session => session.id !== id);
      
      // If we deleted the current session, switch to the first available or create new
      if (id === currentSessionId) {
        // Clear messages immediately to avoid ghost data
        setMessages([]);
        
        const nextId = filtered.length > 0 ? filtered[0].id : null;
        if (nextId) {
           // We need to set the new session ID, but we can't call handleSelectSession directly inside setState
           // So we schedule it
           setTimeout(() => setCurrentSessionId(nextId), 0);
        } else {
           setTimeout(() => createNewChat(), 0);
        }
      }
      return filtered;
    });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure? This will delete all chat history permanently.")) {
      // 1. Clear Local Storage keys related to NextStep
      // Iterate to find all message keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('nextstep_')) {
          localStorage.removeItem(key);
        }
      });

      // 2. Reset State
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setUserName('');
      setTempNameInput('');
      
      // 3. Reset Chat Instance
      chatInstanceRef.current = null;

      // 4. Show Name Modal to restart flow
      setShowNameModal(true);
      setSidebarOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentInput(val);
    
    // Check for slash command
    if (val.startsWith('/')) {
      setShowAgentMenu(true);
      setAgentQuery(val.slice(1)); // Remove the slash
    } else {
      setShowAgentMenu(false);
    }
  };

  const handleSelectAgent = (agent: AgentType) => {
    setCurrentInput(`Act as ${agent.name}: `);
    setShowAgentMenu(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (text: string = currentInput) => {
    if (!text.trim() || !chatInstanceRef.current) return;

    const userMsgId = generateId();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: text,
      type: 'text',
      timestamp: Date.now()
    };

    // Optimistically update UI
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentInput('');
    setShowAgentMenu(false);
    setIsTyping(true);

    try {
      const response = await sendMessage(chatInstanceRef.current, text);
      const responseText = response.text || "I'm having trouble thinking right now.";
      
      // ADK FEATURE: Extract Google Search Grounding Metadata
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;

      // Check for structured JSON data
      const jsonData = extractJson(responseText);
      
      let messageType: 'text' | 'roadmap' | 'courses' | 'handoff' = 'text';
      let messageData = undefined;

      if (jsonData) {
        if (jsonData.weeks && Array.isArray(jsonData.weeks)) {
          messageType = 'roadmap';
          messageData = jsonData as RoadmapData;
        } else if (jsonData.courses && Array.isArray(jsonData.courses)) {
          messageType = 'courses';
          messageData = jsonData as CourseData;
        } else if (jsonData.handoff) {
          messageType = 'handoff';
          messageData = jsonData as AgentHandoffData;
        }
      }

      const botMsgId = generateId();
      const newBotMessage: Message = {
        id: botMsgId,
        role: 'model',
        text: responseText, // Save full text
        type: messageType,
        data: messageData,
        groundingMetadata: groundingMetadata, // Save grounding info
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newBotMessage]);

      // --- Smart Title Renaming Logic ---
      if (currentSessionId) {
        let newTitle = '';

        // 1. Check if the bot explicitly states its Agent identity
        const agentMatch = responseText.match(/🤖 \*\*(.*?)( Agent)?\*\*/);
        if (agentMatch && agentMatch[1]) {
           newTitle = agentMatch[1].trim();
        } 
        // 2. Check content type
        else if (messageType === 'roadmap') {
          newTitle = 'Roadmap Generator';
        } else if (messageType === 'courses') {
           newTitle = 'Course Finder';
        }

        // Only rename if we found a specific agent AND the current title is generic
        if (newTitle) {
          const currentTitle = sessions.find(s => s.id === currentSessionId)?.title || '';
          const isGeneric = currentTitle === 'New Chat' || currentTitle.toLowerCase() === 'hi' || currentTitle.toLowerCase() === 'hello';
          
          if (isGeneric || currentTitle === 'New Chat') {
             handleRenameSession(currentSessionId, newTitle);
          }
        }
        // Fallback: Name after user prompt if it's the start
        else if (messages.length === 0) {
             const userTextShort = text.slice(0, 30) + (text.length > 30 ? '...' : '');
             if (text.length > 2) {
                handleRenameSession(currentSessionId, userTextShort);
             }
        }
      }

    } catch (error: any) {
      const errorStr = error?.message || error?.error?.message || JSON.stringify(error);
      const isQuota = errorStr.includes('QUOTA_EXCEEDED');
      
      if (!isQuota) {
        console.error("App Error Handler:", error);
      }
      
      let errorMessage = "Sorry, I encountered an error connecting to the AI.";
      
      if (isQuota) {
        errorMessage = "⚠️ **Daily Limit Reached**\n\nThe AI provider's free tier daily quota has been exceeded for this API key. \n\nPlease try again tomorrow or use a different API key if available.";
      } else if (errorStr.includes('429')) {
        errorMessage = "⚠️ **High Traffic**\n\nI'm receiving too many messages right now! Please wait a moment and try again.";
      } else if (errorStr.includes('500') || errorStr.includes('xhr error')) {
        errorMessage = "⚠️ **Connection Error**\n\nThere seems to be a temporary issue connecting to the AI service. Please check your internet connection or try again in a moment.";
      }

      const errorMsg: Message = {
        id: generateId(),
        role: 'model',
        text: errorMessage,
        type: 'text',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleHandoff = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showAgentMenu && filteredAgents.length > 0) {
        handleSelectAgent(filteredAgents[0]);
      } else {
        handleSendMessage();
      }
    }
    if (e.key === 'Escape') {
      setShowAgentMenu(false);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveName();
  };
  
  // Current session info
  const activeSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const activeTitle = activeSession?.title || 'NextStep AI';

  return (
    <div className="flex h-screen bg-[#f9fafb] dark:bg-background overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300 font-sans bg-grid-pattern">
      
      {/* Name Input Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-[float_0.5s_ease-out]">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-md">
                 <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                    <defs>
                      <linearGradient id="modalBrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <path d="M12 4C14.2091 4 16 5.79086 16 8C16 8.35064 15.9554 8.68965 15.8708 9.01344C15.9135 9.00456 15.9566 9 16 9C18.7614 9 21 11.2386 21 14C21 16.7614 18.7614 19 16 19H8C5.23858 19 3 16.7614 3 14C3 11.2386 5.23858 9 8 9C8.04343 9 8.08647 9.00456 8.12918 9.01344C8.04464 8.68965 8 8.35064 8 8C8 5.79086 9.79086 4 12 4Z" stroke="url(#modalBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 14L10.5 16.5L13.5 13.5L16 16" stroke="url(#modalBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13V16H13" stroke="url(#modalBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 4V7" stroke="url(#modalBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 16V19" stroke="url(#modalBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to NextStep</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">Let's get to know you. What should I call you?</p>
            </div>
            
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!tempNameInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                Get Started
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewChat}
        onSelectSession={handleSelectSession}
        onCloseMobile={() => setSidebarOpen(false)}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onLogout={handleLogout}
        userName={userName}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Universal Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center px-4 justify-between shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
             
             {/* Header Info */}
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <h2 className="font-bold text-slate-800 dark:text-white text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                   {activeTitle}
                 </h2>
                 <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/50 dark:bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                   <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                   v2.5
                 </span>
               </div>
               <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                 AI Career Mentor & Technical Tutor
               </p>
             </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Theme Toggle in Header */}
             <button 
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white transition-all text-xs font-medium"
             >
                {theme === 'dark' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    <span>Dark</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <span>Light</span>
                  </>
                )}
             </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col">
            
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                {/* Brain Logo (Large) with Animation */}
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl border border-slate-800 animate-float overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
                     <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 relative z-10">
                        <defs>
                          <linearGradient id="welcomeBrainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                        <path d="M12 4C14.2091 4 16 5.79086 16 8C16 8.35064 15.9554 8.68965 15.8708 9.01344C15.9135 9.00456 15.9566 9 16 9C18.7614 9 21 11.2386 21 14C21 16.7614 18.7614 19 16 19H8C5.23858 19 3 16.7614 3 14C3 11.2386 5.23858 9 8 9C8.04343 9 8.08647 9.00456 8.12918 9.01344C8.04464 8.68965 8 8.35064 8 8C8 5.79086 9.79086 4 12 4Z" stroke="url(#welcomeBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 14L10.5 16.5L13.5 13.5L16 16" stroke="url(#welcomeBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 13V16H13" stroke="url(#welcomeBrainGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 4V7" stroke="url(#welcomeBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M12 16V19" stroke="url(#welcomeBrainGradient)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 mb-3 tracking-tight">
                  NextStep AI
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mb-10 leading-relaxed font-medium">
                  {userName ? `Hi ${userName}, I'm your` : "Your"} intelligent micro-career mentor. <br/>
                  <span className="text-slate-500 dark:text-slate-500 text-base font-normal">Expert guidance on roadmaps, skills, and market trends.</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="group relative overflow-hidden text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 transition-all text-sm text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md backdrop-blur-sm"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="block mb-2 text-slate-400 group-hover:text-primary dark:text-slate-500 dark:group-hover:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                      </span>
                      <span className="relative z-10 font-medium">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} onHandoff={handleHandoff} />
                ))}
                
                {isTyping && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-800">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white animate-pulse"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <div className="flex gap-1.5 px-5 py-4 bg-white/80 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/80 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-sm">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full typing-dot"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full typing-dot"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full typing-dot"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:pb-6 relative z-20">
          <div className="max-w-4xl mx-auto relative">
            
            {/* Agent Menu Popup */}
            {showAgentMenu && (
              <div className="absolute bottom-full left-0 mb-3 w-full md:w-80 max-h-72 overflow-y-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-20 animate-[slideUp_0.2s_ease-out] backdrop-blur-md">
                <div className="p-3 sticky top-0 bg-white/95 dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-800 z-10 backdrop-blur-md">
                  <div className="text-xs font-bold text-primary uppercase px-2 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Active Agents
                  </div>
                </div>
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800/80 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 group"
                    >
                      <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{agent.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{agent.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate w-56">{agent.description}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">No matching agents found</div>
                )}
              </div>
            )}

            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/50 to-purple-600/50 rounded-2xl opacity-10 group-focus-within:opacity-50 transition duration-500 blur-md"></div>
                <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-lg dark:shadow-none border border-slate-200/50 dark:border-slate-800/50">
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything or type '/' for agents..."
                      className="w-full bg-transparent text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-5 py-4 pr-14 focus:outline-none transition-all"
                      disabled={isTyping}
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={!currentInput.trim() || isTyping}
                      className={`absolute right-2 p-2 rounded-lg transition-all duration-200 ${
                        currentInput.trim() && !isTyping
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    </button>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3 font-medium tracking-wide uppercase opacity-70">
              NextStep can make mistakes. Check important information.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;