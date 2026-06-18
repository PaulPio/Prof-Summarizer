import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfigFromHttpRequest, aiConfigErrorResponse, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { audio, mimeType } = body;

        if (!audio || !mimeType) {
            return new Response(
                JSON.stringify({ error: 'Missing audio or mimeType', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const aiConfig = await resolveAIConfigFromHttpRequest(req, body);

        const systemInstruction = `You are a professional academic transcriber. Transcribe the audio exactly as spoken. Use [inaudible] for unclear sections. Preserve technical terms verbatim. Do not translate. Do not include preamble. Output only the transcription text.`;

        const contents = [
            {
                parts: [
                    { inlineData: { mimeType, data: audio } },
                    { text: 'Please transcribe this lecture audio.' }
                ]
            }
        ];

        let transcript: string;
        if (aiConfig.provider === 'gemini') {
            transcript = await callGemini(aiConfig.apiKey, systemInstruction, contents, undefined, 8192);
        } else {
            transcript = await callAI(aiConfig, systemInstruction, contents, { maxOutputTokens: 8192 });
        }

        return new Response(
            JSON.stringify({ transcript }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        const configResp = aiConfigErrorResponse(error, corsHeaders);
        if (configResp) return configResp;
        console.error('Transcription error:', error);
        const message = error instanceof Error ? error.message : 'Transcription failed';
        return new Response(
            JSON.stringify({ error: message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
