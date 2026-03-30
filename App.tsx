import React, { useState, useEffect, useRef } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import LiveSessionModal from './components/LiveSessionModal';
import AnimatedText from './components/AnimatedText';
import { ChatSession, Message, Role, Attachment, AppConfig } from './types';
import { generateChatResponseStream } from './services/geminiService';

// Simple UUID polyfill
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  
  // App Config State
  const [config, setConfig] = useState<AppConfig>({
    modelPreference: 'fast',
    capabilities: { search: false, maps: false },
    imageGeneration: { enabled: false, model: 'flash', aspectRatio: '1:1', size: '1K' }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lumina_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
        else createNewSession();
      } catch (e) {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('lumina_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, streamedText]);

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) setCurrentSessionId(newSessions[0].id);
      else createNewSession();
    }
    if (newSessions.length === 0) localStorage.removeItem('lumina_sessions');
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        let title = s.title;
        if (title === 'New Conversation' && newMessages.length > 0) {
          const firstUserMsg = newMessages.find(m => m.role === Role.USER);
          if (firstUserMsg && firstUserMsg.text) {
             title = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
          }
        }
        return { ...s, messages: newMessages, title, updatedAt: Date.now() };
      }
      return s;
    }));
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!currentSessionId) return;
    const currentSession = getCurrentSession();
    if (!currentSession) return;

    const userMsg: Message = {
      id: generateId(),
      role: Role.USER,
      text: text,
      attachments: attachments,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    updateSessionMessages(currentSessionId, updatedMessages);
    
    setIsLoading(true);
    setStreamedText(''); 

    try {
      // Get location for Maps grounding if enabled
      let location: { latitude: number, longitude: number } | undefined;
      if (config.capabilities.maps) {
        try {
           const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
             navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
           );
           location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch (e) { console.warn("Location denied"); }
      }

      const stream = generateChatResponseStream(currentSession.messages, text, attachments, config, location);
      
      let fullResponseText = '';
      let generatedImage = undefined;
      let groundingChunks: any[] = [];
      
      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponseText += chunk.text;
          setStreamedText(fullResponseText);
        }
        if (chunk.image) generatedImage = chunk.image;
        if (chunk.groundingChunks) groundingChunks = chunk.groundingChunks;
      }

      const botMsg: Message = {
        id: generateId(),
        role: Role.MODEL,
        text: fullResponseText,
        generatedImage,
        groundingChunks,
        timestamp: Date.now()
      };

      updateSessionMessages(currentSessionId, [...updatedMessages, botMsg]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg: Message = {
        id: generateId(),
        role: Role.MODEL,
        text: "I'm sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      };
      updateSessionMessages(currentSessionId, [...updatedMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamedText('');
    }
  };

  const currentMessages = getCurrentSession()?.messages || [];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {isLiveOpen && <LiveSessionModal onClose={() => setIsLiveOpen(false)} />}
      
      {/* Background Gradient Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* Sidebar */}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId || ''}
        onSelectSession={setCurrentSessionId}
        onNewChat={createNewSession}
        onDeleteSession={deleteSession}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl z-20 absolute top-0 w-full transition-all">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="font-semibold text-lg text-slate-200 truncate tracking-tight">
              {getCurrentSession()?.title || "Lumina AI"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px]">
               <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-purple-400">AI</span>
               </div>
             </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 sm:px-6 custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
            
            {currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 opacity-100 pb-20 animate-fade-in-up">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl">
                    <Sparkles size={40} className="text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mt-8 mb-3 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                  Hello, I'm Lumina.
                </h3>
                <p className="text-slate-400 text-lg font-light text-center max-w-md leading-relaxed">
                  How can I assist you today? <br />
                  <span className="text-sm opacity-60">Chat, analyze files, or ask anything.</span>
                </p>
                
                {/* Quick suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                   {["Explain quantum computing", "Summarize this document", "Write a python script", "Help me with debugging"].map((suggestion, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSendMessage(suggestion, [])}
                        className="text-sm p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-slate-300 text-left"
                      >
                        {suggestion}
                      </button>
                   ))}
                </div>
              </div>
            ) : (
              <>
                {currentMessages.map((msg, index) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isLast={index === currentMessages.length - 1} 
                  />
                ))}
                
                {/* Streaming Message Placeholder */}
                {isLoading && (
                   <div className="flex w-full mb-8 justify-start animate-fade-in-up">
                     <div className="flex max-w-[85%] lg:max-w-[70%] flex-col items-start">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md text-white">
                             <Sparkles size={10} />
                           </div>
                           <span className="text-xs font-medium text-slate-400">Lumina</span>
                        </div>
                        <div className="p-5 rounded-[24px] rounded-tl-sm bg-slate-900/60 backdrop-blur-md border border-white/5 text-slate-100 shadow-lg min-w-[60px]">
                           <AnimatedText text={streamedText} isStreaming={true} />
                        </div>
                     </div>
                   </div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <InputArea 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onOpenLive={() => setIsLiveOpen(true)}
          config={config}
          setConfig={setConfig}
        />
      </div>
    </div>
  );
};

export default App;