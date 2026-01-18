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
                JSON.stringify({ error: 'Missing transcript or messages' }),
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
${transcript}
---

Answer the student's questions based on this specific lecture content. Be helpful, accurate, and reference specific parts of the lecture when relevant. If the student asks about something not covered in the lecture, let them know politely.`;

        // Convert chat messages to Gemini format
        const contents = messages.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const body = {
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I could not generate a response.';

        return new Response(
            JSON.stringify({ reply }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Chat error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
