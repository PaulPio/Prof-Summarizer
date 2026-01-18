import { supabase } from "./supabase";
import { SavedLecture, Flashcard, QuizQuestion } from "../types";

const LOCAL_STORAGE_KEY = 'prof_summarizer_lectures_guest';

export const StorageService = {
  getLectures: async (userId: string): Promise<SavedLecture[]> => {
    // GUEST MODE: Use LocalStorage
    if (userId === 'guest') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Local Storage Error:", e);
        return [];
      }
    }

    // AUTH MODE: Use Supabase
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      throw new Error(error.message);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      date: row.date,
      transcript: row.transcript,
      summary: row.summary,
      cornellNotes: row.cornell_notes,
      flashcards: row.flashcards,
      quizData: row.quiz_data,
      confusionMarkers: row.confusion_markers,
      files: row.files
    })) as SavedLecture[];
  },

  saveLecture: async (lecture: SavedLecture): Promise<string> => {
    // GUEST MODE: Use LocalStorage
    if (lecture.userId === 'guest') {
      const id = Math.random().toString(36).substr(2, 9);
      const newLecture = { ...lecture, id };

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const lectures: SavedLecture[] = stored ? JSON.parse(stored) : [];

      lectures.unshift(newLecture);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lectures));
      return id;
    }

    // AUTH MODE: Use Supabase
    const { id, ...lectureData } = lecture;

    const dbPayload = {
      user_id: lectureData.userId,
      title: lectureData.title,
      date: lectureData.date,
      transcript: lectureData.transcript,
      summary: lectureData.summary,
      cornell_notes: lectureData.cornellNotes,
      flashcards: lectureData.flashcards || [],
      quiz_data: lectureData.quizData || null,
      confusion_markers: lectureData.confusionMarkers || [],
      files: lectureData.files
    };

    const { data, error } = await supabase
      .from('lectures')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error("Supabase Save Error:", error);
      throw new Error(error.message);
    }

    return data.id;
  },

  updateLectureFlashcards: async (lectureId: string, userId: string, flashcards: Flashcard[]): Promise<void> => {
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const lectures: SavedLecture[] = JSON.parse(stored);
        const updated = lectures.map(l => l.id === lectureId ? { ...l, flashcards } : l);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
      return;
    }

    const { error } = await supabase
      .from('lectures')
      .update({ flashcards })
      .eq('id', lectureId);

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }
  },

  updateLectureQuiz: async (lectureId: string, userId: string, quizData: QuizQuestion[]): Promise<void> => {
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const lectures: SavedLecture[] = JSON.parse(stored);
        const updated = lectures.map(l => l.id === lectureId ? { ...l, quizData } : l);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
      return;
    }

    const { error } = await supabase
      .from('lectures')
      .update({ quiz_data: quizData })
      .eq('id', lectureId);

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }
  },

  deleteLecture: async (id: string, userId: string) => {
    // GUEST MODE: Use LocalStorage
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const lectures: SavedLecture[] = JSON.parse(stored);
        const filtered = lectures.filter(l => l.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
      return;
    }

    // AUTH MODE: Use Supabase
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase Delete Error:", error);
      throw new Error(error.message);
    }
  }
};