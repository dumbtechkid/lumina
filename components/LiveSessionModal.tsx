import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Volume2, Video, VideoOff, Loader2 } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

interface LiveSessionModalProps {
  onClose: () => void;
}

const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  
  // Mutable refs for closure access
  const isMicMutedRef = useRef(isMicMuted);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  
  useEffect(() => { isMicMutedRef.current = isMicMuted; }, [isMicMuted]);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);

  useEffect(() => {
    let cleanup = () => {};

    const startSession = async () => {
      try {
        const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
        if (!API_KEY || API_KEY.length < 10) {
          setErrorMessage("API key not properly configured");
          setStatus('error');
          return;
        }
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play().catch(e => console.warn("Video play warning:", e));
        }

        let nextStartTime = 0;
        
        const session = await ai.live.connect({
          model: 'gemini-2.5-flash-lite',
          callbacks: {
            onopen: () => {
              console.log("Live session opened");
              setStatus('connected');
              setErrorMessage('');
              sessionRef.current = session;
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                if (isMicMutedRef.current) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                   pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                let binary = '';
                const bytes = new Uint8Array(pcm16.buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                if (sessionRef.current) {
                   try {
                     sessionRef.current.sendRealtimeInput({
                        media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                     });
                   } catch (err) {
                     console.error("Error sending audio", err);
                   }
                }
              };
              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (msg) => {
               try {
                 const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                 if (audioData) {
                    const binaryString = atob(audioData);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                    }
                    const int16 = new Int16Array(bytes.buffer);
                    const buffer = audioCtx.createBuffer(1, int16.length, 24000);
                    const channelData = buffer.getChannelData(0);
                    for(let i=0; i<int16.length; i++) channelData[i] = int16[i] / 32768.0;

                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);
                    
                    const currentTime = audioCtx.currentTime;
                    if (nextStartTime < currentTime) nextStartTime = currentTime;
                    source.start(nextStartTime);
                    nextStartTime += buffer.duration;
                 }
               } catch (err) {
                 console.error("Error processing message:", err);
               }
            },
            onclose: () => {
              console.log("Live session closed");
              onClose();
            },
            onerror: (e) => { 
              console.error("Live session error:", e);
              setErrorMessage(`Error: ${String(e)}`);
              setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "You are a helpful, conversational voice assistant.",
          }
        });

        // Video Frame Loop (1 FPS)
        const interval = setInterval(async () => {
           if (!isVideoEnabledRef.current || !canvasRef.current || !videoRef.current) return;
           const ctx = canvasRef.current.getContext('2d');
           if (!ctx) return;
           
           try {
             canvasRef.current.width = videoRef.current.videoWidth;
             canvasRef.current.height = videoRef.current.videoHeight;
             ctx.drawImage(videoRef.current, 0, 0);
             
             const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
             if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } });
             }
           } catch (err) {
             console.error("Error sending video frame", err);
           }
        }, 1000);

        cleanup = () => {
          clearInterval(interval);
          try {
            if (sessionRef.current) sessionRef.current.close();
          } catch (e) { console.warn("Error closing session:", e); }
          stream.getTracks().forEach(t => t.stop());
          try { audioCtx.close(); } catch (e) { console.warn("Error closing audio context:", e); }
          try { inputCtx.close(); } catch (e) { console.warn("Error closing input context:", e); }
        };

      } catch (err) {
        console.error("Failed to start live session", err);
        setErrorMessage(`Failed to start: ${String(err)}`);
        setStatus('error');
      }
    };

    startSession();
    return () => cleanup();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 overflow-hidden">
        <video 
           ref={videoRef} 
           className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-20 blur-xl'}`} 
           playsInline 
           muted 
        />
        {!isVideoEnabled && (
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 animate-pulse flex items-center justify-center shadow-[0_0_100px_rgba(120,50,255,0.5)]">
               <Volume2 size={48} className="text-white" />
             </div>
           </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full bg-black/40 text-white hover:bg-red-500 transition-colors z-50">
        <X size={24} />
      </button>

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-50">
         <button 
           onClick={() => setIsVideoEnabled(!isVideoEnabled)}
           className={`p-4 rounded-full backdrop-blur-md border border-white/20 transition-all ${isVideoEnabled ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-white/10'}`}
         >
           {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
         </button>
         
         <div className="px-6 py-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-mono text-sm">
           {status === 'connecting' && 'Connecting...'}
           {status === 'connected' && 'Live Session Active'}
           {status === 'error' && `Error: ${errorMessage || 'Unknown error'}`}
         </div>

         <button 
           onClick={() => setIsMicMuted(!isMicMuted)}
           className={`p-4 rounded-full backdrop-blur-md border border-white/20 transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
         >
           {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
         </button>
      </div>
    </div>
  );
};

export default LiveSessionModal;