import { supabase } from "./supabase";
import { SavedLecture, Flashcard, QuizQuestion, Course, SavedStudyPlan, StudyPlannerConfig, StudyPlan } from "../types";

const LOCAL_STORAGE_KEY = 'prof_summarizer_lectures_guest';
const LOCAL_COURSES_KEY = 'prof_summarizer_courses_guest';
const LOCAL_STUDY_PLANS_KEY = 'prof_summarizer_study_plans_guest';

function mapStudyPlanRow(row: Record<string, unknown>): SavedStudyPlan {
  const config = row.config as Record<string, unknown>;
  const materials = (config.materials ?? {}) as Record<string, boolean>;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    title: String(row.title),
    config: {
      courseId: String(config.course_id ?? config.courseId ?? row.course_id),
      lectureIds: (config.lecture_ids ?? config.lectureIds ?? []) as string[],
      materials: {
        summary: materials.summary !== false,
        cornellNotes: materials.cornell_notes ?? materials.cornellNotes ?? true,
        flashcards: materials.flashcards !== false,
        quiz: materials.quiz !== false,
      },
    },
    plan: row.plan as StudyPlan,
    createdAt: String(row.created_at),
    agentJobId: row.agent_job_id ? String(row.agent_job_id) : undefined,
  };
}

function guestStudyPlans(): SavedStudyPlan[] {
  try {
    const stored = localStorage.getItem(LOCAL_STUDY_PLANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGuestStudyPlans(plans: SavedStudyPlan[]) {
  localStorage.setItem(LOCAL_STUDY_PLANS_KEY, JSON.stringify(plans));
}

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

  getLectureById: async (userId: string, lectureId: string): Promise<SavedLecture | null> => {
    if (userId === 'guest') {
      const lectures = await StorageService.getLectures(userId);
      return lectures.find(l => l.id === lectureId) ?? null;
    }

    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      date: data.date,
      transcript: data.transcript,
      summary: data.summary,
      cornellNotes: data.cornell_notes,
      flashcards: data.flashcards,
      quizData: data.quiz_data,
      confusionMarkers: data.confusion_markers,
      files: data.files,
      courseId: data.course_id,
    } as SavedLecture;
  },

  listStudyPlans: async (userId: string): Promise<SavedStudyPlan[]> => {
    if (userId === 'guest') {
      return guestStudyPlans().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // #region agent log
    fetch('http://127.0.0.1:7360/ingest/14547040-52a9-4edb-891a-185fbb602c58',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7542ea'},body:JSON.stringify({sessionId:'7542ea',location:'storageService.ts:listStudyPlans',message:'listStudyPlans result',data:{hasError:!!error,errorCode:(error as {code?:string})?.code,errorMessage:error?.message,rowCount:data?.length??0},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (error) throw new Error(error.message);
    return (data || []).map((row: Record<string, unknown>) => mapStudyPlanRow(row));
  },

  saveStudyPlanGuest: (
    userId: string,
    courseId: string,
    title: string,
    config: StudyPlannerConfig,
    plan: StudyPlan,
    agentJobId?: string,
  ): SavedStudyPlan => {
    const entry: SavedStudyPlan = {
      id: Math.random().toString(36).slice(2, 11),
      userId,
      courseId,
      title,
      config,
      plan,
      createdAt: new Date().toISOString(),
      agentJobId,
    };
    const plans = guestStudyPlans();
    plans.unshift(entry);
    saveGuestStudyPlans(plans);
    return entry;
  },

  deleteStudyPlan: async (userId: string, planId: string): Promise<void> => {
    if (userId === 'guest') {
      saveGuestStudyPlans(guestStudyPlans().filter(p => p.id !== planId));
      return;
    }

    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },
};