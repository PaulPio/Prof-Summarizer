import { callEdgeFunction } from './api';

export interface AgentJobResponse {
  jobId: string;
  status: 'completed' | 'failed';
  result: any;
  createdAt: string;
  completedAt: string;
}

async function runAgent(payload: object): Promise<AgentJobResponse> {
  return callEdgeFunction('agent-run', payload);
}

export const AgentService = {
  triggerAutoOrganizer(lectureId: string): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'auto_organizer', lecture_id: lectureId });
  },

  triggerStudyPlanner(): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'study_planner' });
  },

  triggerResearchAgent(lectureId: string): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'research', lecture_id: lectureId });
  },

  triggerPipeline(lectureId: string, pipelineConfig?: { steps: string[] }): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'pipeline', lecture_id: lectureId, pipeline_config: pipelineConfig });
  },
};
