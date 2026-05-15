import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

export async function runStudyPlanner(userId: string, adminClient: ReturnType<typeof createClient>): Promise<object> {
  // Fetch up to 50 most recent lectures (overview + keyPoints only — not full transcripts)
  const { data: lectures } = await adminClient
    .from('lectures')
    .select('id, title, date, summary, quiz_data, flashcards, course_id')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50);

  if (!lectures || lectures.length === 0) {
    return { planItems: [], knowledgeGaps: [] };
  }

  const aiConfig = await resolveAIConfig(userId);

  // Build compact lecture summaries (~100 tokens each)
  const lectureList = lectures.map((l: any) => {
    const overview = l.summary?.overview ? l.summary.overview.slice(0, 200) : '';
    const hasQuiz = (l.quiz_data || []).length > 0;
    const hasFlashcards = (l.flashcards || []).length > 0;
    return `{"id":"${l.id}","title":"${l.title}","date":"${l.date?.slice(0, 10)}","overview":"${overview}","hasQuiz":${hasQuiz},"hasFlashcards":${hasFlashcards}}`;
  }).join('\n');

  const systemInstruction = `You are a study planner. Given a student's lecture history, generate a prioritized study plan.

Rules:
- Only reference lectureIds from the provided list. Do not invent IDs.
- Prioritize lectures the student hasn't reviewed (no quiz, no flashcards) and older lectures.
- Cap planItems at 30.
- knowledgeGaps should be topics (not lecture references) the student should review based on context.
- Provide a dueDate suggestion (ISO date format, within 7 days from today) for each item.`;

  const schema = {
    type: 'object',
    properties: {
      planItems: {
        type: 'array',
        maxItems: 30,
        items: {
          type: 'object',
          properties: {
            lectureId: { type: 'string' },
            lectureTitle: { type: 'string' },
            reason: { type: 'string' },
            dueDate: { type: 'string' },
          },
          required: ['lectureId', 'lectureTitle', 'reason'],
        },
      },
      knowledgeGaps: { type: 'array', items: { type: 'string' } },
    },
    required: ['planItems', 'knowledgeGaps'],
  };

  const contents = [{ parts: [{ text: `<user_content>\nLectures:\n${lectureList}\n</user_content>` }] }];
  const result = await callAI(aiConfig, systemInstruction, contents, { schema, maxOutputTokens: 4096 });
  const parsed = JSON.parse(result);

  // Validate returned lectureIds
  const validIds = new Set(lectures.map((l: any) => l.id));
  parsed.planItems = (parsed.planItems || []).filter((item: any) => validIds.has(item.lectureId));

  return parsed;
}
