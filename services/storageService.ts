import { supabase } from "./supabase";
import { SavedLecture } from "../types";

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
      
      lectures.unshift(newLecture); // Add to top
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