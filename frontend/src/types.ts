
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface VocabularyItem {
  term: string;
  definition: string;
}

export interface LectureSummary {
  overview: string;
  keyPoints: string[];
  vocabulary: VocabularyItem[];
  actionItems: string[];
  transcriptOnly?: boolean;
}

// Cornell Notes structure for new summary format
export interface CornellNotes {
  cues: string[];        // Keywords/questions (left column)
  notes: string[];       // Detailed notes (right column)  
  summary: string;       // Bottom summary section
}

// Flashcard type
export interface Flashcard {
  term: string;
  definition: string;
}

// Quiz types
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizConfig {
  questionCount: number; // 5, 10, 15, 20
}

// Chat message type
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  userId: string;
  title: string;
  date: string;
  transcript: string;
  summary: LectureSummary;
  cornellNotes?: CornellNotes;
  flashcards?: Flashcard[];
  quizData?: QuizQuestion[];
  confusionMarkers?: number[];
  files?: { name: string; mimeType: string }[];
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  REVIEWING = 'REVIEWING',
  TRANSCRIBING = 'TRANSCRIBING',
  SUMMARIZING = 'SUMMARIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
