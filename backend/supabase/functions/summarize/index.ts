import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, callGemini } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { transcript, files, confusionMarkers } = await req.json();

        if (!transcript) {
            return new Response(
                JSON.stringify({ error: 'Missing transcript' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        // Build confusion markers instruction
        let confusionInstruction = '';
        if (confusionMarkers && confusionMarkers.length > 0) {
            const timestamps = confusionMarkers.map((s: number) => {
                const mins = Math.floor(s / 60);
                const secs = s % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }).join(', ');
            confusionInstruction = `\n\nIMPORTANT: The student marked the following timestamps as confusing: [${timestamps}]. Please provide extra detailed explanations for the topics discussed at these specific times in the notes section.`;
        }

        const systemInstruction = `You are an expert academic assistant. Analyze the provided lecture transcript and any attached visual context.
    
Output the summary in Cornell Notes format as a JSON object with:
- "cues": Array of keywords, questions, or main ideas (left column content)
- "notes": Array of detailed notes and explanations (right column content)  
- "summary": A comprehensive summary paragraph (bottom section)${confusionInstruction}`;

        // Build content parts
        const parts: any[] = [{ text: `Lecture transcript:\n\n${transcript}` }];

        // Add supplementary files if any
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.base64 && file.mimeType) {
                    parts.push({
                        inlineData: { mimeType: file.mimeType, data: file.base64 }
                    });
                }
            }
        }

        const responseSchema = {
            type: 'object',
            properties: {
                cues: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Keywords, questions, or main topics for the left column'
                },
                notes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Detailed notes and explanations for the right column'
                },
                summary: {
                    type: 'string',
                    description: 'Comprehensive summary paragraph for the bottom section'
                }
            },
            required: ['cues', 'notes', 'summary']
        };

        const result = await callGemini(apiKey, systemInstruction, [{ parts }], responseSchema);
        const cornellNotes = JSON.parse(result);

        // Also generate legacy format for backwards compatibility
        const legacySystemInstruction = `Analyze this lecture and output a JSON object with:
- "overview": High-level summary
- "keyPoints": Array of main concepts
- "vocabulary": Array of {term, definition} objects
- "actionItems": Array of tasks/assignments mentioned`;

        const legacySchema = {
            type: 'object',
            properties: {
                overview: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                vocabulary: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            term: { type: 'string' },
                            definition: { type: 'string' }
                        },
                        required: ['term', 'definition']
                    }
                },
                actionItems: { type: 'array', items: { type: 'string' } }
            },
            required: ['overview', 'keyPoints', 'vocabulary', 'actionItems']
        };

        const legacyResult = await callGemini(apiKey, legacySystemInstruction, [{ parts: [{ text: transcript }] }], legacySchema);
        const summary = JSON.parse(legacyResult);

        return new Response(
            JSON.stringify({ summary, cornellNotes }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Summarization error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
