import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { audio, mimeType } = await req.json();

        if (!audio || !mimeType) {
            return new Response(
                JSON.stringify({ error: 'Missing audio or mimeType' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemInstruction = `You are a professional academic transcriber. Transcribe the audio exactly as spoken. Do not include preamble. Just provide the text.`;

        const contents = [
            {
                parts: [
                    { inlineData: { mimeType, data: audio } },
                    { text: 'Please transcribe this lecture.' }
                ]
            }
        ];

        const transcript = await callGemini(apiKey, systemInstruction, contents);

        return new Response(
            JSON.stringify({ transcript }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Transcription error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
