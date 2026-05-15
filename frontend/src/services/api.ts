import { ChatMessage, Flashcard, QuizQuestion, LectureSummary, CornellNotes } from '../types';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function callEdgeFunction<T>(functionName: string, body: any): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
    transcribe: async (audio: string, mimeType: string): Promise<string> => {
        const result = await callEdgeFunction<{ transcript: string }>('transcribe', { audio, mimeType });
        return result.transcript;
    },

    summarize: async (
        transcript: string,
        files: { base64: string; mimeType: string }[],
        confusionMarkers: number[]
    ): Promise<{ summary: LectureSummary; cornellNotes: CornellNotes }> => {
        return callEdgeFunction('summarize', { transcript, files, confusionMarkers });
    },

    generateFlashcards: async (transcript: string): Promise<Flashcard[]> => {
        const result = await callEdgeFunction<{ flashcards: Flashcard[] }>('generate-flashcards', { transcript });
        return result.flashcards;
    },

    generateQuiz: async (transcript: string, questionCount: number = 5): Promise<QuizQuestion[]> => {
        const result = await callEdgeFunction<{ questions: QuizQuestion[] }>('generate-quiz', { transcript, questionCount });
        return result.questions;
    },

    chat: async (transcript: string, messages: ChatMessage[]): Promise<string> => {
        const result = await callEdgeFunction<{ reply: string }>('chat', { transcript, messages });
        return result.reply;
    },
};
