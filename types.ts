
export interface VocabularyItem {
  term: string;
  definition: string;
}

export interface LectureSummary {
  overview: string;
  keyPoints: string[];
  vocabulary: VocabularyItem[];
  actionItems: string[];
}

export interface LectureFile {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
  previewUrl?: string;
}

export interface SavedLecture {
  id: string;
  title: string;
  date: string;
  transcript: string;
  summary: LectureSummary;
  files?: { name: string; mimeType: string }[];
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  SUMMARIZING = 'SUMMARIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
