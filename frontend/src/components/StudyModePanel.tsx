import React, { useState, useEffect } from 'react';
import { Flashcard, QuizQuestion } from '../types';
import { API } from '../services/api';
import FlashcardDeck from './FlashcardDeck';
import Quiz from './Quiz';
import ChatWindow from './ChatWindow';

interface StudyModePanelProps {
    transcript: string;
    lectureId: string;
    initialFlashcards?: Flashcard[];
    initialQuizData?: QuizQuestion[];
    onFlashcardsGenerated?: (flashcards: Flashcard[]) => void;
    onQuizGenerated?: (questions: QuizQuestion[]) => void;
}

type Tab = 'flashcards' | 'quiz' | 'chat';

const StudyModePanel: React.FC<StudyModePanelProps> = ({
    transcript,
    lectureId,
    initialFlashcards,
    initialQuizData,
    onFlashcardsGenerated,
    onQuizGenerated,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('flashcards');
    const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards || []);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuizData || []);
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
    const [questionCount, setQuestionCount] = useState(5);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when lecture changes
    useEffect(() => {
        setFlashcards(initialFlashcards || []);
        setQuizQuestions(initialQuizData || []);
        setActiveTab('flashcards');
        setError(null);
        setIsChatOpen(false);
    }, [lectureId, initialFlashcards, initialQuizData]);

    const handleGenerateFlashcards = async () => {
        setIsLoadingFlashcards(true);
        setError(null);
        try {
            const cards = await API.generateFlashcards(transcript);
            setFlashcards(cards);
            onFlashcardsGenerated?.(cards);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingFlashcards(false);
        }
    };

    const handleGenerateQuiz = async () => {
        setIsLoadingQuiz(true);
        setError(null);
        try {
            const questions = await API.generateQuiz(transcript, questionCount);
            setQuizQuestions(questions);
            onQuizGenerated?.(questions);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingQuiz(false);
        }
    };

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'flashcards', label: 'Flashcards', icon: '🎴' },
        { id: 'quiz', label: 'Quiz', icon: '📝' },
        { id: 'chat', label: 'Ask Professor', icon: '💬' },
    ];

    return (
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📚</span> Study Mode
                </h3>
                <p className="text-purple-200 text-sm mt-1">Interactive learning tools for this lecture</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'chat') {
                                setIsChatOpen(true);
                            } else {
                                setActiveTab(tab.id);
                            }
                        }}
                        className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === tab.id
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Error display */}
            {error && (
                <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Tab content */}
            <div className="p-6">
                {/* Flashcards Tab */}
                {activeTab === 'flashcards' && (
                    <div>
                        {flashcards.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🎴</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Generate Flashcards</h4>
                                <p className="text-gray-600 text-sm mb-6">
                                    Create study flashcards based on this lecture's key concepts
                                </p>
                                <button
                                    onClick={handleGenerateFlashcards}
                                    disabled={isLoadingFlashcards}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {isLoadingFlashcards ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            Generate Flashcards
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={handleGenerateFlashcards}
                                        disabled={isLoadingFlashcards}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Regenerate
                                    </button>
                                </div>
                                <FlashcardDeck flashcards={flashcards} />
                            </div>
                        )}
                    </div>
                )}

                {/* Quiz Tab */}
                {activeTab === 'quiz' && (
                    <div>
                        {quizQuestions.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📝</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Take a Quiz</h4>
                                <p className="text-gray-600 text-sm mb-6">
                                    Test your understanding with multiple-choice questions
                                </p>

                                {/* Question count selector */}
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    <label className="text-sm text-gray-600">Number of questions:</label>
                                    <div className="flex gap-2">
                                        {[5, 10, 15, 20].map((count) => (
                                            <button
                                                key={count}
                                                onClick={() => setQuestionCount(count)}
                                                className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${questionCount === count
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateQuiz}
                                    disabled={isLoadingQuiz}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {isLoadingQuiz ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Generating {questionCount} questions...
                                        </>
                                    ) : (
                                        <>
                                            <span>🎯</span>
                                            Start Quiz ({questionCount} questions)
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => setQuizQuestions([])}
                                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                    >
                                        New Quiz
                                    </button>
                                </div>
                                <Quiz questions={quizQuestions} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Window (floating) */}
            <ChatWindow
                transcript={transcript}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </div>
    );
};

export default StudyModePanel;
