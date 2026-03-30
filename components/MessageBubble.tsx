import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Volume2, FileText, Loader2, StopCircle, Sparkles, Download, ExternalLink, MapPin } from 'lucide-react';
import { Message, Role } from '../types';
import { generateSpeech } from '../services/geminiService';
import { playAudioBuffer } from '../utils/audioUtils';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLast }) => {
  const isUser = message.role === Role.USER;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const handlePlayTTS = async () => {
    if (isPlaying && audioSource) {
      audioSource.stop();
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const buffer = await generateSpeech(message.text);
      if (buffer) {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const source = playAudioBuffer(buffer, context);
        setAudioSource(source);
        setIsPlaying(true);
        
        source.onended = () => {
          setIsPlaying(false);
          setAudioSource(null);
        };
      }
    } catch (err) {
      console.error("Playback failed", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <div className={`flex w-full mb-8 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] lg:max-w-[65%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Avatar */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
           <div className={`
             w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md
             ${isUser ? 'bg-white text-slate-900' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white'}
           `}>
             {isUser ? 'You' : <Sparkles size={10} />}
           </div>
           <span className="text-xs font-medium text-slate-400">
             {isUser ? 'You' : 'Lumina'}
           </span>
        </div>

        {/* Bubble */}
        <div 
          className={`
            relative p-5 shadow-lg overflow-hidden transition-all duration-300
            ${isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-[24px] rounded-tr-sm' 
              : 'bg-slate-900/60 backdrop-blur-md border border-white/5 text-slate-100 rounded-[24px] rounded-tl-sm'}
          `}
        >
          {/* User Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="relative group overflow-hidden rounded-xl border border-white/10 shadow-sm">
                  {att.type === 'image' || att.type === 'video' ? (
                    <img 
                      src={att.previewUrl} 
                      alt="Attachment" 
                      className="h-32 w-auto object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-black/30 backdrop-blur-sm text-sm">
                      <FileText size={16} className="text-blue-300" />
                      <span className="max-w-[100px] truncate opacity-90">{att.file.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Generated Content: Image */}
          {message.generatedImage && (
            <div className="mb-4 relative group rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/50">
              <img 
                src={message.generatedImage} 
                alt="Generated" 
                className="w-full h-auto object-contain max-h-[500px]"
              />
              <a 
                href={message.generatedImage} 
                download={`lumina-${Date.now()}.png`}
                className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                 <Download size={16} />
              </a>
            </div>
          )}

          {/* Text Content */}
          <div className={`markdown-body text-[15px] leading-relaxed tracking-wide ${isUser ? 'text-white/95' : 'text-slate-200'}`}>
             <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>

          {/* Grounding Sources */}
          {message.groundingChunks && message.groundingChunks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Sources</div>
              <div className="flex flex-wrap gap-2">
                {message.groundingChunks.map((chunk, i) => {
                   if (chunk.web) {
                     return (
                       <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 text-xs text-slate-400 transition-colors">
                         <ExternalLink size={10} /> {chunk.web.title}
                       </a>
                     );
                   }
                   if (chunk.maps) {
                     return (
                        <a key={i} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-green-500/20 hover:text-green-300 text-xs text-slate-400 transition-colors">
                         <MapPin size={10} /> {chunk.maps.title}
                       </a>
                     );
                   }
                   return null;
                })}
              </div>
            </div>
          )}

          {/* TTS Button */}
          {!isUser && message.text && (
             <div className="mt-4 flex items-center justify-start pt-3 border-t border-white/5">
                <button
                  onClick={handlePlayTTS}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all text-xs font-medium text-slate-400 hover:text-indigo-300"
                >
                  {isLoadingAudio ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isPlaying ? (
                     <StopCircle size={12} className="text-indigo-400" />
                  ) : (
                    <Volume2 size={12} className="group-hover:scale-110 transition-transform" />
                  )}
                  <span>{isPlaying ? 'Stop' : 'Read Aloud'}</span>
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;