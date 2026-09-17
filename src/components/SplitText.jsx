import React, { useEffect, useRef } from 'react';

/**
 * SplitText component that animates text character-by-character
 * Compatible with React 19, zero-dependency, GPU-accelerated.
 */
export default function SplitText({
  text = '',
  className = '',
  delay = 40,
  duration = 0.6,
  from = { opacity: 0, y: 14 },
  to = { opacity: 1, y: 0 },
  tag: Tag = 'p',
  onLetterAnimationComplete,
}) {
  const letters = Array.from(text);
  const completedCount = useRef(0);

  useEffect(() => {
    completedCount.current = 0;
  }, [text]);

  const handleAnimationEnd = (index) => {
    completedCount.current += 1;
    if (completedCount.current >= letters.length) {
      if (onLetterAnimationComplete) {
        onLetterAnimationComplete();
      }
    }
  };

  return (
    <Tag className={`inline-flex flex-wrap items-center overflow-hidden pointer-events-none select-none ${className}`}>
      {letters.map((char, index) => {
        const staggerDelay = (index * delay) / 1000;
        return (
          <span
            key={`${text}-${index}`}
            onAnimationEnd={() => handleAnimationEnd(index)}
            style={{
              display: 'inline-block',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              animation: `splitTextIn ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}s both`,
              willChange: 'transform, opacity',
            }}
          >
            {char}
          </span>
        );
      })}
      <style>{`
        @keyframes splitTextIn {
          0% {
            opacity: ${from.opacity ?? 0};
            transform: translate3d(0, ${from.y ?? 14}px, 0);
          }
          100% {
            opacity: ${to.opacity ?? 1};
            transform: translate3d(0, ${to.y ?? 0}px, 0);
          }
        }
      `}</style>
    </Tag>
  );
}
