import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { runAutoOrganizer } from './auto-organizer.ts';
import { runStudyPlanner } from './study-planner.ts';
import { runResearchAgent } from './research-agent.ts';
import { runPipelineAgent } from './pipeline-agent.ts';

const RATE_LIMIT_PER_HOUR = 10;

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  // Verify the caller
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !user) {
    return json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON', code: 'MISSING_FIELD' }, 400);
  }

  const { agent_type, lecture_id, pipeline_config, study_planner_config } = body;

  if (!agent_type) return json({ error: 'agent_type is required', code: 'MISSING_FIELD' }, 400);

  // Agents that require a lecture_id
  const lectureAgents = ['auto_organizer', 'research', 'pipeline'];
  if (lectureAgents.includes(agent_type) && !lecture_id) {
    return json({ error: 'lecture_id is required for this agent', code: 'MISSING_FIELD' }, 400);
  }

  // Verify lecture ownership (defense-in-depth beyond RLS)
  if (lecture_id) {
    const { data: ownership } = await adminClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!ownership) return json({ error: 'Lecture not found', code: 'NOT_FOUND' }, 404);
  }

  // Rate limit: max RATE_LIMIT_PER_HOUR agent calls per user per hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await adminClient
    .from('agent_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, 429);
  }

  // Create the job row
  const { data: job, error: jobErr } = await adminClient
    .from('agent_jobs')
    .insert({
      user_id: user.id,
      lecture_id: lecture_id ?? null,
      agent_type,
      status: 'running',
    })
    .select('id, created_at')
    .single();

  if (jobErr || !job) {
    return json({ error: 'Failed to create job', code: 'INTERNAL_ERROR' }, 500);
  }

  const jobId: string = job.id;
  const createdAt: string = job.created_at;

  try {
    let result: object;

    switch (agent_type) {
      case 'auto_organizer':
        result = await runAutoOrganizer(user.id, lecture_id, adminClient);
        break;
      case 'study_planner':
        result = await runStudyPlanner(user.id, adminClient, study_planner_config);
        break;
      case 'research':
        result = await runResearchAgent(user.id, lecture_id, adminClient);
        break;
      case 'pipeline':
        result = await runPipelineAgent(user.id, lecture_id, adminClient, pipeline_config, token);
        break;
      default:
        await adminClient.from('agent_jobs').update({ status: 'failed', result: { error: 'Unknown agent type' } }).eq('id', jobId);
        return json({ error: `Unknown agent_type: ${agent_type}`, code: 'MISSING_FIELD' }, 400);
    }

    const completedAt = new Date().toISOString();
    await adminClient
      .from('agent_jobs')
      .update({ status: 'completed', result, completed_at: completedAt })
      .eq('id', jobId);

    let savedPlanId: string | undefined;
    if (agent_type === 'study_planner' && study_planner_config?.course_id) {
      const planResult = result as {
        courseName?: string;
        courseId?: string;
        lectureCount?: number;
        planItems?: unknown[];
        knowledgeGaps?: unknown[];
      };
      const courseName = planResult.courseName ?? 'Course';
      const lectureCount = planResult.lectureCount ?? study_planner_config.lecture_ids?.length ?? 0;
      const dateLabel = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const title = `${courseName} · ${lectureCount} lecture${lectureCount !== 1 ? 's' : ''} · ${dateLabel}`;

      const { data: savedPlan, error: saveErr } = await adminClient
        .from('study_plans')
        .insert({
          user_id: user.id,
          course_id: study_planner_config.course_id,
          title,
          config: study_planner_config,
          plan: result,
          agent_job_id: jobId,
        })
        .select('id')
        .single();

      if (saveErr) {
        console.error('Failed to save study plan:', saveErr);
      } else if (savedPlan) {
        savedPlanId = savedPlan.id;
      }
    }

    return json({ jobId, status: 'completed', result, createdAt, completedAt, savedPlanId }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const completedAt = new Date().toISOString();
    await adminClient
      .from('agent_jobs')
      .update({ status: 'failed', result: { error: message }, completed_at: completedAt })
      .eq('id', jobId);

    return json({ error: message, code: 'INTERNAL_ERROR', jobId }, 500);
  }
});

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
