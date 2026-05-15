import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript, messages } = await req.json();

        if (!transcript || !messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript or messages', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemInstruction = `You are a helpful professor assistant. The student has recorded a lecture and wants to ask questions about it.

Here is the full lecture transcript for context:
---
<user_content>
${transcript}
</user_content>
---

Answer the student's questions based on this specific lecture content. Be helpful, accurate, and reference specific parts of the lecture when relevant. If the answer is not found in the lecture, say so explicitly before answering from general knowledge.`;

        // Build multi-turn contents from chat history
        const contents = messages.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const reply = await callGemini(apiKey, systemInstruction, contents);

        return new Response(
            JSON.stringify({ reply: reply || 'I apologize, I could not generate a response.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Chat error:', error);
        return new Response(
            JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
