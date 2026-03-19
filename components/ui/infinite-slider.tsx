'use client';

import { cn } from '@/lib/utils';
import { useMotionValue, animate, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  speedOnHover?: number;
  speed?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  duration,
  speedOnHover,
  speed = 25,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const effectiveDuration = duration ?? speed;
  const [isHovered, setIsHovered] = useState(false);
  const currentDuration = isHovered && speedOnHover ? speedOnHover : effectiveDuration;
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState(0);
  const translation = useMotionValue(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const half = direction === 'horizontal' ? el.scrollWidth / 2 : el.scrollHeight / 2;
      setContentSize(half);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [direction]);

  useEffect(() => {
    if (!contentSize) return;
    const from = reverse ? 0 : 0;
    const to = reverse ? contentSize : -contentSize;
    const controls = animate(translation, [from, to], {
      ease: 'linear',
      duration: currentDuration,
      repeat: Infinity,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [contentSize, currentDuration, reverse, translation]);

  return (
    <div
      className={cn('overflow-hidden', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        ref={containerRef}
        className={cn('flex', direction === 'vertical' && 'flex-col')}
        style={direction === 'horizontal' ? { x: translation, gap } : { y: translation, gap }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
