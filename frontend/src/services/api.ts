import { ChatMessage, Flashcard, QuizQuestion, LectureSummary, CornellNotes } from '../types';
import { supabase } from './supabase';
import { GuestSettingsService } from './guestSettingsService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export async function callEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    const payload = { ...body };
    if (!session) {
        const guestAi = GuestSettingsService.getAiForwardPayload();
        if (guestAi) Object.assign(payload, guestAi);
    }

    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const raw = await response.text();
        let message = `Failed to call ${functionName}`;
        try {
            const parsed = JSON.parse(raw) as { error?: string; message?: string };
            message = parsed.error || parsed.message || message;
        } catch {
            if (raw) message = raw.slice(0, 300);
        }
        if (response.status === 546) {
            message =
                'The request timed out on the server (limit ~2.5 min). Try a faster model in Settings → AI, or retry with a shorter recording.';
        }
        throw new Error(message);
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
    ): Promise<{ summary: LectureSummary; cornellNotes: CornellNotes; title: string }> => {
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
