import { AgentService } from './agentService';
import { API } from './api';
import { StorageService } from './storageService';
import type { UserSettings } from '../types';

const STUDY_STEPS = ['flashcards', 'quiz'] as const;

const KNOWN_PIPELINE_STEPS = new Set([
  'summarize',
  'flashcards',
  'quiz',
  'notion_export',
  'auto_organize',
]);

/** Steps to run after a new lecture is summarized (study materials always first). */
export function buildPostLectureSteps(userSettings: UserSettings | null): string[] {
  const steps: string[] = [...STUDY_STEPS];

  if (userSettings?.agentAutoOrganizer) {
    steps.push('auto_organize');
  }

  if (userSettings?.agentMultiStep && userSettings.agentPipelineConfig?.length) {
    for (const row of userSettings.agentPipelineConfig) {
      if (!row.enabled) continue;
      const action = row.action?.trim();
      if (action && KNOWN_PIPELINE_STEPS.has(action) && !steps.includes(action)) {
        steps.push(action);
      }
    }
  }

  return steps;
}

export async function runGuestStudyMaterials(
  lectureId: string,
  userId: string,
  transcript: string,
): Promise<void> {
  const [flashcards, questions] = await Promise.all([
    API.generateFlashcards(transcript),
    API.generateQuiz(transcript, 5),
  ]);
  await StorageService.updateLectureFlashcards(lectureId, userId, flashcards);
  await StorageService.updateLectureQuiz(lectureId, userId, questions);
}

export function triggerPostLecturePipeline(lectureId: string, userSettings: UserSettings | null) {
  const steps = buildPostLectureSteps(userSettings);
  return AgentService.triggerPipeline(lectureId, { steps });
}
