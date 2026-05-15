import { createClient } from "jsr:@supabase/supabase-js@2";

type StepName = 'summarize' | 'flashcards' | 'quiz' | 'notion_export' | 'auto_organize';

interface StepResult {
  status: 'completed' | 'failed' | 'skipped';
  completedAt?: string;
  error?: string;
}

interface PipelineConfig {
  steps: StepName[];
}

export async function runPipelineAgent(
  userId: string,
  lectureId: string,
  adminClient: ReturnType<typeof createClient>,
  pipelineConfig?: PipelineConfig,
): Promise<object> {
  const { data: lecture, error } = await adminClient
    .from('lectures')
    .select('id, title, transcript, summary, flashcards, quiz_data, course_id')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single();

  if (error || !lecture) throw new Error('Lecture not found');

  const steps: StepName[] = pipelineConfig?.steps ?? ['auto_organize'];
  const stepResults: Record<string, StepResult> = {};
  const stepsCompleted: string[] = [];
  const stepsSkipped: string[] = [];

  for (const step of steps) {
    // Idempotency: skip already-completed steps using a consistent key
    const idempotencyKey = `${lectureId}:${step}`;

    const { data: existingJob } = await adminClient
      .from('agent_jobs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingJob) {
      stepResults[step] = { status: 'skipped' };
      stepsSkipped.push(step);
      continue;
    }

    try {
      await runStep(step, userId, lectureId, adminClient);
      stepResults[step] = { status: 'completed', completedAt: new Date().toISOString() };
      stepsCompleted.push(step);
    } catch (err) {
      // Per-step failure isolation: log and continue remaining steps
      const message = err instanceof Error ? err.message : String(err);
      stepResults[step] = { status: 'failed', error: message };
      console.error(`Pipeline step ${step} failed for lecture ${lectureId}:`, message);
    }
  }

  return { stepsCompleted, stepsSkipped, stepResults };
}

async function runStep(
  step: StepName,
  userId: string,
  lectureId: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<void> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Dynamically import and run the auto-organizer step inline
  if (step === 'auto_organize') {
    const { runAutoOrganizer } = await import('./auto-organizer.ts');
    await runAutoOrganizer(userId, lectureId, adminClient);
    return;
  }

  // For edge function steps, call the function via HTTP
  const fnMap: Partial<Record<StepName, string>> = {
    summarize: 'summarize',
    flashcards: 'generate-flashcards',
    quiz: 'generate-quiz',
  };

  const fnName = fnMap[step];
  if (!fnName) {
    // notion_export: not implemented inline — skip gracefully
    return;
  }

  const { data: { session } } = await adminClient.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ lectureId }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${fnName} returned ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
