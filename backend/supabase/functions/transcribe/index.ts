import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { audio, mimeType } = await req.json();

        if (!audio || !mimeType) {
            return new Response(
                JSON.stringify({ error: 'Missing audio or mimeType', code: 'MISSING_FIELD' }),
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
        console.error('Transcription error:', error);
        return new Response(
            JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
