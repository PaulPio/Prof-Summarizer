import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript, questionCount = 5 } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate question count
        const validCounts = [5, 10, 15, 20];
        const count = validCounts.includes(questionCount) ? questionCount : 5;

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemInstruction = `You are an expert educator creating a quiz based on a lecture.

Generate exactly ${count} multiple-choice questions that test understanding of the key concepts.

For each question:
- "question": A clear question about the lecture content
- "options": Exactly 4 answer choices (array of strings)
- "correctIndex": The index (0-3) of the correct answer
- "explanation": Brief explanation of why the correct answer is right

Make questions progressively challenging. Include a mix of:
- Factual recall questions
- Conceptual understanding questions  
- Application questions`;

        const responseSchema = {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            question: { type: 'string' },
                            options: {
                                type: 'array',
                                items: { type: 'string' },
                                minItems: 4,
                                maxItems: 4
                            },
                            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
                            explanation: { type: 'string' }
                        },
                        required: ['question', 'options', 'correctIndex', 'explanation']
                    }
                }
            },
            required: ['questions']
        };

        const result = await callGemini(
            apiKey,
            systemInstruction,
            [{ parts: [{ text: `Lecture transcript:\n\n${transcript}` }] }],
            responseSchema
        );

        const { questions } = JSON.parse(result);

        return new Response(
            JSON.stringify({ questions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Quiz generation error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
