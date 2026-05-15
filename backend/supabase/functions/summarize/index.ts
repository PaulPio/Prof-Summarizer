import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript, files, confusionMarkers } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Resolve AI config — user key or app fallback
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

        // Build confusion markers instruction
        let confusionInstruction = '';
        if (confusionMarkers && confusionMarkers.length > 0) {
            const timestamps = confusionMarkers.map((s: number) => {
                const mins = Math.floor(s / 60);
                const secs = s % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }).join(', ');
            confusionInstruction = `\n\nIMPORTANT: The student marked the following timestamps as confusing: [${timestamps}]. Provide extra detailed notes for topics at these times.`;
        }

        const systemInstruction = `You are an expert academic assistant. Analyze the provided lecture transcript and any attached visual context.

Generate a comprehensive study guide in a single JSON response with two formats:
1. Cornell Notes format (cues/notes/summary)
2. Classic summary format (overview/keyPoints/vocabulary/actionItems)${confusionInstruction}`;

        // Build content parts — wrap transcript in user_content to prevent injection
        const parts: any[] = [{ text: `<user_content>\n${transcript}\n</user_content>` }];
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.base64 && file.mimeType) {
                    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
                }
            }
        }

        // Single combined schema — saves ~40-50% cost vs two separate calls
        const responseSchema = {
            type: 'object',
            properties: {
                cornell: {
                    type: 'object',
                    properties: {
                        cues: { type: 'array', items: { type: 'string' } },
                        notes: { type: 'array', items: { type: 'string' } },
                        summary: { type: 'string' },
                    },
                    required: ['cues', 'notes', 'summary'],
                },
                classic: {
                    type: 'object',
                    properties: {
                        overview: { type: 'string' },
                        keyPoints: { type: 'array', items: { type: 'string' } },
                        vocabulary: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: { term: { type: 'string' }, definition: { type: 'string' } },
                                required: ['term', 'definition'],
                            },
                        },
                        actionItems: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['overview', 'keyPoints', 'vocabulary', 'actionItems'],
                },
            },
            required: ['cornell', 'classic'],
        };

        const contents = [{ parts }];

        let result: string;
        if (aiConfig.provider === 'gemini') {
            result = await callGemini(aiConfig.apiKey, systemInstruction, contents, responseSchema, 4096);
        } else {
            result = await callAI(aiConfig, systemInstruction, contents, { schema: responseSchema, maxOutputTokens: 4096 });
        }

        const parsed = JSON.parse(result);
        const cornellNotes = parsed.cornell;
        const summary = parsed.classic;

        return new Response(
            JSON.stringify({ summary, cornellNotes }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Summarization error:', error);
        return new Response(
            JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
