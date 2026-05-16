import { createClient } from "jsr:@supabase/supabase-js@2";

type StepName = 'summarize' | 'flashcards' | 'quiz' | 'notion_export' | 'auto_organize';

interface StepResult {
  status: 'completed' | 'failed' | 'skipped';
  completedAt?: string;
  error?: string;
  /** Present when status is skipped (idempotency or not implemented) */
  reason?: string;
}

/** Preferred execution order: summarize feeds auto_organize context; keep AI steps before organizer. */
const STEP_ORDER: Record<StepName, number> = {
  summarize: 0,
  flashcards: 1,
  quiz: 2,
  auto_organize: 3,
  notion_export: 4,
};

const KNOWN_STEPS = new Set<StepName>([
  'summarize',
  'flashcards',
  'quiz',
  'notion_export',
  'auto_organize',
]);

function isKnownStep(s: string): s is StepName {
  return KNOWN_STEPS.has(s as StepName);
}

export interface PipelineConfig {
  steps?: StepName[];
  /** Passed to generate-quiz; must be 5, 10, 15, or 20 (same rules as edge function). */
  quizQuestionCount?: number;
}

interface LecturePipelineRow {
  id: string;
  title: string;
  transcript: string | null;
  summary: unknown;
  flashcards: unknown;
  quiz_data: unknown;
  course_id: string | null;
  confusion_markers: number[] | null;
  auto_organizer_suggestions: unknown;
}

const SELECT =
  'id, title, transcript, summary, flashcards, quiz_data, course_id, confusion_markers, auto_organizer_suggestions';

function hasSummary(l: LecturePipelineRow): boolean {
  const s = l.summary as { overview?: string; keyPoints?: unknown[] } | null | undefined;
  if (s == null || typeof s !== 'object') return false;
  if (typeof s.overview === 'string' && s.overview.trim().length > 0) return true;
  return Array.isArray(s.keyPoints) && s.keyPoints.length > 0;
}

function hasFlashcards(l: LecturePipelineRow): boolean {
  return Array.isArray(l.flashcards) && l.flashcards.length > 0;
}

function hasQuizData(l: LecturePipelineRow): boolean {
  const q = l.quiz_data;
  if (q == null) return false;
  return Array.isArray(q) && q.length > 0;
}

function hasAutoOrganizerSuggestions(l: LecturePipelineRow): boolean {
  return l.auto_organizer_suggestions != null;
}

function shouldSkipStep(step: StepName, lecture: LecturePipelineRow): boolean {
  switch (step) {
    case 'summarize':
      return hasSummary(lecture);
    case 'flashcards':
      return hasFlashcards(lecture);
    case 'quiz':
      return hasQuizData(lecture);
    case 'auto_organize':
      return hasAutoOrganizerSuggestions(lecture);
    default:
      return false;
  }
}

function skipReason(step: StepName): string {
  switch (step) {
    case 'summarize':
      return 'already_has_summary';
    case 'flashcards':
      return 'already_has_flashcards';
    case 'quiz':
      return 'already_has_quiz';
    case 'auto_organize':
      return 'already_has_auto_organizer_suggestions';
    default:
      return 'skipped';
  }
}

