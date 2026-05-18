import { callEdgeFunction } from './api';
import type { StudyPlannerConfig } from '../types';

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

  triggerStudyPlanner(config: StudyPlannerConfig): Promise<AgentJobResponse> {
    return runAgent({
      agent_type: 'study_planner',
      study_planner_config: {
        course_id: config.courseId,
        lecture_ids: config.lectureIds,
        materials: {
          summary: config.materials.summary,
          cornell_notes: config.materials.cornellNotes,
          flashcards: config.materials.flashcards,
          quiz: config.materials.quiz,
        },
      },
    });
  },

  triggerResearchAgent(lectureId: string): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'research', lecture_id: lectureId });
  },

  triggerPipeline(lectureId: string, pipelineConfig?: { steps: string[] }): Promise<AgentJobResponse> {
    return runAgent({ agent_type: 'pipeline', lecture_id: lectureId, pipeline_config: pipelineConfig });
  },
};
