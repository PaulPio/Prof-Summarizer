import React, { useState, useRef, useEffect } from 'react';
import { AppState, SavedLecture, LectureFile, User, CornellNotes, Flashcard, QuizQuestion } from './types';
import { API } from './services/api';
import { StorageService } from './services/storageService';
import { supabase } from './services/supabase';
import SummaryDisplay from './components/SummaryDisplay';
import CornellNotesDisplay from './components/CornellNotesDisplay';
import HistorySidebar from './components/HistorySidebar';
import AuthForm from './components/AuthForm';
import ConfusionButton from './components/ConfusionButton';
import StudyModePanel from './components/StudyModePanel';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [lectures, setLectures] = useState<SavedLecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<SavedLecture | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<LectureFile[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Study Mode: Confusion markers
  const [confusionMarkers, setConfusionMarkers] = useState<number[]>([]);

  // Study Mode: View toggle
  const [showCornellNotes, setShowCornellNotes] = useState(true);

  // Chat window state
  const [isChatOpen, setIsChatOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const activeMimeTypeRef = useRef<string>('audio/wav');

  useEffect(() => {
    // Handle OAuth callback - process tokens from URL hash
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (!error && data.session) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    handleOAuthCallback();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'Student',
          picture: session.user.user_metadata.avatar_url || undefined
        });
      }
      setIsInitialLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'Student',
          picture: session.user.user_metadata.avatar_url || undefined
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLectures = async () => {
    if (user) {
      setIsLoadingLectures(true);
      setErrorMessage('');
      try {
        const data = await StorageService.getLectures(user.id);
        setLectures(data);
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsLoadingLectures(false);
      }
    } else {
      setLectures([]);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, [user]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = async () => {
    if (user?.id !== 'guest') {
      await supabase.auth.signOut();
    }
    setUser(null);
    setStatus(AppState.IDLE);
    setCurrentLecture(null);
  };

  const optimizeImage = (file: File): Promise<{ base64: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, previewUrl: dataUrl });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsOptimizing(true);
    const newFiles: LectureFile[] = [];
    for (const file of Array.from(files) as File[]) {
      try {
        if (file.type.startsWith('image/')) {
          const optimized = await optimizeImage(file);
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            mimeType: 'image/jpeg',
            base64: optimized.base64,
            previewUrl: optimized.previewUrl
          });
        } else {
          const result = await new Promise<{ base64: string, previewUrl?: string }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                base64: (reader.result as string).split(',')[1],
                previewUrl: undefined
              });
            };
            reader.readAsDataURL(file);
          });
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            mimeType: file.type,
            base64: result.base64,
            previewUrl: result.previewUrl
          });
        }
      } catch (err) {
        console.error("Error optimizing file:", file.name, err);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsOptimizing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    const extension = activeMimeTypeRef.current.includes('webm') ? 'webm' :
      activeMimeTypeRef.current.includes('mp4') ? 'm4a' :
        activeMimeTypeRef.current.includes('ogg') ? 'ogg' : 'wav';
    a.download = `lecture_${new Date().toISOString().slice(0, 10)}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('Please upload an audio file (MP3, WAV, WebM, M4A, OGG)');
      setStatus(AppState.ERROR);
      return;
    }

    activeMimeTypeRef.current = file.type;
    setRecordedBlob(file);
    setRecordingTime(0);
    setStatus(AppState.REVIEWING);

    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/wav'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      activeMimeTypeRef.current = selectedMimeType;
      const options = { mimeType: selectedMimeType, audioBitsPerSecond: 16000 };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Reset confusion markers for new recording
      setConfusionMarkers([]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: activeMimeTypeRef.current });
        setRecordedBlob(audioBlob);
        setStatus(AppState.REVIEWING);
      };
      mediaRecorder.start();
      setStatus(AppState.RECORDING);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      setErrorMessage("Microphone access denied or browser incompatible.");
      setStatus(AppState.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Mark current timestamp as confusing
  const handleConfusionMark = () => {
    setConfusionMarkers(prev => [...prev, recordingTime]);
  };

  const finalizeLecture = async () => {
    if (!recordedBlob || !user) return;

    if (recordedBlob.size > 50 * 1024 * 1024) {
      console.warn(`Large audio file: ${(recordedBlob.size / 1024 / 1024).toFixed(1)}MB - processing may take longer`);
    }

    setStatus(AppState.TRANSCRIBING);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          // Use new API service
          const transcript = await API.transcribe(base64Audio, activeMimeTypeRef.current);
          setStatus(AppState.SUMMARIZING);

          // Get both summary formats with confusion markers
          const filesForApi = uploadedFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType }));
          const { summary, cornellNotes } = await API.summarize(transcript, filesForApi, confusionMarkers);

          const newLecture: SavedLecture = {
            id: '',
            userId: user.id,
            title: `Lecture ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            date: new Date().toISOString(),
            transcript: transcript,
            summary: summary,
            cornellNotes: cornellNotes,
            confusionMarkers: confusionMarkers,
            files: uploadedFiles.map(f => ({ name: f.name, mimeType: f.mimeType }))
          };

          const savedId = await StorageService.saveLecture(newLecture);
          const lectureWithId = { ...newLecture, id: savedId };
          setLectures(prev => [lectureWithId, ...prev]);
          setCurrentLecture(lectureWithId);
          setUploadedFiles([]);
          setRecordedBlob(null);
          setConfusionMarkers([]);
          setStatus(AppState.COMPLETED);
        } catch (err: any) {
          setErrorMessage(err.message || "An error occurred during AI processing.");
          setStatus(AppState.ERROR);
        }
      };
    } catch (err) {
      setErrorMessage("Failed to read audio file.");
      setStatus(AppState.ERROR);
    }
  };

  const deleteLecture = async (id: string) => {
    if (!user) return;
    try {
      await StorageService.deleteLecture(id, user.id);
      setLectures(prev => prev.filter(l => l.id !== id));
      if (currentLecture?.id === id) setCurrentLecture(null);
    } catch (err) {
      alert("Failed to delete lecture.");
    }
  };

  // Handle flashcards generation callback
  const handleFlashcardsGenerated = async (flashcards: Flashcard[]) => {
    if (currentLecture && user) {
      const updated = { ...currentLecture, flashcards };
      setCurrentLecture(updated);
      try {
        await StorageService.updateLectureFlashcards(currentLecture.id, user.id, flashcards);
      } catch (err) {
        console.error("Failed to save flashcards:", err);
      }
    }
  };

  // Handle quiz generation callback
  const handleQuizGenerated = async (quizData: QuizQuestion[]) => {
    if (currentLecture && user) {
      const updated = { ...currentLecture, quizData };
      setCurrentLecture(updated);
      try {
        await StorageService.updateLectureQuiz(currentLecture.id, user.id, quizData);
      } catch (err) {
        console.error("Failed to save quiz data:", err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <AuthForm onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <HistorySidebar
          lectures={lectures}
          onSelect={(l) => { setCurrentLecture(l); setStatus(AppState.COMPLETED); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
          onDelete={deleteLecture}
          currentId={currentLecture?.id}
        />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => {
                setCurrentLecture(null);
                setStatus(AppState.IDLE);
                setConfusionMarkers([]);
                setIsChatOpen(false);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold">🎓</div>
              <h1 className="text-base md:text-xl font-black text-gray-900 tracking-tight hidden sm:block">ProfSummarizer</h1>
            </button>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 leading-tight">{user.name}</p>
                <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">Logout</button>
              </div>
              {user.picture ? (
                <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="md:hidden p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
            <button onClick={() => { setCurrentLecture(null); setStatus(AppState.IDLE); setUploadedFiles([]); }} className="px-3 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">New Capture</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12">
          {isLoadingLectures && (
            <div className="flex items-center justify-center h-64 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {errorMessage && status === AppState.IDLE && (
            <div className="max-w-2xl mx-auto mb-8 bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1 space-y-1">
                <p className="text-amber-800 font-bold text-sm">Action Required: Data Sync</p>
                <p className="text-amber-700 text-xs leading-relaxed">{errorMessage}</p>
              </div>
              <button onClick={fetchLectures} className="px-6 py-2 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-amber-700 transition-colors whitespace-nowrap">
                Retry
              </button>
            </div>
          )}

          {status === AppState.IDLE && !currentLecture && !isLoadingLectures && (
            <div className="max-w-2xl mx-auto space-y-8 sm:space-y-12 mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="text-center space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white text-blue-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto text-2xl sm:text-4xl shadow-2xl shadow-blue-100 ring-1 ring-gray-50">🎙️</div>
                <div className="space-y-2 sm:space-y-3 px-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">Extreme Lecture Capture</h2>
                  <p className="text-gray-500 text-base sm:text-lg md:text-xl font-medium">Transcribe and summarize your lectures with AI.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
                <button onClick={startRecording} className="flex-1 sm:flex-none px-8 sm:px-12 py-4 sm:py-6 bg-blue-600 text-white rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-black hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3">
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                  Start Recording
                </button>
                <input type="file" ref={audioInputRef} onChange={onAudioUpload} accept="audio/*" className="hidden" />
                <button onClick={() => audioInputRef.current?.click()} className="flex-1 sm:flex-none px-8 sm:px-12 py-4 sm:py-6 bg-white text-gray-700 border-2 border-gray-200 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload Audio
                </button>
              </div>
              <p className="text-center text-gray-400 text-xs sm:text-sm">Supports MP3, WAV, WebM, M4A, OGG • No file size limit</p>
            </div>
          )}

          {status === AppState.RECORDING && (
            <div className="max-w-2xl mx-auto text-center space-y-8 sm:space-y-12 mt-12 sm:mt-20 px-4">
              <div className="space-y-4 sm:space-y-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-100">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 border-8 border-red-500 rounded-full animate-ping opacity-20"></div>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-mono font-black text-gray-900 tracking-tighter">{formatTime(recordingTime)}</h2>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-red-600 font-black uppercase tracking-widest text-xs sm:text-sm animate-pulse">Recording Active</p>
                  <p className="text-gray-400 text-xs sm:text-sm italic">
                    {confusionMarkers.length > 0 && `${confusionMarkers.length} confusion marker${confusionMarkers.length > 1 ? 's' : ''} • `}
                    Compressed 16kbps Mono
                  </p>
                </div>
              </div>
              <button onClick={stopRecording} className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-6 bg-gray-900 text-white rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-black shadow-2xl">Stop & Review</button>

              {/* Confusion Button */}
              <ConfusionButton
                onMark={handleConfusionMark}
                markerCount={confusionMarkers.length}
                isRecording={true}
              />
            </div>
          )}

          {status === AppState.REVIEWING && (
            <div className="max-w-3xl mx-auto space-y-6 sm:space-y-10 mt-4 pb-20 px-2 sm:px-0">
              <div className="text-center space-y-2 sm:space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Review Lecture</h2>
                <p className="text-gray-500 font-medium text-sm sm:text-base">
                  Duration: {formatTime(recordingTime)}
                  {confusionMarkers.length > 0 && ` • ${confusionMarkers.length} confusion marker${confusionMarkers.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[24px] sm:rounded-[40px] p-6 sm:p-12 text-center hover:border-blue-400 group shadow-xl">
                <input type="file" ref={fileInputRef} onChange={onFileChange} multiple accept="image/*,application/pdf" className="hidden" />
                <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className={`p-4 sm:p-6 ${isOptimizing ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'} rounded-[24px] sm:rounded-[32px] mb-4 sm:mb-6`}>
                    {isOptimizing ? <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-gray-800">{isOptimizing ? 'Optimizing Media...' : 'Add Supplemental Files'}</h3>
                  <p className="text-gray-400 mt-2 text-sm sm:text-base">Whiteboard photos, slides, or syllabus PDFs</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 sm:mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="relative aspect-square rounded-2xl sm:rounded-3xl border-2 overflow-hidden bg-gray-50 shadow-md">
                        {file.previewUrl ? <img src={file.previewUrl} className="w-full h-full object-cover" /> : <div className="p-3 sm:p-4 text-xs font-black truncate">{file.name}</div>}
                        <button onClick={() => removeFile(file.id)} className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-600 text-white rounded-full p-1.5 sm:p-2"><svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <button onClick={() => setStatus(AppState.IDLE)} className="flex-1 py-4 sm:py-5 bg-white text-gray-500 rounded-2xl sm:rounded-3xl font-black border-2 text-sm sm:text-base">Discard</button>
                <button onClick={downloadRecording} className="flex-1 py-4 sm:py-5 bg-gray-100 text-gray-700 rounded-2xl sm:rounded-3xl font-black border-2 border-gray-200 text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
                <button onClick={finalizeLecture} disabled={isOptimizing} className={`flex-[2] py-4 sm:py-5 ${isOptimizing ? 'bg-gray-400' : 'bg-blue-600'} text-white rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl shadow-2xl`}>Save & Summarize</button>
              </div>
            </div>
          )}

          {(status === AppState.TRANSCRIBING || status === AppState.SUMMARIZING) && (
            <div className="max-w-2xl mx-auto text-center space-y-8 sm:space-y-12 mt-12 sm:mt-20 animate-pulse px-4">
              <div className="w-16 h-16 sm:w-24 sm:h-24 border-[8px] sm:border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">{status === AppState.TRANSCRIBING ? "Transcribing..." : "Summarizing..."}</h2>
              <p className="text-gray-500 text-base sm:text-lg">AI is processing your lecture with multimodal context.</p>
            </div>
          )}

          {status === AppState.ERROR && (
            <div className="max-w-md mx-auto bg-white border p-8 sm:p-12 rounded-[24px] sm:rounded-[40px] text-center space-y-4 sm:space-y-6 mt-12 sm:mt-20 shadow-2xl border-red-50 mx-4 sm:mx-auto">
              <div className="text-5xl sm:text-7xl">⚠️</div>
              <h3 className="text-xl sm:text-2xl font-black">Something went wrong</h3>
              <p className="text-red-500 font-medium text-sm sm:text-base">{errorMessage}</p>
              <button onClick={() => setStatus(AppState.IDLE)} className="w-full py-4 sm:py-5 bg-gray-900 text-white rounded-xl sm:rounded-2xl font-black hover:bg-black transition-all text-sm sm:text-base">Back Home</button>
            </div>
          )}

          {status === AppState.COMPLETED && currentLecture && (
            <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-0 space-y-8">
              {/* Notes View Toggle */}
              {currentLecture.cornellNotes && (
                <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-full p-1 w-fit mx-auto">
                  <button
                    onClick={() => setShowCornellNotes(true)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${showCornellNotes ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    📋 Cornell Notes
                  </button>
                  <button
                    onClick={() => setShowCornellNotes(false)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!showCornellNotes ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    📝 Classic Summary
                  </button>
                </div>
              )}

              {/* Display Cornell Notes or Classic Summary */}
              {showCornellNotes && currentLecture.cornellNotes ? (
                <CornellNotesDisplay notes={currentLecture.cornellNotes} title={currentLecture.title} />
              ) : (
                <SummaryDisplay summary={currentLecture.summary} title={currentLecture.title} />
              )}

              {/* Study Mode Panel */}
              <StudyModePanel
                transcript={currentLecture.transcript}
                lectureId={currentLecture.id}
                initialFlashcards={currentLecture.flashcards}
                initialQuizData={currentLecture.quizData}
                onFlashcardsGenerated={handleFlashcardsGenerated}
                onQuizGenerated={handleQuizGenerated}
              />

              {/* Transcript Section */}
              <div className="mt-10 sm:mt-16 pt-10 sm:pt-16 border-t border-gray-100">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none p-4 sm:p-6 bg-white rounded-[20px] sm:rounded-[32px] border shadow-sm hover:bg-gray-50 transition-all">
                    <span className="font-black text-gray-800 text-sm sm:text-base">Review Full Transcript Archive</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-4 sm:mt-6 p-4 sm:p-10 bg-gray-900 text-blue-100 rounded-[20px] sm:rounded-[40px] shadow-2xl font-mono text-xs sm:text-sm leading-relaxed max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                    {currentLecture.transcript}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        <footer className="min-h-[48px] px-4 sm:px-8 py-2 sm:py-0 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-0 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 border-t bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${user.id === 'guest' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
            <span className="truncate max-w-[200px] sm:max-w-none">{user.id === 'guest' ? 'Guest Mode' : user.email}</span>
          </div>
          <span className="hidden sm:inline">Gemini 2.0 Flash • Study Mode V1.0</span>
          <span className="sm:hidden">Gemini 2.0 Flash</span>
        </footer>

        {/* Floating Ask Professor Chat Button */}
        {currentLecture && status === AppState.COMPLETED && (
          <>
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center group"
              title="Ask Professor"
            >
              <span className="text-2xl">💬</span>
              <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                  Ask Professor
                  <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                </div>
              </div>
            </button>
            <ChatWindow
              transcript={currentLecture.transcript}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;