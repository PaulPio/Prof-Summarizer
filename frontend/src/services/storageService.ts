import { supabase } from "./supabase";
import { SavedLecture, Flashcard, QuizQuestion, Course } from "../types";

const LOCAL_STORAGE_KEY = 'prof_summarizer_lectures_guest';
const LOCAL_COURSES_KEY = 'prof_summarizer_courses_guest';

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
      files: row.files,
      courseId: row.course_id,
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
      files: lectureData.files,
      course_id: lectureData.courseId || null,
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
  },

  getCourses: async (userId: string): Promise<Course[]> => {
    if (userId === 'guest') {
      try {
        const stored = localStorage.getItem(LOCAL_COURSES_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
      syllabusFilePath: row.syllabus_file_path ?? undefined,
      syllabusFileName: row.syllabus_file_name ?? undefined,
      syllabusMime: row.syllabus_mime ?? undefined,
      syllabusUploadedAt: row.syllabus_uploaded_at ?? undefined,
    })) as Course[];
  },

  saveCourse: async (userId: string, name: string, color: string): Promise<Course> => {
    if (userId === 'guest') {
      const course: Course = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        name,
        color,
        createdAt: new Date().toISOString(),
      };
      const stored = localStorage.getItem(LOCAL_COURSES_KEY);
      const courses: Course[] = stored ? JSON.parse(stored) : [];
      courses.push(course);
      localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(courses));
      return course;
    }

    const { data, error } = await supabase
      .from('courses')
      .insert([{ user_id: userId, name, color }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      color: data.color,
      createdAt: data.created_at,
      syllabusFilePath: data.syllabus_file_path ?? undefined,
      syllabusFileName: data.syllabus_file_name ?? undefined,
      syllabusMime: data.syllabus_mime ?? undefined,
      syllabusUploadedAt: data.syllabus_uploaded_at ?? undefined,
    };
  },

  updateCourse: async (
    userId: string,
    courseId: string,
    updates: Partial<Pick<Course, 'name' | 'color'>> & Partial<Record<
      'syllabusFilePath' | 'syllabusFileName' | 'syllabusMime' | 'syllabusUploadedAt',
      string | null | undefined
    >>,
  ): Promise<void> => {
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_COURSES_KEY);
      if (stored) {
        const courses: Course[] = JSON.parse(stored);
        const updated = courses.map(c => c.id === courseId ? { ...c, ...updates } : c);
        localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(updated));
      }
      return;
    }

    const dbPatch: Record<string, unknown> = {};
    if (updates.name !== undefined) dbPatch.name = updates.name;
    if (updates.color !== undefined) dbPatch.color = updates.color;
    if (updates.syllabusFilePath !== undefined) dbPatch.syllabus_file_path = updates.syllabusFilePath;
    if (updates.syllabusFileName !== undefined) dbPatch.syllabus_file_name = updates.syllabusFileName;
    if (updates.syllabusMime !== undefined) dbPatch.syllabus_mime = updates.syllabusMime;
    if (updates.syllabusUploadedAt !== undefined) dbPatch.syllabus_uploaded_at = updates.syllabusUploadedAt;

    const { error } = await supabase.from('courses').update(dbPatch).eq('id', courseId);

    if (error) throw new Error(error.message);
  },

  deleteCourse: async (userId: string, courseId: string): Promise<void> => {
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_COURSES_KEY);
      if (stored) {
        const courses: Course[] = JSON.parse(stored);
        localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(courses.filter(c => c.id !== courseId)));
      }
      return;
    }

    const { data: row } = await supabase
      .from('courses')
      .select('syllabus_file_path')
      .eq('id', courseId)
      .eq('user_id', userId)
      .maybeSingle();

    if (row?.syllabus_file_path) {
      await supabase.storage.from('course-documents').remove([row.syllabus_file_path]).catch(() => {});
    }

    const { error } = await supabase.from('courses').delete().eq('id', courseId).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  uploadCourseSyllabus: async (userId: string, course: Course, file: File): Promise<void> => {
    if (userId === 'guest') throw new Error('Sign in to attach syllabi');
    const bucket = 'course-documents';
    const ext = ((file.name.split('.').pop() || 'pdf').replace(/[^a-zA-Z0-9]/g, '') || 'pdf').slice(0, 12);
    const path = `${userId}/${course.id}/syllabus-${Date.now()}.${ext}`;
    if (course.syllabusFilePath) {
      await supabase.storage.from(bucket).remove([course.syllabusFilePath]).catch(() => {});
    }
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw new Error(upErr.message);

    await StorageService.updateCourse(userId, course.id, {
      syllabusFilePath: path,
      syllabusFileName: file.name,
      syllabusMime: file.type || 'application/octet-stream',
      syllabusUploadedAt: new Date().toISOString(),
    });
  },

  removeCourseSyllabus: async (userId: string, course: Course): Promise<void> => {
    if (userId === 'guest' || !course.syllabusFilePath) return;
    await supabase.storage.from('course-documents').remove([course.syllabusFilePath]).catch(() => {});
    await StorageService.updateCourse(userId, course.id, {
      syllabusFilePath: null,
      syllabusFileName: null,
      syllabusMime: null,
      syllabusUploadedAt: null,
    });
  },

  updateLectureCourse: async (lectureId: string, userId: string, courseId: string | null): Promise<void> => {
    if (userId === 'guest') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const lectures: SavedLecture[] = JSON.parse(stored);
        const updated = lectures.map(l => l.id === lectureId ? { ...l, courseId: courseId ?? undefined } : l);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
      return;
    }

    const { data, error } = await supabase
      .from('lectures')
      .update({ course_id: courseId })
      .eq('id', lectureId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to update lecture — no rows updated');
  },
};