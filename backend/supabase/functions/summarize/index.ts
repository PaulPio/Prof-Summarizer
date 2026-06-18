import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { resolveAIConfigFromHttpRequest, aiConfigErrorResponse, callAI } from '../_shared/ai-provider.ts';

function sanitizeLectureTitle(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    let t = raw.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
    t = t.replace(/^lecture:\s*/i, '').replace(/^lecture\s+/i, '');
    return t.slice(0, 120);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { transcript, files, confusionMarkers } = body;

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript', code: 'MISSING_FIELD' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const aiConfig = await resolveAIConfigFromHttpRequest(req, body);

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

Generate a comprehensive study guide in a single JSON response with:
1. A short lecture title (5–12 words) that names the main topic — no dates, no "Lecture" prefix, no quotation marks
2. Cornell Notes format (cues/notes/summary)
3. Classic summary format (overview/keyPoints/vocabulary/actionItems)${confusionInstruction}`;

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
                title: { type: 'string' },
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
            required: ['title', 'cornell', 'classic'],
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
        let title = sanitizeLectureTitle(parsed.title);
        if (!title && summary?.overview) {
            title = sanitizeLectureTitle(String(summary.overview).split(/[.!?]/)[0]);
        }

        return new Response(
            JSON.stringify({ summary, cornellNotes, title }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        const configResp = aiConfigErrorResponse(error, corsHeaders);
        if (configResp) return configResp;
        console.error('Summarization error:', error);
        const message = error instanceof Error ? error.message : 'Summarization failed';
        return new Response(
            JSON.stringify({ error: message, code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
