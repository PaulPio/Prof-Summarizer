import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizProps {
    questions: QuizQuestion[];
    onComplete?: (score: number, total: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));

    if (!questions.length) {
        return (
            <div className="text-center py-12 text-gray-500">
                No quiz questions available
            </div>
        );
    }

    const question = questions[currentIndex];
    const isCorrect = selectedAnswer === question.correctIndex;
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleSelectAnswer = (index: number) => {
        if (showExplanation) return;
        setSelectedAnswer(index);
    };

    const handleSubmit = () => {
        if (selectedAnswer === null) return;

        setShowExplanation(true);
        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedAnswer;
        setAnswers(newAnswers);

        if (selectedAnswer === question.correctIndex) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (isLastQuestion) {
            setCompleted(true);
            onComplete?.(score + (isCorrect ? 1 : 0), questions.length);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setScore(0);
        setCompleted(false);
        setAnswers(new Array(questions.length).fill(null));
    };

    // Completed screen
    if (completed) {
        const finalScore = score;
        const percentage = Math.round((finalScore / questions.length) * 100);

        return (
            <div className="text-center py-8 space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl">
                    <span className="text-3xl font-bold">{percentage}%</span>
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Quiz Complete!</h3>
                    <p className="text-gray-600">
                        You scored {finalScore} out of {questions.length} questions
                    </p>
                </div>

                {/* Performance message */}
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${percentage >= 80 ? 'bg-green-100 text-green-700' :
                        percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                    }`}>
                    {percentage >= 80 ? '🌟 Excellent work!' :
                        percentage >= 60 ? '👍 Good job!' :
                            '📚 Keep studying!'}
                </div>

                <button
                    onClick={handleRestart}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>Score: {score}/{currentIndex}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question */}
            <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                <p className="text-lg font-medium text-gray-900">{question.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
                {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectOption = index === question.correctIndex;

                    let optionClass = 'bg-white border-2 border-gray-200 hover:border-indigo-300';

                    if (showExplanation) {
                        if (isCorrectOption) {
                            optionClass = 'bg-green-50 border-2 border-green-500';
                        } else if (isSelected && !isCorrectOption) {
                            optionClass = 'bg-red-50 border-2 border-red-500';
                        }
                    } else if (isSelected) {
                        optionClass = 'bg-indigo-50 border-2 border-indigo-500';
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelectAnswer(index)}
                            disabled={showExplanation}
                            className={`w-full p-4 rounded-xl text-left transition-all ${optionClass} ${showExplanation ? 'cursor-default' : 'cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${showExplanation && isCorrectOption ? 'bg-green-500 text-white' :
                                        showExplanation && isSelected && !isCorrectOption ? 'bg-red-500 text-white' :
                                            isSelected ? 'bg-indigo-500 text-white' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className="flex-1 text-gray-700">{option}</span>
                                {showExplanation && isCorrectOption && (
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Explanation */}
            {showExplanation && (
                <div className={`p-4 rounded-xl ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{isCorrect ? '✅' : '💡'}</span>
                        <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                            {isCorrect ? 'Correct!' : 'Not quite right'}
                        </span>
                    </div>
                    <p className="text-gray-700 text-sm">{question.explanation}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
                {!showExplanation ? (
                    <button
                        onClick={handleSubmit}
                        disabled={selectedAnswer === null}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Check Answer
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                        {isLastQuestion ? 'See Results' : 'Next Question'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Quiz;
