import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript, questionCount = 5 } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const validCounts = [5, 10, 15, 20];
        const count = validCounts.includes(questionCount) ? questionCount : 5;

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

        const systemInstruction = `You are an expert educator creating a quiz based on a lecture. Generate exactly ${count} multiple-choice questions that test understanding of the key concepts.

For each question:
- "question": A clear question about the lecture content
- "options": Exactly 4 answer choices
- "correctIndex": The index (0-3) of the correct answer — distribute correct answers evenly across all four positions
- "explanation": Brief explanation including a quote or paraphrase from the transcript

Mix factual recall, conceptual understanding, and application questions. Never use "All of the above" or "None of the above" as options.`;

        const responseSchema = {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            question: { type: 'string' },
                            options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
                            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
                            explanation: { type: 'string' },
                        },
                        required: ['question', 'options', 'correctIndex', 'explanation'],
                    },
                },
            },
            required: ['questions'],
        };

        const contents = [{ parts: [{ text: `<user_content>\n${transcript}\n</user_content>` }] }];

        let result: string;
        if (aiConfig.provider === 'gemini') {
            result = await callGemini(aiConfig.apiKey, systemInstruction, contents, responseSchema, 3072);
        } else {
            result = await callAI(aiConfig, systemInstruction, contents, { schema: responseSchema, maxOutputTokens: 3072 });
        }

        const { questions } = JSON.parse(result);

        return new Response(
            JSON.stringify({ questions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Quiz generation error:', error);
        return new Response(
            JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
