import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const goNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, flashcards.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const toggleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleFlip]);

  if (!flashcards.length) {
    return (
      <div className="text-center py-12 text-stone-500 text-sm">
        No flashcards available
      </div>
    );
  }

  const card = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-stone-500">
        <span className="font-medium text-stone-700">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <span className="text-xs hidden sm:inline">← → navigate · Space to flip</span>
      </div>

      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-700 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        type="button"
        className="w-full text-left cursor-pointer group"
        onClick={toggleFlip}
        style={{ perspective: '1000px' }}
        aria-label={isFlipped ? 'Show term' : 'Show definition'}
      >
        <div
          className="relative w-full min-h-[16rem] sm:min-h-[18rem] transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front — term */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl border-2 border-amber-200 bg-white shadow-md flex flex-col"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/80 rounded-t-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Term</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
              <p className="font-serif text-xl sm:text-2xl text-stone-900 text-center leading-snug">
                {card.term}
              </p>
            </div>
            <p className="text-center text-xs text-stone-400 pb-4 group-hover:text-amber-800 transition-colors">
              Tap or press Space to reveal
            </p>
          </div>

          {/* Back — definition */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl border-2 border-stone-200 bg-stone-50 shadow-md flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="px-5 py-3 border-b border-stone-200 bg-stone-100 rounded-t-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Definition</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
              <p className="text-base sm:text-lg text-stone-700 text-center leading-relaxed">
                {card.definition}
              </p>
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous card"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleFlip}
          className="px-6 py-3 bg-amber-800 text-amber-50 rounded-xl font-semibold hover:bg-amber-900 transition-colors min-w-[9rem]"
        >
          {isFlipped ? 'Show term' : 'Show answer'}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === flashcards.length - 1}
          className="p-3 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next card"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FlashcardDeck;
