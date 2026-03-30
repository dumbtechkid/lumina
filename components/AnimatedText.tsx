import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface AnimatedTextProps {
  text: string;
  isStreaming: boolean;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ text, isStreaming }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [textProgress, setTextProgress] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const displayIndexRef = useRef(0);

  useEffect(() => {
    // While streaming, just show the glowing orb - don't animate yet
    if (isStreaming) {
      return;
    }

    // Once streaming is done, animate the complete text character by character
    if (!isStreaming && text.length > 0 && displayIndexRef.current < text.length) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        const nextIndex = displayIndexRef.current + 1;
        setDisplayedText(text.substring(0, nextIndex));
        displayIndexRef.current = nextIndex;
        setTextProgress((nextIndex / text.length) * 100);
      }, 60); // 60ms per character

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }

    // Once animation is complete, show everything
    if (!isStreaming && displayIndexRef.current === text.length) {
      setDisplayedText(text);
      setTextProgress(100);
    }
  }, [text, isStreaming]);

  // Reset when new conversation starts
  useEffect(() => {
    displayIndexRef.current = 0;
    setDisplayedText('');
    setTextProgress(0);
  }, []);

  return (
    <div className="relative w-full">
      {/* Glowing Orb Container - shows while streaming OR while animating */}
      {(isStreaming || (displayIndexRef.current < text.length && text.length > 0)) && (
        <div 
          className="relative h-8 mb-4 overflow-visible"
          style={{
            position: 'relative',
          }}
        >
          {/* SVG Trail Effect */}
          <svg 
            className="absolute top-0 left-0 w-full h-full overflow-visible"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="orbGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.8" />
                <stop offset="50%" stopColor="rgb(139, 92, 246)" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.6" />
              </linearGradient>
              <filter id="orbGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* While streaming: orb stays at left and pulses */}
            {isStreaming && (
              <>
                <circle
                  cx="5%"
                  cy="50%"
                  r="14"
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="2"
                  opacity={0.3 + 0.3 * Math.sin(Date.now() / 300)}
                  filter="url(#orbGlow)"
                />
                <circle
                  cx="5%"
                  cy="50%"
                  r="10"
                  fill="url(#orbGradient)"
                  filter="url(#orbGlow)"
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.8))',
                  }}
                />
                <circle
                  cx="5%"
                  cy="50%"
                  r="5"
                  fill="rgb(255, 255, 255)"
                  opacity={0.4 + 0.3 * Math.sin(Date.now() / 200)}
                />
              </>
            )}
            
            {/* While animating: orb moves across */}
            {!isStreaming && displayIndexRef.current < text.length && text.length > 0 && (
              <>
                <circle
                  cx={`${textProgress}%`}
                  cy="50%"
                  r="14"
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="2"
                  opacity={0.3 + 0.3 * Math.sin(Date.now() / 300)}
                  filter="url(#orbGlow)"
                />
                <circle
                  cx={`${textProgress}%`}
                  cy="50%"
                  r="10"
                  fill="url(#orbGradient)"
                  filter="url(#orbGlow)"
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.8))',
                  }}
                />
                <circle
                  cx={`${textProgress}%`}
                  cy="50%"
                  r="5"
                  fill="rgb(255, 255, 255)"
                  opacity={0.4 + 0.3 * Math.sin(Date.now() / 200)}
                />
              </>
            )}
          </svg>
        </div>
      )}

      {/* Text appearing after orb animation is complete */}
      <div className="markdown-body text-[15px] leading-relaxed tracking-wide text-slate-200">
        <ReactMarkdown>{displayedText}</ReactMarkdown>
      </div>

      {/* Blinking cursor while animating */}
      {!isStreaming && displayIndexRef.current < text.length && displayedText && text.length > 0 && (
        <span className="inline-block w-2 h-5 ml-1 bg-indigo-400 animate-pulse align-text-bottom" />
      )}
    </div>
  );
};

export default AnimatedText;
