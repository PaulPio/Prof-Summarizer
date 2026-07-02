import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/gemini.ts';
import { resolveTranscriptionConfigFromHttpRequest, aiConfigErrorResponse, callAI } from '../_shared/ai-provider.ts';

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

        // Resolves the user's transcription provider (separate from main AI config if set):
        // signed-in users from user_settings, guests from body-forwarded fields.
        const aiConfig = await resolveTranscriptionConfigFromHttpRequest(req, body);

        if (aiConfig.provider === 'anthropic') {
            return new Response(
                JSON.stringify({
                    error: 'Anthropic/Claude does not support audio transcription. Please select Gemini or OpenAI as your transcription provider in Settings → AI.',
                    code: 'PROVIDER_UNSUPPORTED',
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let transcript: string;

        if (aiConfig.provider === 'openai') {
            // Use the dedicated Whisper endpoint for OpenAI
            const model = aiConfig.model?.startsWith('whisper') ? aiConfig.model : 'whisper-1';
            const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
            const formData = new FormData();
            formData.append('file', new Blob([audioBytes], { type: mimeType }), `audio.${mimeType.split('/')[1] || 'webm'}`);
            formData.append('model', model);
            const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${aiConfig.apiKey}` },
                body: formData,
            });
            if (!whisperResp.ok) {
                const errText = await whisperResp.text();
                throw new Error(`Whisper API error ${whisperResp.status}: ${errText}`);
            }
            const whisperData = await whisperResp.json() as { text?: string };
            transcript = whisperData.text ?? '';
        } else {
            // Gemini (direct or via OpenRouter) — pass inline audio
            const systemInstruction = `You are a professional academic transcriber. Transcribe the audio exactly as spoken. Use [inaudible] for unclear sections. Preserve technical terms verbatim. Do not translate. Do not include preamble. Output only the transcription text.`;
            const contents = [
                {
                    parts: [
                        { inlineData: { mimeType, data: audio } },
                        { text: 'Please transcribe this lecture audio.' }
                    ]
                }
            ];
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
