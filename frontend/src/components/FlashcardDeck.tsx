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

    // Keyboard navigation
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
            <div className="text-center py-12 text-gray-500">
                No flashcards available
            </div>
        );
    }

    const card = flashcards[currentIndex];

    return (
        <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <span className="text-xs">Use ← → keys to navigate, Space to flip</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                />
            </div>

            {/* Flashcard with proper 3D flip */}
            <div
                className="cursor-pointer"
                onClick={toggleFlip}
                style={{ perspective: '1000px' }}
            >
                <div
                    className="relative w-full h-64 sm:h-80 transition-transform duration-500"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    {/* Front - Term */}
                    <div
                        className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center p-6 text-white"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="text-center">
                            <p className="text-xs uppercase tracking-wider text-blue-200 mb-3">Term</p>
                            <p className="text-xl sm:text-2xl font-bold">{card.term}</p>
                        </div>
                    </div>

                    {/* Back - Definition */}
                    <div
                        className="absolute inset-0 w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl flex items-center justify-center p-6 text-white"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="text-center">
                            <p className="text-xs uppercase tracking-wider text-emerald-200 mb-3">Definition</p>
                            <p className="text-base sm:text-lg leading-relaxed">{card.definition}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <button
                    onClick={toggleFlip}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                    {isFlipped ? 'Show Term' : 'Show Answer'}
                </button>

                <button
                    onClick={goNext}
                    disabled={currentIndex === flashcards.length - 1}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default FlashcardDeck;
