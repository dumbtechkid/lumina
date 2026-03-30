import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, X, FileText, StopCircle, Loader2, ArrowUp, Settings as SettingsIcon, AudioLines } from 'lucide-react';
import { Attachment, AppConfig } from '../types';
import { blobToBase64 } from '../utils/audioUtils';
import { transcribeAudio } from '../services/geminiService';
import SettingsPanel from './SettingsPanel';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  onOpenLive: () => void;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, onOpenLive, config, setConfig }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments: Attachment[] = [];
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
        const base64 = await blobToBase64(file);
        const mimeType = file.type;
        let type: Attachment['type'] = 'document';
        
        if (mimeType.startsWith('image/')) type = 'image';
        else if (mimeType.startsWith('video/')) type = 'video';
        else if (mimeType.startsWith('audio/')) type = 'audio';

        newAttachments.push({
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType,
          type
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        const transcription = await transcribeAudio(audioBlob);
        setText(prev => prev + (prev ? ' ' : '') + transcription);
        setIsTranscribing(false);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-full pb-6 px-4 pt-2">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Settings Panel Popover */}
        <SettingsPanel 
          config={config} 
          setConfig={setConfig} 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2 px-1">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group bg-slate-800/80 backdrop-blur-md rounded-xl p-2 border border-white/10 min-w-[100px] max-w-[140px] shadow-lg">
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-2 -right-2 bg-slate-700 text-slate-300 rounded-full p-1.5 hover:bg-red-500 hover:text-white transition-colors border border-slate-600 z-10"
                >
                  <X size={10} />
                </button>
                {att.type === 'image' || att.type === 'video' ? (
                  <img src={att.previewUrl} alt="preview" className="h-20 w-full object-cover rounded-lg" />
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center text-slate-400 bg-slate-900/50 rounded-lg">
                     <FileText size={20} className="mb-1" />
                     <span className="text-[10px] w-full text-center px-1 truncate opacity-70">{att.file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Capsule */}
        <div className="relative flex items-end gap-2 bg-slate-900/80 backdrop-blur-xl p-2 pl-3 rounded-[32px] border border-white/10 shadow-2xl transition-all duration-300 hover:border-white/20">
          
          {/* Settings Toggle */}
          <button 
             onClick={() => setIsSettingsOpen(!isSettingsOpen)}
             className={`p-3 my-auto rounded-full transition-all duration-200 ${isSettingsOpen ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'}`}
             title="Settings"
          >
            <SettingsIcon size={20} />
          </button>

          {/* Live Mode Toggle */}
          <button 
             onClick={onOpenLive}
             className="p-3 my-auto text-slate-400 hover:text-pink-400 hover:bg-white/5 rounded-full transition-all duration-200"
             title="Gemini Live"
          >
            <AudioLines size={20} />
          </button>

          {/* File Button */}
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="p-3 my-auto text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-full transition-all duration-200"
             title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            multiple 
            accept="image/*,video/*,application/pdf,text/*"
          />

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? "Transcribing..." : "Ask anything..."}
            rows={1}
            disabled={isTranscribing}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 text-[15px] py-3.5 px-2 focus:outline-none resize-none max-h-[150px] overflow-y-auto"
          />

          {/* Dictation Button */}
          {(!text.trim() && attachments.length === 0) ? (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                p-3 my-auto rounded-full transition-all duration-300 flex-shrink-0
                ${isRecording 
                  ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500/50' 
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}
              `}
              title="Dictate"
            >
              {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          ) : (
             <button
              onClick={handleSend}
              disabled={isLoading}
              className={`
                p-3 my-auto rounded-full transition-all duration-300 shadow-lg flex-shrink-0
                ${isLoading 
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'}
              `}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} />}
            </button>
          )}
        </div>
        
        <p className="text-center text-[10px] text-slate-600 mt-3 font-medium tracking-wide">
          Lumina can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default InputArea;