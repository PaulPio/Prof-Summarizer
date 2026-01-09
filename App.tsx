import React, { useState, useRef, useEffect } from 'react';
import { AppState, SavedLecture, LectureFile, User } from './types';
import { transcribeAudio, summarizeTranscript } from './services/geminiService';
import { StorageService, FirestoreError } from './services/storageService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import SummaryDisplay from './components/SummaryDisplay';
import HistorySidebar from './components/HistorySidebar';
import AuthForm from './components/AuthForm';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [lectures, setLectures] = useState<SavedLecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<SavedLecture | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorUrl, setErrorUrl] = useState<string | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<LectureFile[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMimeTypeRef = useRef<string>('audio/wav');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Student',
          picture: firebaseUser.photoURL || undefined
        });
      } else {
        setUser(null);
      }
      setIsInitialLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchLectures = async () => {
    if (user) {
      setIsLoadingLectures(true);
      setErrorMessage('');
      setErrorUrl(undefined);
      try {
        const data = await StorageService.getLectures(user.id);
        setLectures(data);
      } catch (err: any) {
        setErrorMessage(err.message);
        if (err instanceof FirestoreError && err.setupUrl) {
          setErrorUrl(err.setupUrl);
        }
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
    await signOut(auth);
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
    for (const file of Array.from(files)) {
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
          const result = await new Promise<{base64: string, previewUrl?: string}>((resolve) => {
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

  const finalizeLecture = async () => {
    if (!recordedBlob || !user) return;
    if (recordedBlob.size > 14.5 * 1024 * 1024) {
      setErrorMessage(`Lecture too large. Audio data is ${(recordedBlob.size / 1024 / 1024).toFixed(1)}MB.`);
      setStatus(AppState.ERROR);
      return;
    }
    setStatus(AppState.TRANSCRIBING);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const transcript = await transcribeAudio(base64Audio, activeMimeTypeRef.current);
          setStatus(AppState.SUMMARIZING);
          const summary = await summarizeTranscript(transcript, uploadedFiles);
          const newLecture: SavedLecture = {
            id: '', 
            userId: user.id,
            title: `Lecture ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString(), 
            transcript: transcript,
            summary: summary,
            files: uploadedFiles.map(f => ({ name: f.name, mimeType: f.mimeType }))
          };
          const savedId = await StorageService.saveLecture(newLecture);
          const lectureWithId = { ...newLecture, id: savedId };
          setLectures(prev => [lectureWithId, ...prev]);
          setCurrentLecture(lectureWithId);
          setUploadedFiles([]);
          setRecordedBlob(null);
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
      await StorageService.deleteLecture(id);
      setLectures(prev => prev.filter(l => l.id !== id));
      if (currentLecture?.id === id) setCurrentLecture(null);
    } catch (err) {
      alert("Failed to delete lecture from cloud.");
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
        <header className="h-20 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">🎓</div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">ProfSummarizer</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                    <p className="text-xs font-black text-gray-900 leading-tight">{user.name}</p>
                    <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">Logout</button>
                </div>
                {user.picture && <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100" />}
             </div>
            <button onClick={() => { setCurrentLecture(null); setStatus(AppState.IDLE); setUploadedFiles([]); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Capture
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {isLoadingLectures && (
            <div className="flex items-center justify-center h-64 animate-pulse">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {errorMessage && status === AppState.IDLE && (
            <div className="max-w-2xl mx-auto mb-8 bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1 space-y-1">
                <p className="text-amber-800 font-bold text-sm">Action Required: Database Setup</p>
                <p className="text-amber-700 text-xs leading-relaxed">{errorMessage}</p>
              </div>
              {errorUrl ? (
                <a href={errorUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-amber-700 transition-colors whitespace-nowrap">
                  Setup Index Now
                </a>
              ) : (
                <button onClick={fetchLectures} className="px-6 py-2 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-amber-700 transition-colors whitespace-nowrap">
                  Retry
                </button>
              )}
            </div>
          )}

          {status === AppState.IDLE && !currentLecture && !isLoadingLectures && (
            <div className="max-w-2xl mx-auto space-y-12 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-white text-blue-600 rounded-[32px] flex items-center justify-center mx-auto text-4xl shadow-2xl shadow-blue-100 ring-1 ring-gray-50">🎙️</div>
                <div className="space-y-3">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">Extreme Lecture Capture</h2>
                    <p className="text-gray-500 text-xl font-medium">Transcribe and summarize up to 90 minutes of audio. Secured by Firebase Cloud.</p>
                </div>
              </div>
              <div className="flex justify-center">
                <button onClick={startRecording} className="px-16 py-6 bg-blue-600 text-white rounded-3xl text-2xl font-black hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 flex items-center gap-4">
                  <span className="w-4 h-4 bg-white rounded-full animate-pulse"></span>
                  Start Recording
                </button>
              </div>
            </div>
          )}

          {status === AppState.RECORDING && (
            <div className="max-w-2xl mx-auto text-center space-y-12 mt-20">
              <div className="space-y-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-100">
                    <div className="w-8 h-8 bg-red-600 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 border-8 border-red-500 rounded-full animate-ping opacity-20"></div>
                </div>
                <h2 className="text-6xl font-mono font-black text-gray-900 tracking-tighter">{formatTime(recordingTime)}</h2>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-red-600 font-black uppercase tracking-widest text-sm animate-pulse">Recording Active</p>
                    <p className="text-gray-400 text-sm italic">Compressed 16kbps Mono &bull; Sync Enabled</p>
                </div>
              </div>
              <button onClick={stopRecording} className="px-14 py-6 bg-gray-900 text-white rounded-3xl text-xl font-black shadow-2xl">Stop & Review</button>
            </div>
          )}

          {status === AppState.REVIEWING && (
            <div className="max-w-3xl mx-auto space-y-10 mt-4 pb-20">
               <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-gray-900">Review Lecture</h2>
                <p className="text-gray-500 font-medium">Duration: {formatTime(recordingTime)}</p>
              </div>
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[40px] p-12 text-center hover:border-blue-400 group shadow-xl">
                <input type="file" ref={fileInputRef} onChange={onFileChange} multiple accept="image/*,application/pdf" className="hidden" />
                <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className={`p-6 ${isOptimizing ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'} rounded-[32px] mb-6`}>
                    {isOptimizing ? <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                  </div>
                  <h3 className="text-xl font-black text-gray-800">{isOptimizing ? 'Optimizing Media...' : 'Add Supplemental Files'}</h3>
                  <p className="text-gray-400 mt-2">Whiteboard photos, slides, or syllabus PDFs</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="relative aspect-square rounded-3xl border-2 overflow-hidden bg-gray-50 shadow-md">
                        {file.previewUrl ? <img src={file.previewUrl} className="w-full h-full object-cover" /> : <div className="p-4 text-xs font-black truncate">{file.name}</div>}
                        <button onClick={() => removeFile(file.id)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <button onClick={() => setStatus(AppState.IDLE)} className="flex-1 py-5 bg-white text-gray-500 rounded-3xl font-black border-2">Discard</button>
                <button onClick={finalizeLecture} disabled={isOptimizing} className={`flex-[2] py-5 ${isOptimizing ? 'bg-gray-400' : 'bg-blue-600'} text-white rounded-3xl font-black text-xl shadow-2xl`}>Save & Summarize</button>
              </div>
            </div>
          )}

          {(status === AppState.TRANSCRIBING || status === AppState.SUMMARIZING) && (
            <div className="max-w-2xl mx-auto text-center space-y-12 mt-20 animate-pulse">
              <div className="w-24 h-24 border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h2 className="text-4xl font-black text-gray-900">{status === AppState.TRANSCRIBING ? "Transcribing..." : "Summarizing..."}</h2>
              <p className="text-gray-500 text-lg">AI is processing your lecture with multimodal context.</p>
            </div>
          )}

          {status === AppState.ERROR && (
            <div className="max-w-md mx-auto bg-white border p-12 rounded-[40px] text-center space-y-6 mt-20 shadow-2xl border-red-50">
              <div className="text-7xl">⚠️</div>
              <h3 className="text-2xl font-black">Something went wrong</h3>
              <p className="text-red-500 font-medium">{errorMessage}</p>
              <button onClick={() => setStatus(AppState.IDLE)} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all">Back Home</button>
            </div>
          )}

          {status === AppState.COMPLETED && currentLecture && (
            <div className="max-w-4xl mx-auto pb-24">
              <SummaryDisplay summary={currentLecture.summary} title={currentLecture.title} />
              <div className="mt-16 pt-16 border-t border-gray-100">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none p-6 bg-white rounded-[32px] border shadow-sm hover:bg-gray-50 transition-all">
                    <span className="font-black text-gray-800">Review Full Transcript Archive</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-6 p-10 bg-gray-900 text-blue-100 rounded-[40px] shadow-2xl font-mono text-sm leading-relaxed max-h-[600px] overflow-y-auto">
                    {currentLecture.transcript}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        <footer className="h-12 px-8 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-400 border-t bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            <span>Firebase User: {user.email}</span>
          </div>
          <span>Gemini 3 Flash &bull; Academic Model V2.1</span>
        </footer>
      </main>
    </div>
  );
};

export default App;