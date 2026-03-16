'use client';

import { useEffect, useState, useRef } from 'react';
import './RotatingText.css';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function RotatingText({
  texts,
  rotationInterval = 2000,
  mainClassName,
  elementLevelClassName,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('visible'); // 'visible' | 'exit' | 'enter'
  const nextIndex = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      nextIndex.current = (currentIndex + 1) % texts.length;
      setPhase('exit');
    }, rotationInterval);
    return () => clearInterval(id);
  }, [currentIndex, texts.length, rotationInterval]);

  useEffect(() => {
    if (phase === 'exit') {
      const t = setTimeout(() => {
        setCurrentIndex(nextIndex.current);
        setPhase('enter');
      }, 300);
      return () => clearTimeout(t);
    }
    if (phase === 'enter') {
      const t = setTimeout(() => setPhase('visible'), 300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <span className={cn('text-rotate', mainClassName)}>
      {texts[currentIndex].split('').map((char, i) => (
        <span
          key={`${currentIndex}-${i}`}
          className={cn('text-rotate-element', elementLevelClassName, `text-rotate-${phase}`)}
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
