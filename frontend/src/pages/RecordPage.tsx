import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, LectureFile, SavedLecture } from '../types';
import { API } from '../services/api';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';
import ConfusionButton from '../components/ConfusionButton';

const RecordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setLectures, courses } = useAppContext();

  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<LectureFile[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [confusionMarkers, setConfusionMarkers] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const activeMimeTypeRef = useRef<string>('audio/wav');

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve({ base64: dataUrl.split(',')[1], previewUrl: dataUrl });
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
          newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, mimeType: 'image/jpeg', base64: optimized.base64, previewUrl: optimized.previewUrl });
        } else {
          const result = await new Promise<{ base64: string; previewUrl?: string }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], previewUrl: undefined });
            reader.readAsDataURL(file);
          });
          newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, mimeType: file.type, base64: result.base64, previewUrl: result.previewUrl });
        }
      } catch (err) {
        console.error('Error optimizing file:', file.name, err);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsOptimizing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    const extension = activeMimeTypeRef.current.includes('webm') ? 'webm' : activeMimeTypeRef.current.includes('mp4') ? 'm4a' : activeMimeTypeRef.current.includes('ogg') ? 'ogg' : 'wav';
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/wav'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) { selectedMimeType = type; break; }
      }
      activeMimeTypeRef.current = selectedMimeType;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType, audioBitsPerSecond: 16000 });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setConfusionMarkers([]);
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        setRecordedBlob(new Blob(audioChunksRef.current, { type: activeMimeTypeRef.current }));
        setStatus(AppState.REVIEWING);
      };
      mediaRecorder.start();
      setStatus(AppState.RECORDING);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      setErrorMessage('Microphone access denied or browser incompatible.');
      setStatus(AppState.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const handleConfusionMark = () => setConfusionMarkers(prev => [...prev, recordingTime]);

  const finalizeLecture = async () => {
    if (!recordedBlob || !user) return;

    setStatus(AppState.TRANSCRIBING);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const transcript = await API.transcribe(base64Audio, activeMimeTypeRef.current);
          setStatus(AppState.SUMMARIZING);

          const filesForApi = uploadedFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType }));
          const { summary, cornellNotes } = await API.summarize(transcript, filesForApi, confusionMarkers);

          const newLecture: SavedLecture = {
            id: '',
            userId: user.id,
            title: `Lecture ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            date: new Date().toISOString(),
            transcript,
            summary,
            cornellNotes,
            confusionMarkers,
            files: uploadedFiles.map(f => ({ name: f.name, mimeType: f.mimeType })),
            courseId: selectedCourseId || undefined,
          };

          const savedId = await StorageService.saveLecture(newLecture);
          const lectureWithId = { ...newLecture, id: savedId };
          setLectures(prev => [lectureWithId, ...prev]);
          setUploadedFiles([]);
          setRecordedBlob(null);
          setConfusionMarkers([]);
          navigate(`/lecture/${savedId}`);
        } catch (err: any) {
          setErrorMessage(err.message || 'An error occurred during AI processing.');
          setStatus(AppState.ERROR);
        }
      };
    } catch {
      setErrorMessage('Failed to read audio file.');
      setStatus(AppState.ERROR);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12">
      {status === AppState.IDLE && (
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
          <ConfusionButton onMark={handleConfusionMark} markerCount={confusionMarkers.length} isRecording={true} />
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
            {courses.length > 0 && (
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="mt-2 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">No course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">{status === AppState.TRANSCRIBING ? 'Transcribing...' : 'Summarizing...'}</h2>
          <p className="text-gray-500 text-base sm:text-lg">AI is processing your lecture with multimodal context.</p>
        </div>
      )}

      {status === AppState.ERROR && (
        <div className="max-w-md mx-auto bg-white border p-8 sm:p-12 rounded-[24px] sm:rounded-[40px] text-center space-y-4 sm:space-y-6 mt-12 sm:mt-20 shadow-2xl border-red-50">
          <div className="text-5xl sm:text-7xl">⚠️</div>
          <h3 className="text-xl sm:text-2xl font-black">Something went wrong</h3>
          <p className="text-red-500 font-medium text-sm sm:text-base">{errorMessage}</p>
          <button onClick={() => setStatus(AppState.IDLE)} className="w-full py-4 sm:py-5 bg-gray-900 text-white rounded-xl sm:rounded-2xl font-black hover:bg-black transition-all text-sm sm:text-base">Back Home</button>
        </div>
      )}
    </div>
  );
};

export default RecordPage;
