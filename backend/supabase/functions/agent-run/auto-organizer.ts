import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

export async function runAutoOrganizer(userId: string, lectureId: string, adminClient: ReturnType<typeof createClient>): Promise<object> {
  // Fetch lecture to organize
  const { data: lecture, error: lectureErr } = await adminClient
    .from('lectures')
    .select('id, title, summary, transcript')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single();

  if (lectureErr || !lecture) throw new Error('Lecture not found');

  // Fetch user courses
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, name')
    .eq('user_id', userId);

  if (!courses || courses.length === 0) {
    return { suggestedCourseId: null, confidence: 0, alternativeCourseIds: [], topicTags: [] };
  }

  const aiConfig = await resolveAIConfig(userId);

  // Use overview + first 5 keyPoints for context — not full transcript
  const overview = lecture.summary?.overview || '';
  const keyPoints = (lecture.summary?.keyPoints || []).slice(0, 5).join('\n- ');
  const courseList = courses.map((c: any) => `{"id":"${c.id}","name":"${c.name}"}`).join('\n');

  const systemInstruction = `You are a lecture organizer. Given a lecture's content and a list of available courses, suggest which course this lecture belongs to.

Rules:
- Only assign to courses from the provided list. Do not invent course IDs.
- If no course is a good fit, return suggestedCourseId as null.
- Always include confidence (0.0 to 1.0) and alternativeCourseIds.
- Provide topicTags (2-5 short tags) describing the lecture content.`;

  const userContent = `Lecture: "${lecture.title}"
Overview: ${overview}
Key points:
- ${keyPoints}

Available courses:
${courseList}`;

  const schema = {
    type: 'object',
    properties: {
      suggestedCourseId: { type: 'string' },
      confidence: { type: 'number' },
      alternativeCourseIds: { type: 'array', items: { type: 'string' } },
      topicTags: { type: 'array', items: { type: 'string' } },
    },
    required: ['suggestedCourseId', 'confidence', 'alternativeCourseIds', 'topicTags'],
  };

  const contents = [{ parts: [{ text: `<user_content>\n${userContent}\n</user_content>` }] }];
  const result = await callAI(aiConfig, systemInstruction, contents, { schema, maxOutputTokens: 512 });
  const parsed = JSON.parse(result);

  // Validate returned courseId is in the input list
  const validIds = new Set(courses.map((c: any) => c.id));
  if (parsed.suggestedCourseId && !validIds.has(parsed.suggestedCourseId)) {
    parsed.suggestedCourseId = null;
    parsed.confidence = 0;
  }
  parsed.alternativeCourseIds = (parsed.alternativeCourseIds || []).filter((id: string) => validIds.has(id));

  // Store suggestion on lecture
  await adminClient
    .from('lectures')
    .update({ auto_organizer_suggestions: parsed })
    .eq('id', lectureId);

  return parsed;
}
