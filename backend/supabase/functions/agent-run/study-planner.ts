import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAIConfig, callAI } from '../_shared/ai-provider.ts';

export interface StudyPlannerRequestConfig {
  course_id: string;
  lecture_ids: string[];
  materials?: {
    summary?: boolean;
    cornell_notes?: boolean;
    flashcards?: boolean;
    quiz?: boolean;
  };
}

function escapeJsonString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

export async function runStudyPlanner(
  userId: string,
  adminClient: ReturnType<typeof createClient>,
  config?: StudyPlannerRequestConfig,
): Promise<object> {
  if (!config?.course_id) {
    throw new Error('course_id is required for study planner');
  }
  if (!Array.isArray(config.lecture_ids) || config.lecture_ids.length === 0) {
    throw new Error('Select at least one lecture for the study plan');
  }

  const materials = {
    summary: config.materials?.summary !== false,
    cornell_notes: config.materials?.cornell_notes !== false,
    flashcards: config.materials?.flashcards !== false,
    quiz: config.materials?.quiz !== false,
  };

  const { data: course } = await adminClient
    .from('courses')
    .select('id, name')
    .eq('id', config.course_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!course) {
    throw new Error('Course not found');
  }

  const { data: lectures, error } = await adminClient
    .from('lectures')
    .select('id, title, date, summary, cornell_notes, quiz_data, flashcards, course_id')
    .eq('user_id', userId)
    .eq('course_id', config.course_id)
    .in('id', config.lecture_ids)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);

  if (!lectures || lectures.length === 0) {
    return { planItems: [], knowledgeGaps: [], courseName: course.name };
  }

  if (lectures.length !== config.lecture_ids.length) {
    throw new Error('One or more lectures are not in this course');
  }

  const aiConfig = await resolveAIConfig(userId);

  const lectureList = lectures.map((l: Record<string, unknown>) => {
    const parts: string[] = [
      `"id":"${l.id}"`,
      `"title":"${escapeJsonString(String(l.title ?? ''))}"`,
      `"date":"${String(l.date ?? '').slice(0, 10)}"`,
    ];

    if (materials.summary) {
      const overview = (l.summary as { overview?: string } | null)?.overview?.slice(0, 280) ?? '';
      const keyPoints = (l.summary as { keyPoints?: string[] } | null)?.keyPoints?.slice(0, 5) ?? [];
      parts.push(`"overview":"${escapeJsonString(overview)}"`);
      if (keyPoints.length) {
        parts.push(`"keyPoints":[${keyPoints.map((p) => `"${escapeJsonString(p)}"`).join(',')}]`);
      }
    }

    if (materials.cornell_notes) {
      const cn = l.cornell_notes as { summary?: string; cues?: string[] } | null;
      const cnSummary = cn?.summary?.slice(0, 200) ?? '';
      const cueCount = cn?.cues?.length ?? 0;
      parts.push(`"hasCornellNotes":${Boolean(cn)}`);
      if (cnSummary) parts.push(`"cornellSummary":"${escapeJsonString(cnSummary)}"`);
      parts.push(`"cornellCueCount":${cueCount}`);
    }

    if (materials.flashcards) {
      const fc = Array.isArray(l.flashcards) ? l.flashcards : [];
      parts.push(`"flashcardCount":${fc.length}`);
      parts.push(`"hasFlashcards":${fc.length > 0}`);
    }

    if (materials.quiz) {
      const q = Array.isArray(l.quiz_data) ? l.quiz_data : [];
      parts.push(`"quizQuestionCount":${q.length}`);
      parts.push(`"hasQuiz":${q.length > 0}`);
    }

    return `{${parts.join(',')}}`;
  }).join('\n');

  const materialHints: string[] = [];
  if (materials.summary) materialHints.push('lecture summaries and key points');
  if (materials.cornell_notes) materialHints.push('Cornell notes');
  if (materials.flashcards) materialHints.push('flashcard availability');
  if (materials.quiz) materialHints.push('quiz availability');

  const systemInstruction = `You are a study planner for a single university course folder.

Course: "${escapeJsonString(course.name)}"

The student selected specific lectures and asked you to plan using: ${materialHints.join(', ')}.

Rules:
- studyGuide: Write 3–5 short paragraphs as a readable study guide for the whole selection. Explain how to study this material, what order to review lectures in, and which enabled materials (summaries, Cornell notes, flashcards, quizzes) to use. Reference real concepts from the provided lecture data — do not invent topics.
- Only reference lectureIds from the provided list. Never invent IDs.
- All lectures belong to the same course — do not mix other courses.
- Prioritize lectures with weak review signals (no quiz taken, no flashcards used) and older material.
- For each plan item, suggest concrete study actions using the materials the student enabled (e.g. "Review Cornell cues", "Run flashcards", "Take the quiz").
- materialsToReview: 2–5 short strings per plan item naming specific material to open (e.g. summary bullets, Cornell cue themes, flashcard count, quiz).
- Cap planItems at 20.
- knowledgeGaps are course-wide topics (not lecture IDs) the student should revisit.
- dueDate: ISO date string within the next 7 days.`;

  const schema = {
    type: 'object',
    properties: {
      studyGuide: { type: 'string' },
      planItems: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            lectureId: { type: 'string' },
            lectureTitle: { type: 'string' },
            reason: { type: 'string' },
            suggestedActivities: {
              type: 'array',
              items: { type: 'string' },
            },
            materialsToReview: {
              type: 'array',
              items: { type: 'string' },
            },
            dueDate: { type: 'string' },
          },
          required: ['lectureId', 'lectureTitle', 'reason'],
        },
      },
      knowledgeGaps: { type: 'array', items: { type: 'string' } },
    },
    required: ['studyGuide', 'planItems', 'knowledgeGaps'],
  };

  const contents = [{
    parts: [{
      text: `<user_content>\nLectures in this course folder:\n${lectureList}\n</user_content>`,
    }],
  }];

  const aiStarted = Date.now();
  console.log('[study_planner] AI call start', { provider: aiConfig.provider, model: aiConfig.model, lectureCount: lectures.length });
  const result = await callAI(aiConfig, systemInstruction, contents, { schema, maxOutputTokens: 2048 });
  console.log('[study_planner] AI call done', { ms: Date.now() - aiStarted, resultChars: result.length });
  const parsed = JSON.parse(result) as {
    studyGuide?: string;
    planItems?: Array<Record<string, unknown>>;
    knowledgeGaps?: string[];
  };

  const validIds = new Set(lectures.map((l: { id: string }) => l.id));
  parsed.planItems = (parsed.planItems || []).filter((item) => validIds.has(String(item.lectureId)));

  return {
    ...parsed,
    courseId: config.course_id,
    courseName: course.name,
    lectureCount: lectures.length,
  };
}
