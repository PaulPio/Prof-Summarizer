import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfigFromHttpRequest, aiConfigErrorResponse, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { transcript, questionCount = 5 } = body;

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const validCounts = [5, 10, 15, 20];
        const count = validCounts.includes(questionCount) ? questionCount : 5;

        const aiConfig = await resolveAIConfigFromHttpRequest(req, body);

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
        const configResp = aiConfigErrorResponse(error, corsHeaders);
        if (configResp) return configResp;
        console.error('Quiz generation error:', error);
        const message = error instanceof Error ? error.message : 'Quiz generation failed';
        return new Response(
            JSON.stringify({ error: message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
