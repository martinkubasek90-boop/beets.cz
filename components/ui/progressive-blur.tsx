'use client';

import { cn } from '@/lib/utils';

interface ProgressiveBlurProps {
  className?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  blurIntensity?: number;
}

export function ProgressiveBlur({
  className,
  direction = 'left',
  blurIntensity = 1,
}: ProgressiveBlurProps) {
  const gradientMap = {
    left: 'to right',
    right: 'to left',
    top: 'to bottom',
    bottom: 'to top',
  };

  return (
    <div className={cn('pointer-events-none', className)}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${i * blurIntensity * 2}px)`,
            WebkitBackdropFilter: `blur(${i * blurIntensity * 2}px)`,
            maskImage: `linear-gradient(${gradientMap[direction]}, transparent ${(i - 1) * 25}%, black ${i * 25}%, black ${i * 25 + 25}%, transparent ${(i + 1) * 25}%)`,
          }}
        />
      ))}
    </div>
  );
}
