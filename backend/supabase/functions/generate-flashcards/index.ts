import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemInstruction = `You are an expert educator. Based on the lecture transcript, generate flashcards for studying.
    
Create 10-15 flashcards covering the most important concepts, terms, and ideas from the lecture.
Each flashcard should have:
- "term": The concept, term, or question (front of card)
- "definition": The explanation, answer, or definition (back of card)

Make the flashcards comprehensive and useful for exam preparation.`;

        const responseSchema = {
            type: 'object',
            properties: {
                flashcards: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            term: { type: 'string', description: 'The term or question' },
                            definition: { type: 'string', description: 'The definition or answer' }
                        },
                        required: ['term', 'definition']
                    }
                }
            },
            required: ['flashcards']
        };

        const result = await callGemini(
            apiKey,
            systemInstruction,
            [{ parts: [{ text: `Lecture transcript:\n\n${transcript}` }] }],
            responseSchema
        );

        const { flashcards } = JSON.parse(result);

        return new Response(
            JSON.stringify({ flashcards }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Flashcard generation error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
