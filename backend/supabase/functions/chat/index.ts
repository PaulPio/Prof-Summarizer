import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

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

        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '') || '';
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const anonClient = createClient(supabaseUrl, anonKey);
        const { data: { user } } = await anonClient.auth.getUser(token);
        const aiConfig = user ? await resolveAIConfig(user.id) : {
            provider: 'gemini' as const,
            apiKey: Deno.env.get('GEMINI_API_KEY')!,
            model: 'gemini-3.0-flash-preview',
        };

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

        let reply: string;
        if (aiConfig.provider === 'gemini') {
            reply = await callGemini(aiConfig.apiKey, systemInstruction, contents, undefined, 2048);
        } else {
            reply = await callAI(aiConfig, systemInstruction, contents, { maxOutputTokens: 2048 });
        }

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
