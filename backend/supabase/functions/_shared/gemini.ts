// Supabase Edge Functions configuration
// Deploy with: supabase functions deploy

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const GEMINI_MODEL = 'gemini-2.0-flash';

export async function callGemini(
    apiKey: string,
    systemInstruction: string,
    contents: any,
    responseSchema?: any
): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const body: any = {
        contents: Array.isArray(contents) ? contents : [{ parts: contents }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {},
    };

    if (responseSchema) {
        body.generationConfig.responseMimeType = 'application/json';
        body.generationConfig.responseSchema = responseSchema;
    }

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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
