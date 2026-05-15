import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '') || '';
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const anonClient = createClient(supabaseUrl, anonKey);
        const { data: { user } } = await anonClient.auth.getUser(token);
        const aiConfig = user ? await resolveAIConfig(user.id) : {
            provider: 'gemini' as const,
            apiKey: Deno.env.get('GEMINI_API_KEY')!,
            model: 'gemini-2.0-flash',
        };

        // Strip filler words to reduce input tokens ~5-15%
        const cleanedTranscript = transcript.replace(/\b(um+|uh+|er+|ah+|like,?\s+I\s+mean)\b/gi, '').replace(/\s+/g, ' ').trim();

        const systemInstruction = `You are an expert educator. Generate exactly 10 to 15 flashcards from this lecture for studying. Each flashcard must have a "term" (concept/question front) and "definition" (explanation/answer back). Cover the most important concepts. Make flashcards useful for exam preparation.`;

        const responseSchema = {
            type: 'object',
            properties: {
                flashcards: {
                    type: 'array',
                    minItems: 10,
                    maxItems: 15,
                    items: {
                        type: 'object',
                        properties: {
                            term: { type: 'string' },
                            definition: { type: 'string' },
                        },
                        required: ['term', 'definition'],
                    },
                },
            },
            required: ['flashcards'],
        };

        const contents = [{ parts: [{ text: `<user_content>\n${cleanedTranscript}\n</user_content>` }] }];

        let result: string;
        if (aiConfig.provider === 'gemini') {
            result = await callGemini(aiConfig.apiKey, systemInstruction, contents, responseSchema, 2048);
        } else {
            result = await callAI(aiConfig, systemInstruction, contents, { schema: responseSchema, maxOutputTokens: 2048 });
        }

        const { flashcards } = JSON.parse(result);

        return new Response(
            JSON.stringify({ flashcards }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Flashcard generation error:', error);
        return new Response(
            JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