export async function runPipelineAgent(
  userId: string,
  lectureId: string,
  adminClient: ReturnType<typeof createClient>,
  pipelineConfig: PipelineConfig | undefined,
  callerAccessToken: string,
): Promise<object> {
  const { data: lecture, error } = await adminClient
    .from('lectures')
    .select(SELECT)
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single();

  if (error || !lecture) throw new Error('Lecture not found');

  let current: LecturePipelineRow = lecture as LecturePipelineRow;

  const stepResults: Record<string, StepResult> = {};
  const stepsFailed: string[] = [];

  let rawSteps: unknown[];
  if (pipelineConfig?.steps !== undefined) {
    if (!Array.isArray(pipelineConfig.steps)) {
      throw new Error('pipeline_config.steps must be an array');
    }
    rawSteps = pipelineConfig.steps;
  } else {
    rawSteps = ['auto_organize'];
  }

  const validSteps: StepName[] = [];

  for (let i = 0; i < rawSteps.length; i++) {
    const item = rawSteps[i];
    if (typeof item !== 'string') {
      const key = `__invalid_step_${i}`;
      stepResults[key] = {
        status: 'failed',
        reason: 'invalid_step',
        error: 'Each pipeline step must be a string',
      };
      stepsFailed.push(key);
      continue;
    }
    const token = item.trim();
    if (!token) {
      const key = `__empty_step_${i}`;
      stepResults[key] = {
        status: 'failed',
        reason: 'invalid_step',
        error: 'Each pipeline step must be a non-empty string',
      };
      stepsFailed.push(key);
      continue;
    }
    if (!isKnownStep(token)) {
      stepResults[token] = {
        status: 'failed',
        reason: 'unknown_step',
        error: `Unknown pipeline step: "${token}"`,
      };
      stepsFailed.push(token);
      continue;
    }
    validSteps.push(token);
  }

  const orderedSteps = [...validSteps].sort((a, b) => STEP_ORDER[a] - STEP_ORDER[b]);

  const needsTranscript: StepName[] = ['summarize', 'flashcards', 'quiz'];
  if (orderedSteps.some((s) => needsTranscript.includes(s)) && !String(current.transcript ?? '').trim()) {
    throw new Error('Lecture has no transcript; cannot run pipeline steps that require it.');
  }

  const stepsCompleted: string[] = [];
  const stepsSkipped: string[] = [];

  const quizQuestionCount = normalizeQuizCount(pipelineConfig?.quizQuestionCount);

  async function refetchLecture(): Promise<void> {
    const { data: row } = await adminClient
      .from('lectures')
      .select(SELECT)
      .eq('id', lectureId)
      .eq('user_id', userId)
      .single();
    if (row) current = row as LecturePipelineRow;
  }

  for (const step of orderedSteps) {
    if (step === 'notion_export') {
      stepResults[step] = { status: 'skipped', reason: 'not_implemented', error: 'Notion export is not implemented in the pipeline yet.' };
      stepsSkipped.push(step);
      continue;
    }

    if (shouldSkipStep(step, current)) {
      stepResults[step] = { status: 'skipped', reason: skipReason(step) };
      stepsSkipped.push(step);
      continue;
    }

    try {
      await runStep(step, userId, lectureId, adminClient, current, callerAccessToken, quizQuestionCount);
      stepResults[step] = { status: 'completed', completedAt: new Date().toISOString() };
      stepsCompleted.push(step);

      if (step === 'summarize' || step === 'flashcards' || step === 'quiz' || step === 'auto_organize') {
        await refetchLecture();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stepResults[step] = { status: 'failed', error: message };
      stepsFailed.push(step);
      console.error(`Pipeline step ${step} failed for lecture ${lectureId}:`, message);
    }
  }

  return { stepsCompleted, stepsSkipped, stepsFailed, stepResults };
}

function normalizeQuizCount(raw: number | undefined): number {
  const valid = [5, 10, 15, 20];
  if (raw === undefined) return 5;
  return valid.includes(raw) ? raw : 5;
}

async function runStep(
  step: StepName,
  userId: string,
  lectureId: string,
  adminClient: ReturnType<typeof createClient>,
  lecture: LecturePipelineRow,
  callerAccessToken: string,
  quizQuestionCount: number,
): Promise<void> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (step === 'auto_organize') {
    const { runAutoOrganizer } = await import('./auto-organizer.ts');
    await runAutoOrganizer(userId, lectureId, adminClient);
    return;
  }

  const fnMap: Partial<Record<StepName, string>> = {
    summarize: 'summarize',
    flashcards: 'generate-flashcards',
    quiz: 'generate-quiz',
  };

  const fnName = fnMap[step];
  if (!fnName) {
    return;
  }

  const transcript = String(lecture.transcript ?? '').trim();
  if (!transcript) {
    throw new Error('Missing transcript for this step');
  }

  let body: Record<string, unknown>;
  if (step === 'summarize') {
    body = {
      transcript,
      files: [],
      confusionMarkers: lecture.confusion_markers ?? [],
    };
  } else if (step === 'flashcards') {
    body = { transcript };
  } else {
    body = { transcript, questionCount: quizQuestionCount };
  }

  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${callerAccessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${fnName} returned ${res.status}: ${errText}`);
    }

    const data = await res.json();

    if (fnName === 'summarize') {
      const { summary, cornellNotes } = data as { summary: unknown; cornellNotes: unknown };
      const { error: upErr } = await adminClient
        .from('lectures')
        .update({ summary, cornell_notes: cornellNotes })
        .eq('id', lectureId)
        .eq('user_id', userId);
      if (upErr) throw new Error(upErr.message);
      return;
    }

    if (fnName === 'generate-flashcards') {
      const { flashcards } = data as { flashcards: unknown };
      const { error: upErr } = await adminClient
        .from('lectures')
        .update({ flashcards })
        .eq('id', lectureId)
        .eq('user_id', userId);
      if (upErr) throw new Error(upErr.message);
      return;
    }

    if (fnName === 'generate-quiz') {
      const { questions } = data as { questions: unknown };
      const { error: upErr } = await adminClient
        .from('lectures')
        .update({ quiz_data: questions })
        .eq('id', lectureId)
        .eq('user_id', userId);
      if (upErr) throw new Error(upErr.message);
    }
  } finally {
    clearTimeout(timeout);
  }
}
