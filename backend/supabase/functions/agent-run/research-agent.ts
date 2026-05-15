import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

export async function runResearchAgent(userId: string, lectureId: string, adminClient: ReturnType<typeof createClient>): Promise<object> {
  const { data: lecture, error } = await adminClient
    .from('lectures')
    .select('id, title, transcript, confusion_markers')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single();

  if (error || !lecture) throw new Error('Lecture not found');

  const markers: number[] = lecture.confusion_markers || [];
  if (markers.length === 0) {
    return { sources: [] };
  }

  const transcript: string = lecture.transcript || '';
  const words = transcript.split(/\s+/);
  const WORDS_PER_SECOND = 2.5; // average speech rate

  // Extract ±60s context window per marker IN CODE — not via LLM
  const markerContexts = markers.map((timestamp: number, idx: number) => {
    const startWord = Math.max(0, Math.floor((timestamp - 60) * WORDS_PER_SECOND));
    const endWord = Math.min(words.length, Math.floor((timestamp + 60) * WORDS_PER_SECOND));
    const context = words.slice(startWord, endWord).join(' ');
    return { markerId: idx, timestamp, context: context.slice(0, 600) };
  });

  const aiConfig = await resolveAIConfig(userId);

  const systemInstruction = `You are a study assistant. For each confusion marker, explain the topic being discussed and suggest study directions.

CRITICAL RULES:
- Do NOT invent URLs, DOIs, paper titles, video titles, author names, or publication years.
- If you would reference a specific resource, output a search query string instead (e.g., "search: mitosis cell division Khan Academy").
- Each explanation should be 2-3 sentences summarizing the topic from the context window.
- Provide 2-3 search query suggestions per marker for the student to find resources themselves.`;

  const markerList = markerContexts.map(m => `markerId:${m.markerId} (at ${Math.floor(m.timestamp / 60)}:${String(m.timestamp % 60).padStart(2, '0')})\n<user_content>${m.context}</user_content>`).join('\n\n');

  const schema = {
    type: 'object',
    properties: {
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            confusionTimestamp: { type: 'number' },
            explanation: { type: 'string' },
            resources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                },
                required: ['title'],
              },
            },
          },
          required: ['confusionTimestamp', 'explanation', 'resources'],
        },
      },
    },
    required: ['sources'],
  };

  const contents = [{ parts: [{ text: markerList }] }];
  const result = await callAI(aiConfig, systemInstruction, contents, { schema, maxOutputTokens: 2048 });
  const parsed = JSON.parse(result);

  // Strip any live URLs that slipped through despite instructions
  parsed.sources = (parsed.sources || []).map((s: any) => ({
    ...s,
    resources: (s.resources || []).map((r: any) => ({
      ...r,
      title: r.title.replace(/https?:\/\/[^\s]*/g, '[URL removed]'),
    })),
  }));

  return parsed;
}
