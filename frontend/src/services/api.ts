import { ChatMessage, Flashcard, QuizQuestion, LectureSummary, CornellNotes } from '../types';

const SUPABASE_URL = 'https://sqlwvjbiququbvnqzvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbHd2amJpcXVxdWJ2bnF6dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTcxODUsImV4cCI6MjA4MzU3MzE4NX0.Bk66zpHYPjWbqxAKQnT6eUVHzVWAyJ7zPhLKipW4thE';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function callEdgeFunction<T>(functionName: string, body: any): Promise<T> {
    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to call ${functionName}`);
    }

    return response.json();
}


export const API = {
    /**
     * Transcribe audio to text
     */
    transcribe: async (audio: string, mimeType: string): Promise<string> => {
        const result = await callEdgeFunction<{ transcript: string }>('transcribe', { audio, mimeType });
        return result.transcript;
    },

    /**
     * Summarize lecture with Cornell Notes format
     */
    summarize: async (
        transcript: string,
        files: { base64: string; mimeType: string }[],
        confusionMarkers: number[]
    ): Promise<{ summary: LectureSummary; cornellNotes: CornellNotes }> => {
        return callEdgeFunction('summarize', { transcript, files, confusionMarkers });
    },

    /**
     * Generate flashcards from transcript
     */
    generateFlashcards: async (transcript: string): Promise<Flashcard[]> => {
        const result = await callEdgeFunction<{ flashcards: Flashcard[] }>('generate-flashcards', { transcript });
        return result.flashcards;
    },

    /**
     * Generate quiz questions (configurable count: 5, 10, 15, 20)
     */
    generateQuiz: async (transcript: string, questionCount: number = 5): Promise<QuizQuestion[]> => {
        const result = await callEdgeFunction<{ questions: QuizQuestion[] }>('generate-quiz', { transcript, questionCount });
        return result.questions;
    },

    /**
     * Chat with professor about the lecture
     */
    chat: async (transcript: string, messages: ChatMessage[]): Promise<string> => {
        const result = await callEdgeFunction<{ reply: string }>('chat', { transcript, messages });
        return result.reply;
    },
};
