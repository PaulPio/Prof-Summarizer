
import React, { useState, useRef, useEffect } from 'react';
import { AppState, LectureSummary, SavedLecture, LectureFile } from './types';
import { transcribeAudio, summarizeTranscript } from './services/geminiService';
import SummaryDisplay from './components/SummaryDisplay';
import HistorySidebar from './components/HistorySidebar';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [lectures, setLectures] = useState<SavedLecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<SavedLecture | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<LectureFile[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lectures');
    if (saved) setLectures(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('lectures', JSON.stringify(lectures));
  }, [lectures]);

  const handleKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setShowKeyPicker(false);
      setStatus(AppState.IDLE);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fix: Explicitly type 'file' as File to resolve 'unknown' type errors reported on lines 49, 53, 54, 59
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const previewUrl = file.type.startsWith('image/') ? reader.result as string : undefined;
        
        setUploadedFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          base64,
          previewUrl
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const startRecording = async () => {
    try {
      // Guideline check: Verify if API key selection is needed
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setShowKeyPicker(true);
          setErrorMessage("Please select a paid API key to proceed.");
          setStatus(AppState.ERROR);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioProcessing(audioBlob);
      };

      mediaRecorder.start();
      setStatus(AppState.RECORDING);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      setErrorMessage("Microphone access denied.");
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

  const handleAudioProcessing = async (blob: Blob) => {
    setStatus(AppState.TRANSCRIBING);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          const transcript = await transcribeAudio(base64Audio, 'audio/wav');
          setStatus(AppState.SUMMARIZING);
          
          // Pass supplementary files to the summarizer
          const summary = await summarizeTranscript(transcript, uploadedFiles);

          const newLecture: SavedLecture = {
            id: Date.now().toString(),
            title: `Lecture ${new Date().toLocaleDateString()}`,
            date: new Date().toLocaleString(),
            transcript: transcript,
            summary: summary,
            files: uploadedFiles.map(f => ({ name: f.name, mimeType: f.mimeType }))
          };

          setLectures(prev => [newLecture, ...prev]);
          setCurrentLecture(newLecture);
          setUploadedFiles([]); // Clear uploads for next time
          setStatus(AppState.COMPLETED);
        } catch (err: any) {
          const msg = err.message || "";
          // Guideline check: Check for specific "Requested entity was not found" error
          if (msg.includes("Requested entity was not found") || msg.includes("404")) {
            setErrorMessage("API Key configuration error: Requested entity was not found.");
            setShowKeyPicker(true);
          } else {
            setErrorMessage(msg || "Failed to process lecture.");
          }
          setStatus(AppState.ERROR);
        }
      };
    } catch (err) {
      setErrorMessage("System error during processing.");
      setStatus(AppState.ERROR);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const deleteLecture = (id: string) => {
    setLectures(prev => prev.filter(l => l.id !== id));
    if (currentLecture?.id === id) setCurrentLecture(null);
  };

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
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ProfSummarizer</h1>
          </div>
          <button onClick={() => { setCurrentLecture(null); setStatus(AppState.IDLE); setUploadedFiles([]); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Lecture
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {status === AppState.IDLE && !currentLecture && (
            <div className="max-w-2xl mx-auto space-y-8 mt-10">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner">🎤</div>
                <h2 className="text-3xl font-extrabold text-gray-900">Prepare Your Lecture</h2>
                <p className="text-gray-500 text-lg">Add slides or photos for visual context, then start recording.</p>
              </div>

              {/* File Upload Section */}
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors group">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileChange} 
                  multiple 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                />
                <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="p-4 bg-blue-50 text-blue-500 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <p className="font-semibold text-gray-700">Add Slides, PDFs, or Whiteboard Photos</p>
                  <p className="text-xs text-gray-400 mt-1">Improves technical term accuracy and context</p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="relative group/item aspect-square rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center">
                        {file.previewUrl ? (
                          <img src={file.previewUrl} className="w-full h-full object-cover" alt="preview" />
                        ) : (
                          <div className="text-red-500">
                             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                             <p className="text-[10px] mt-1 truncate px-1">{file.name}</p>
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={startRecording}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xl font-bold hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                >
                  Start Recording
                </button>
              </div>
            </div>
          )}

          {status === AppState.RECORDING && (
            <div className="max-w-2xl mx-auto text-center space-y-8 mt-20">
              <div className="space-y-4">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <div className="w-6 h-6 bg-red-600 rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-25"></div>
                </div>
                <h2 className="text-4xl font-mono font-bold text-gray-900">{formatTime(recordingTime)}</h2>
                <p className="text-red-500 font-medium animate-pulse">Recording Lecture & Analyzing {uploadedFiles.length} Visuals...</p>
              </div>
              <button onClick={stopRecording} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95">
                Stop & Process
              </button>
            </div>
          )}

          {(status === AppState.TRANSCRIBING || status === AppState.SUMMARIZING) && (
            <div className="max-w-2xl mx-auto text-center space-y-8 mt-20">
              <div className="space-y-4">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {status === AppState.TRANSCRIBING ? "Transcribing Audio..." : "Correlating Visuals & Audio..."}
                </h2>
                <p className="text-gray-500">Integrating your uploaded materials for a smarter summary.</p>
              </div>
            </div>
          )}

          {status === AppState.ERROR && (
            <div className="max-w-md mx-auto bg-red-50 border border-red-200 p-8 rounded-2xl text-center space-y-4 mt-20">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-xl font-bold text-red-900">Operation failed</h3>
              <p className="text-red-700 text-sm">{errorMessage}</p>
              {showKeyPicker ? (
                <div className="space-y-4">
                  <button onClick={handleKeySelection} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Select API Key</button>
                  <p className="text-xs text-gray-500">
                    A paid GCP project API key is required. 
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Learn more about billing</a>
                  </p>
                </div>
              ) : (
                <button onClick={() => setStatus(AppState.IDLE)} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Try Again</button>
              )}
            </div>
          )}

          {status === AppState.COMPLETED && currentLecture && (
            <div className="max-w-4xl mx-auto pb-20">
              <SummaryDisplay summary={currentLecture.summary} title={currentLecture.title} />
              
              <div className="mt-12 pt-12 border-t">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                    <span className="font-semibold text-gray-700">View Full Transcript</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-4 p-6 bg-white border rounded-xl shadow-inner text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-96 overflow-y-auto">
                    {currentLecture.transcript}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        <footer className="h-10 px-6 flex items-center justify-center text-[10px] text-gray-400 border-t bg-gray-50 select-none">
          Powered by Gemini 3 Multimodal Intelligence &bull; Standard Academic Assistant
        </footer>
      </main>
    </div>
  );
};

export default App;
