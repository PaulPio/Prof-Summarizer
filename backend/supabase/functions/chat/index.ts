import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/gemini.ts';
import { resolveAIConfigFromHttpRequest, aiConfigErrorResponse, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { transcript, messages } = body;

        if (!transcript || !messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript or messages', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const aiConfig = await resolveAIConfigFromHttpRequest(req, body);

        const systemInstruction = `You are a helpful professor assistant. The student has recorded a lecture and wants to ask questions about it.

Here is the full lecture transcript for context:
---
<user_content>
${transcript}
</user_content>
---

Answer the student's questions based on this specific lecture content. Be helpful, accurate, and reference specific parts of the lecture when relevant. If the answer is not found in the lecture, say so explicitly before answering from general knowledge.`;

        const contents = messages.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const reply = await callAI(aiConfig, systemInstruction, contents, { maxOutputTokens: 2048 });

        return new Response(
            JSON.stringify({ reply: reply || 'I apologize, I could not generate a response.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        const configResp = aiConfigErrorResponse(error, corsHeaders);
        if (configResp) return configResp;
        console.error('Chat error:', error);
        const message = error instanceof Error ? error.message : 'Chat failed';
        return new Response(
            JSON.stringify({ error: message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
