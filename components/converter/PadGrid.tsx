'use client';

import type { DragEvent } from 'react';
import { useEffect, useState } from 'react';

type PadGridProps = {
  fileCount: number;
  currentBank: string;
  onBankChange: (bank: string) => void;
  sampleNames?: string[];
  onDropOnPad?: (padIndex: number) => void;
  isDragging?: boolean;
  onPadClick?: (padIndex: number) => void;
  showThankYou?: boolean;
};

export default function PadGrid({
  fileCount,
  currentBank,
  onBankChange,
  sampleNames = [],
  onDropOnPad,
  isDragging = false,
  onPadClick,
  showThankYou = false,
}: PadGridProps) {
  const banks = ['A', 'B', 'C', 'D'];
  const bankOffset = banks.indexOf(currentBank) * 16;

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, padIndex: number) => {
    event.preventDefault();
    if (onDropOnPad) {
      onDropOnPad(bankOffset + padIndex);
    }
  };

  const handlePadClick = (padIndex: number) => {
    const globalIndex = bankOffset + padIndex;
    if (onPadClick && globalIndex < fileCount) {
      onPadClick(globalIndex);
    }
  };

  const [animatedPads, setAnimatedPads] = useState<number[]>([]);

  useEffect(() => {
    if (showThankYou) {
      const sequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      let index = 0;

      const interval = setInterval(() => {
        if (index < sequence.length) {
          setAnimatedPads((prev) => [...prev, sequence[index]]);
          index += 1;
        } else {
          clearInterval(interval);
        }
      }, 100);

      return () => {
        clearInterval(interval);
        setAnimatedPads([]);
      };
    }

    setAnimatedPads([]);
    return undefined;
  }, [showThankYou]);

  const padLabels = [
    ['CRASH', 'CRASH2', 'RIDE CYMBAL', 'RIDE BELL'],
    ['HIGH TOM', 'MID TOM', 'LOW TOM', 'FLOOR TOM'],
    ['ALT SNARE', 'SNARE', 'HIHAT OPEN', 'HIHAT PEDAL'],
    ['SIDE STICK', 'BASS', 'HIHAT CLOSED', 'HIHAT LOOSE'],
  ];

  const padNumbers = [
    [13, 14, 15, 16],
    [9, 10, 11, 12],
    [5, 6, 7, 8],
    [1, 2, 3, 4],
  ];

  return (
    <div className="bg-stone-400/80 rounded p-3 relative">
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((row) =>
          padNumbers[row].map((padNum, col) => {
            const padIndex = padNum - 1;
            const globalPadIndex = bankOffset + padIndex;
            const isActive = globalPadIndex < fileCount;
            const sampleName = sampleNames[globalPadIndex] || '';
            const label = padLabels[row]?.[col] || '';
            const isAnimating = showThankYou && animatedPads.includes(padIndex);

            return (
              <div
                key={padNum}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, padIndex)}
                onClick={() => handlePadClick(padIndex)}
                className={`
                  aspect-square rounded-sm relative
                  ${!isAnimating && 'bg-gradient-to-br from-stone-500 to-stone-600'}
                  border-2 border-stone-700/50
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]
                  ${isActive && !isAnimating ? 'ring-1 ring-blue-400/50' : ''}
                  ${isDragging && !isAnimating ? 'hover:bg-stone-400 hover:border-blue-400' : ''}
                  ${!isAnimating ? 'cursor-pointer hover:brightness-110 active:brightness-90 active:scale-95' : ''}
                `}
                style={{
                  transition: isAnimating ? 'all 0.2s ease-out' : 'all 0.15s ease-out',
                  transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                  background: isAnimating ? 'linear-gradient(to bottom right, #4ade80, #16a34a)' : undefined,
                }}
              >
                <div className="absolute top-0.5 left-0.5 right-0.5">
                  <span className="text-[6px] text-stone-300/80 leading-none block truncate">{label}</span>
                </div>

                <div className="absolute bottom-0.5 right-1">
                  <span className="text-[10px] text-stone-300/90 font-medium">{padNum}</span>
                </div>

                {isActive && (
                  <div className="absolute bottom-0.5 left-0.5">
                    <span className="text-[5px] text-blue-300 truncate max-w-[90%] block">{sampleName}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
