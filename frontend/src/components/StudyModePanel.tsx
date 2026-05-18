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
  isStudyMaterialsLoading?: boolean;
}

type Tab = 'flashcards' | 'quiz' | 'chat';

const StudyModePanel: React.FC<StudyModePanelProps> = ({
  transcript,
  lectureId,
  initialFlashcards,
  initialQuizData,
  onFlashcardsGenerated,
  onQuizGenerated,
  isStudyMaterialsLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('flashcards');
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards || []);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuizData || []);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'flashcards', label: 'Flashcards', icon: '🎴' },
    { id: 'quiz', label: 'Quiz', icon: '📝' },
    { id: 'chat', label: 'Ask Professor', icon: '💬' },
  ];

  const generating = isStudyMaterialsLoading || isLoadingFlashcards || isLoadingQuiz;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 px-6 py-4">
        <h3 className="text-lg font-bold text-amber-50 flex items-center gap-2">
          <span>📚</span> Study mode
        </h3>
        <p className="text-amber-200/90 text-sm mt-1">Flashcards and quiz for this lecture</p>
      </div>

      {isStudyMaterialsLoading && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin shrink-0" />
          Generating flashcards and quiz…
        </div>
      )}

      <div className="flex border-b border-stone-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === 'chat') setIsChatOpen(true);
              else setActiveTab(tab.id);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'text-amber-900 border-b-2 border-amber-800 bg-amber-50/50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="p-6">
        {activeTab === 'flashcards' && (
          <div>
            {flashcards.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎴</span>
                </div>
                <h4 className="text-lg font-bold text-stone-900 mb-2">
                  {isStudyMaterialsLoading ? 'Flashcards on the way' : 'No flashcards yet'}
                </h4>
                <p className="text-stone-600 text-sm mb-6">
                  {isStudyMaterialsLoading
                    ? 'They are being created automatically from your lecture.'
                    : 'Generate flashcards from this lecture’s key concepts.'}
                </p>
                {!isStudyMaterialsLoading && (
                  <button
                    type="button"
                    onClick={() => handleGenerateFlashcards()}
                    disabled={generating}
                    className="px-6 py-3 bg-amber-800 text-amber-50 rounded-xl font-semibold hover:bg-amber-900 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                  >
                    {isLoadingFlashcards ? (
                      <>
                        <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>Generate flashcards</>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => handleGenerateFlashcards()}
                    disabled={generating}
                    className="text-sm text-amber-800 hover:text-amber-900 font-semibold disabled:opacity-50"
                  >
                    {isLoadingFlashcards ? 'Regenerating…' : 'Regenerate flashcards'}
                  </button>
                </div>
                <FlashcardDeck flashcards={flashcards} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div>
            {quizQuestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📝</span>
                </div>
                <h4 className="text-lg font-bold text-stone-900 mb-2">
                  {isStudyMaterialsLoading ? 'Quiz on the way' : 'No quiz yet'}
                </h4>
                <p className="text-stone-600 text-sm mb-6">
                  {isStudyMaterialsLoading
                    ? 'Multiple-choice questions are being generated automatically.'
                    : 'Test your understanding with multiple-choice questions.'}
                </p>

                {!isStudyMaterialsLoading && (
                  <>
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <label className="text-sm text-stone-600">Questions:</label>
                      <div className="flex gap-2">
                        {[5, 10, 15, 20].map(count => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setQuestionCount(count)}
                            className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                              questionCount === count
                                ? 'bg-amber-800 text-amber-50'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateQuiz()}
                      disabled={generating}
                      className="px-6 py-3 bg-amber-800 text-amber-50 rounded-xl font-semibold hover:bg-amber-900 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                    >
                      {isLoadingQuiz ? (
                        <>
                          <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
                          Generating {questionCount} questions…
                        </>
                      ) : (
                        <>Generate quiz ({questionCount})</>
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium ${
                          questionCount === count
                            ? 'bg-amber-800 text-amber-50'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateQuiz()}
                    disabled={generating}
                    className="text-sm text-amber-800 hover:text-amber-900 font-semibold disabled:opacity-50"
                  >
                    {isLoadingQuiz ? 'Regenerating…' : 'Regenerate quiz'}
                  </button>
                </div>
                <Quiz questions={quizQuestions} />
              </div>
            )}
          </div>
        )}
      </div>

      <ChatWindow transcript={transcript} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default StudyModePanel;
