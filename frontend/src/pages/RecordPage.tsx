import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppState, LectureFile, SavedLecture } from '../types';
import { API } from '../services/api';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';
import TopBar from '../components/TopBar';
import AgentJobStatusBar from '../components/AgentJobStatusBar';
import { displayCourseColor } from '../constants/courseColors';
import {
  runGuestStudyMaterials,
  triggerPostLecturePipeline,
} from '../services/postLecturePipeline';
import { hasConfiguredAi } from '../utils/aiSettings';

/* ─── helpers ─── */

const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ─── Icons ─── */

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
    <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7.5 2.5l-4 3.5 4 3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 1.5v7M3.5 5.5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 10.5h10" strokeLinecap="round" />
  </svg>
);

const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="1" width="4" height="7" rx="2" />
    <path d="M2 7a5 5 0 0010 0" strokeLinecap="round" />
    <path d="M7 12v1.5" strokeLinecap="round" />
  </svg>
);

const BookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2.5C2 1.7 2.7 1 3.5 1H12v11H3.5C2.7 12 2 11.3 2 10.5V2.5z" />
    <path d="M2 10.5C2 9.7 2.7 9 3.5 9H12" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 1l1.5 4.5L13 7l-4.5 1.5L7 13l-1.5-4.5L1 7l4.5-1.5L7 1z" strokeLinejoin="round" />
  </svg>
);

const FlagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 1v12M3 1h8l-2 4 2 4H3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <rect x="2" y="2" width="8" height="8" rx="1.5" />
  </svg>
);

const QuestionIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="13" cy="13" r="10" />
    <path d="M10 10a3 3 0 015.5 1c0 2-3 2.5-3 5" strokeLinecap="round" />
    <circle cx="13" cy="19.5" r="0.5" fill="currentColor" />
  </svg>
);

/* ─── Dashboard sub-components ─── */

const Stat: React.FC<{ label: string; value: string | number; sub: string; accent?: string; progress?: number }> = ({ label, value, sub, accent = 'var(--text)', progress }) => (
  <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: accent, fontFamily: 'var(--font-mono)' }}>{value}</span>
    <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</span>
    {progress != null && (
      <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: '100%', background: accent }} />
      </div>
    )}
  </div>
);

const QuizPill: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 0.8 ? 'var(--good)' : score >= 0.6 ? 'var(--confuse)' : 'var(--bad)';
  const bg = score >= 0.8 ? 'var(--good-soft)' : score >= 0.6 ? 'var(--confuse-soft)' : 'var(--bad-soft)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      background: bg, color, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
    }}>
      {Math.round(score * 100)}%
    </span>
  );
};

/* ─── Waveform (64-bar streaming) ─── */

const useWaveform = (active: boolean) => {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 64 }, () => Math.random() * 0.3 + 0.1));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setBars(prev => [...prev.slice(1), Math.random() * 0.9 + 0.1]);
    }, 90);
    return () => clearInterval(id);
  }, [active]);
  return bars;
};

const Waveform: React.FC<{ bars: number[] }> = ({ bars }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 80 }}>
    {bars.map((l, i) => (
      <span key={i} style={{
        display: 'inline-block',
        width: 3,
        height: `${Math.max(6, l * 80)}px`,
        background: i === bars.length - 1 ? 'var(--rec-deep)' : 'var(--text-soft)',
        borderRadius: 2,
        opacity: 0.35 + l * 0.65,
        transition: 'height 90ms linear',
      }} />
    ))}
  </div>
);

/* ─── Pipeline Stage / Connector ─── */

const Stage: React.FC<{ label: string; terminal?: boolean }> = ({ label, terminal }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
    borderRadius: 999,
    background: terminal ? 'var(--text)' : 'var(--bg-sunken)',
    color: terminal ? 'var(--bg)' : 'var(--text-muted)',
    fontSize: 11, fontWeight: 500, border: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }}>
    <span style={{ width: 5, height: 5, borderRadius: 99, background: terminal ? 'var(--rec)' : 'var(--text-soft)', flexShrink: 0 }} />
    {label}
  </div>
);

const Connector = () => (
  <div style={{ width: 14, height: 1, background: 'var(--border)', flexShrink: 0 }} />
);

/* ─── Toggle (review screen) ─── */

const ReviewToggle: React.FC<{ label: string; sub: string; defaultOn?: boolean }> = ({ label, sub, defaultOn }) => {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn(v => !v)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 12, border: '1px solid var(--border)',
        borderRadius: 8, background: 'var(--bg-elev)',
        cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{sub}</span>
      </div>
      <span style={{
        width: 28, height: 16, borderRadius: 99,
        background: on ? 'var(--text)' : 'var(--border-strong)',
        position: 'relative', flexShrink: 0, transition: 'background 100ms',
      }}>
        <span style={{
          width: 12, height: 12, borderRadius: 99, background: 'var(--bg)',
          position: 'absolute', top: 2, left: on ? 14 : 2, transition: 'left 120ms',
        }} />
      </span>
    </button>
  );
};

/* ─── Confusion Timeline ─── */

const ConfusionTimeline: React.FC<{ markers: number[]; duration: number }> = ({ markers, duration }) => (
  <div style={{ position: 'relative', height: 36, background: 'var(--bg-elev)', borderRadius: 6, border: '1px solid var(--border)', padding: '0 8px' }}>
    <div style={{ position: 'absolute', top: '50%', left: 8, right: 8, height: 1, background: 'var(--border-strong)' }} />
    {markers.map((t, i) => {
      const pct = duration > 0 ? (t / duration) * 100 : 0;
      return (
        <div key={i} style={{
          position: 'absolute', left: `calc(${pct}% + 4px)`, top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          transform: 'translateX(-50%)',
        }}>
          <div style={{ width: 1, height: 10, background: 'var(--confuse)' }} />
          <FlagIcon />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{fmtTime(t)}</span>
        </div>
      );
    })}
  </div>
);

/* ─── Main component ─── */

const RecordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setLectures, courses, userSettings, addAgentJob, updateAgentJob, activeCourseId, refreshLecture, lectures } = useAppContext();

  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [showSetup, setShowSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<LectureFile[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [confusionMarkers, setConfusionMarkers] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [pushToNotion, setPushToNotion] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const activeMimeTypeRef = useRef<string>('audio/wav');

  const waveformBars = useWaveform(status === AppState.RECORDING);

  // Dashboard data
  const scopedLectures = useMemo(() => {
    if (!activeCourseId) return lectures;
    return lectures.filter(l => l.courseId === activeCourseId);
  }, [activeCourseId, lectures]);

  const activeCourse = courses.find(c => c.id === activeCourseId);
  const totalCards = scopedLectures.reduce((n, l) => n + (l.flashcards?.length ?? 0), 0);
  const totalConfusions = scopedLectures.reduce((n, l) => n + (l.confusionMarkers?.length ?? 0), 0);
  const continueL = [...scopedLectures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const aiReady = hasConfiguredAi(userSettings);

  useEffect(() => {
    if ((status === AppState.REVIEWING || showSetup) && activeCourseId) setSelectedCourseId(activeCourseId);
  }, [status, showSetup, activeCourseId]);

  const handleOpenSetup = () => {
    if (!aiReady) {
      navigate('/settings?tab=ai');
      return;
    }
    if (activeCourseId) setSelectedCourseId(activeCourseId);
    setShowSetup(true);
  };

  // Open setup via "Record" nav; close it when navigating to "/" without openRecord (e.g. Dashboard)
  useEffect(() => {
    const state = location.state as { openRecord?: boolean } | null;
    if (state?.openRecord && status === AppState.IDLE) {
      setShowSetup(true);
      if (activeCourseId) setSelectedCourseId(activeCourseId);
    } else if (!state?.openRecord && showSetup && status === AppState.IDLE) {
      setShowSetup(false);
    }
  }, [location.key]); // location.key changes on every navigate() call, even same-path

  const optimizeImage = (file: File): Promise<{ base64: string; previewUrl: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX = 1200;
          if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
          else { if (height > MAX) { width *= MAX / height; height = MAX; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get context');
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

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setIsOptimizing(true);
    const newFiles: LectureFile[] = [];
    for (const file of Array.from(files) as File[]) {
      try {
        if (file.type.startsWith('image/')) {
          const opt = await optimizeImage(file);
          newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, mimeType: 'image/jpeg', base64: opt.base64, previewUrl: opt.previewUrl });
        } else {
          const b64 = await new Promise<string>(res => {
            const reader = new FileReader();
            reader.onloadend = () => res((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, mimeType: file.type, base64: b64 });
        }
      } catch (err) { console.error('Error processing file', file.name, err); }
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
    const ext = activeMimeTypeRef.current.includes('webm') ? 'webm' : activeMimeTypeRef.current.includes('mp4') ? 'm4a' : activeMimeTypeRef.current.includes('ogg') ? 'ogg' : 'wav';
    a.download = `lecture_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
    setShowSetup(false);
    setStatus(AppState.REVIEWING);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/wav'];
      const selectedMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      activeMimeTypeRef.current = selectedMime;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMime, audioBitsPerSecond: 16000 });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setConfusionMarkers([]);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        setRecordedBlob(new Blob(audioChunksRef.current, { type: activeMimeTypeRef.current }));
        setStatus(AppState.REVIEWING);
      };
      mediaRecorder.start();
      setShowSetup(false);
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
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
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
          const { summary, cornellNotes, title: generatedTitle } = await API.summarize(transcript, filesForApi, confusionMarkers);
          const lectureTitle = generatedTitle?.trim() || `Lecture ${new Date().toLocaleDateString()}`;
          const newLecture: SavedLecture = {
            id: '', userId: user.id, title: lectureTitle,
            date: new Date().toISOString(), transcript, summary, cornellNotes, confusionMarkers,
            files: uploadedFiles.map(f => ({ name: f.name, mimeType: f.mimeType })),
            courseId: selectedCourseId || undefined,
          };
          const savedId = await StorageService.saveLecture(newLecture);
          const lectureWithId = { ...newLecture, id: savedId };
          setLectures(prev => [lectureWithId, ...prev]);
          setUploadedFiles([]); setRecordedBlob(null); setConfusionMarkers([]);
          const pipelineJobId = `post-lecture-${savedId}`;
          addAgentJob({ id: pipelineJobId, user_id: user.id, lecture_id: savedId, agent_type: 'pipeline', status: 'running', created_at: new Date().toISOString() });
          const onDone = () => refreshLecture(savedId).catch(err => console.error('refresh failed:', err));
          if (user.id === 'guest') {
            runGuestStudyMaterials(savedId, user.id, transcript).then(() => { onDone(); updateAgentJob(pipelineJobId, { status: 'completed' }); }).catch(() => updateAgentJob(pipelineJobId, { status: 'failed' }));
          } else {
            triggerPostLecturePipeline(savedId, userSettings).then(resp => { onDone(); updateAgentJob(resp.jobId ?? pipelineJobId, { status: 'completed' }); }).catch(() => updateAgentJob(pipelineJobId, { status: 'failed' }));
          }
          navigate(`/lecture/${savedId}`);
        } catch (err: unknown) {
          setErrorMessage(err instanceof Error ? err.message : 'An error occurred during AI processing.');
          setStatus(AppState.ERROR);
        }
      };
    } catch {
      setErrorMessage('Failed to read audio file.');
      setStatus(AppState.ERROR);
    }
  };

  /* ─── SETUP ─── */
  if (status === AppState.IDLE && showSetup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <input type="file" ref={audioInputRef} onChange={onAudioUpload} accept="audio/*" style={{ display: 'none' }} />
        <TopBar breadcrumb={
          <>
            <button className="btn btn-ghost" onClick={() => setShowSetup(false)} style={{ padding: '4px 8px', gap: 4 }}>
              <ChevronLeft /> Back
            </button>
            <ChevronRight />
            <span style={{ fontSize: 12, fontWeight: 500 }}>New capture</span>
          </>
        }>
          <span className="chip">
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--good)' }} />
            Mic check ok
          </span>
        </TopBar>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Capture</span>
              <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>Ready when you are.</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55, maxWidth: 480 }}>
                Hit record before class starts. Mark moments of confusion with a tap — we'll loop the transcript back to those exact seconds later.
              </p>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Course */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><BookIcon /></div>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 140, flexShrink: 0 }}>Course</span>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  style={{ flex: 1, fontSize: 12.5, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                >
                  <option value="">No course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><MicIcon /></div>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 140, flexShrink: 0 }}>Source</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Built-in microphone · 16kbps mono</span>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11.5 }}>Change</button>
              </div>
              {/* On stop */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><SparkleIcon /></div>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 140, flexShrink: 0 }}>On stop</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Transcribe → Cornell → Cards → Quiz</span>
                <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>
                  <SparkleIcon /> Auto
                </span>
              </div>
              {/* Confusion shortcut */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><FlagIcon /></div>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 140, flexShrink: 0 }}>Confusion shortcut</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Tap the lime ring, or press</span>
                <span className="kbd">Space</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={startRecording}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, flex: 1,
                  padding: '14px 18px', background: 'var(--text)', color: 'var(--bg)',
                  border: 0, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--rec)', boxShadow: '0 0 0 4px rgba(212,240,0,0.25)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, lineHeight: 1.1 }}>Start recording</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.7, marginTop: 2 }}>Hold ⌥ to start with screen capture</span>
                </span>
                <ArrowRight />
              </button>
              <button className="btn" onClick={() => audioInputRef.current?.click()}>
                <UploadIcon /> Upload audio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── IDLE — Studio Dashboard ─── */
  if (status === AppState.IDLE || status === AppState.COMPLETED) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          breadcrumb={
            <>
              <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
              <ChevronRight />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{activeCourse ? activeCourse.name : 'All lectures'}</span>
            </>
          }
        >
          <button className="btn btn-accent" onClick={handleOpenSetup}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="3" />
              <circle cx="6.5" cy="6.5" r="5.5" strokeOpacity="0.3" />
            </svg>
            Record
          </button>
          <button className="btn" onClick={() => audioInputRef.current?.click()}>
            <UploadIcon /> Import audio
          </button>
        </TopBar>

        <input type="file" ref={audioInputRef} onChange={onAudioUpload} accept="audio/*" style={{ display: 'none' }} />

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 60px' }}>
            <AgentJobStatusBar />

            {!aiReady && (
              <div style={{
                marginBottom: 20,
                padding: '12px 16px',
                borderRadius: 'var(--r)',
                background: 'var(--confuse-soft)',
                border: '1px solid var(--confuse)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                  Add your AI provider API key in Settings before recording or importing lectures.
                </p>
                <button className="btn btn-accent" type="button" onClick={() => navigate('/settings?tab=ai')}>
                  Open Settings → AI
                </button>
              </div>
            )}

            {/* hero */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: 0 }}>
                {activeCourse ? activeCourse.name : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-display)', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1.05, margin: '6px 0 0' }}>
                {activeCourse ? activeCourse.name : `Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}.`}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
                {scopedLectures.length} lecture{scopedLectures.length !== 1 ? 's' : ''} · {totalCards} cards · {totalConfusions} open question{totalConfusions !== 1 ? 's' : ''}
              </p>
            </div>

            {/* stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
              <Stat label="Lectures" value={scopedLectures.length} sub="captured" />
              <Stat label="Flashcards" value={totalCards} sub="available" accent="var(--accent)" />
              <Stat label="Open questions" value={totalConfusions} sub="needs review" accent="var(--confuse)" />
              <Stat label="Courses" value={courses.length} sub="total" />
            </div>

            {/* continue + capture */}
            <div style={{ display: 'grid', gridTemplateColumns: continueL ? '1.4fr 1fr' : '1fr', gap: 12, marginBottom: 32 }}>
              {continueL && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>Continue</span>
                    <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Last added {fmtDate(continueL.date)}</span>
                  </div>
                  <h2
                    style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 400, margin: '4px 0 2px', letterSpacing: '-0.01em', cursor: 'pointer', color: 'var(--text)' }}
                    onClick={() => navigate(`/lecture/${continueL.id}`)}
                  >
                    {continueL.title}
                  </h2>
                  {continueL.summary?.overview && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {continueL.summary.overview}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={() => navigate(`/lecture/${continueL.id}`)}>
                      Open lecture
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-sunken)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Capture</span>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Heading into class?</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.6 }}>
                  Start the recorder before you sit down — we capture at 16kbps mono and process when you stop.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                  <button className="btn btn-accent" onClick={handleOpenSetup} style={{ flex: 1, justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="3" /><circle cx="6.5" cy="6.5" r="5.5" strokeOpacity="0.3" /></svg>
                    Start recording
                  </button>
                  <button className="btn" onClick={() => audioInputRef.current?.click()}><UploadIcon /></button>
                </div>
              </div>
            </div>

            {/* Lecture table */}
            {scopedLectures.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Recent lectures</h3>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <div style={{ width: '45%' }}>Lecture</div>
                    <div style={{ width: '20%' }}>Course</div>
                    <div style={{ width: '15%' }}>Captured</div>
                    <div style={{ width: '10%', textAlign: 'right' }}>Cards</div>
                    <div style={{ width: '10%', textAlign: 'right' }}>Flags</div>
                  </div>
                  {[...scopedLectures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(lecture => {
                    const course = courses.find(c => c.id === lecture.courseId);
                    const cardCount = lecture.flashcards?.length ?? 0;
                    const flagCount = lecture.confusionMarkers?.length ?? 0;
                    return (
                      <button
                        key={lecture.id}
                        type="button"
                        onClick={() => navigate(`/lecture/${lecture.id}`)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'transparent', border: 0, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', transition: 'background 80ms' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 12 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lecture.title}</span>
                          {lecture.summary?.overview && (
                            <span style={{ fontSize: 11, color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {lecture.summary.overview.slice(0, 80)}
                            </span>
                          )}
                        </div>
                        <div style={{ width: '20%' }}>
                          {course ? (
                            <span className="chip" style={{ background: 'transparent' }}>
                              <span style={{ width: 6, height: 6, borderRadius: 2, background: displayCourseColor(course.color), flexShrink: 0 }} />
                              {course.name.slice(0, 12)}
                            </span>
                          ) : <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>}
                        </div>
                        <div style={{ width: '15%', fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(lecture.date)}</div>
                        <div style={{ width: '10%', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{cardCount || '—'}</div>
                        <div style={{ width: '10%', textAlign: 'right' }}>
                          {flagCount > 0 ? (
                            <span style={{ fontSize: 11, color: 'var(--confuse)', background: 'var(--confuse-soft)', padding: '1px 6px', borderRadius: 4 }}>{flagCount}</span>
                          ) : <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {scopedLectures.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-soft)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <MicIcon />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>No lectures yet</h3>
                <p style={{ fontSize: 13, margin: '0 0 20px' }}>Hit Record to capture your first class.</p>
                <button className="btn btn-accent" onClick={handleOpenSetup}>Start recording</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── RECORDING ─── */
  if (status === AppState.RECORDING) {
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-sunken)' }}>
        <TopBar
          breadcrumb={
            <>
              <span style={{
                width: 8, height: 8, borderRadius: 99,
                background: 'var(--rec-deep)',
                boxShadow: '0 0 0 3px var(--bg-sunken), 0 0 0 5px var(--rec)',
                animation: 'rec-pulse 1.6s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rec-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live</span>
              <span style={{ color: 'var(--text-faint)' }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(recordingTime)}</span>
            </>
          }
        >
          <span className="chip">{confusionMarkers.length} confusion{confusionMarkers.length === 1 ? '' : 's'} flagged</span>
          <button className="btn" onClick={stopRecording}>
            <StopIcon /> Stop & review
          </button>
        </TopBar>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
          {/* Left — timer + waveform */}
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* faint info */}
            <div style={{ position: 'absolute', top: 32, left: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)', letterSpacing: '0.05em' }}>
              {selectedCourse ? selectedCourse.name : 'No course'} · live capture · {fmtTime(recordingTime)}
            </div>

            {/* big timer + waveform */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginTop: -40 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 96, fontWeight: 300,
                letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtTime(recordingTime)}
              </div>
              <Waveform bars={waveformBars} />
            </div>

            {/* Confusion ring */}
            <button
              type="button"
              onClick={handleConfusionMark}
              onKeyDown={e => { if (e.key === ' ') handleConfusionMark(); }}
              style={{
                position: 'absolute', bottom: 32, right: 32,
                width: 120, height: 120, borderRadius: 99,
                background: 'var(--bg-elev)',
                border: '1.5px solid var(--rec-deep)',
                boxShadow: '0 0 0 8px rgba(212,240,0,0.18), 0 12px 30px rgba(0,0,0,0.08)',
                cursor: 'pointer', color: 'var(--text)', padding: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              aria-label="Mark confusion"
            >
              <QuestionIcon />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>Flag moment</span>
              <span style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 2 }}>{confusionMarkers.length} marked</span>
            </button>
          </div>

          {/* Right — transcript ribbon */}
          <aside style={{ background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live transcript</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--good)' }} />
                streaming
              </span>
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                Listening…
              </p>
            </div>

            {/* Flagged moments */}
            <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Flagged moments</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--confuse)' }}>{confusionMarkers.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {confusionMarkers.length === 0 ? (
                  <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: 0 }}>Press the lime ring whenever something stops making sense.</p>
                ) : confusionMarkers.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--confuse-soft)', borderRadius: 6 }}>
                    <FlagIcon />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)' }}>{fmtTime(t)}</span>
                    <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-muted)' }}>marker</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ─── REVIEWING ─── */
  if (status === AppState.REVIEWING) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <input type="file" ref={fileInputRef} onChange={onFileChange} multiple accept="image/*,application/pdf" style={{ display: 'none' }} />
        <TopBar
          breadcrumb={
            <>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Review capture</span>
              <span style={{ color: 'var(--text-faint)' }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(recordingTime)}</span>
            </>
          }
        >
          <button className="btn" onClick={() => { setStatus(AppState.IDLE); setRecordedBlob(null); setConfusionMarkers([]); }}>Discard</button>
          <button className="btn" onClick={downloadRecording}><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 11.5V4.5M3.5 8.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1.5 11.5h10" strokeLinecap="round" /></svg> Save audio only</button>
          <button className="btn btn-accent" onClick={finalizeLecture} disabled={isOptimizing}>
            <SparkleIcon /> Process & open
          </button>
        </TopBar>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 6px', letterSpacing: '-0.02em' }}>That sounded clean.</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                {Math.floor(recordingTime / 60)} min captured · {confusionMarkers.length} confusion marker{confusionMarkers.length === 1 ? '' : 's'} · ready for the AI pipeline.
              </p>
            </div>

            {/* Pipeline */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pipeline</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Stage label="Transcribe" />
                  <Connector />
                  <Stage label="Cornell notes" />
                  <Connector />
                  <Stage label="Flashcards" />
                  <Connector />
                  <Stage label="Quiz" />
                  <Connector />
                  <Stage label="Open" terminal />
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <ReviewToggle label="Auto-organize into course" sub="Suggested folder based on content" defaultOn />
                  <ReviewToggle label="Push to Notion" sub="Not connected — connect from settings" />
                  <ReviewToggle label="Research mode" sub="Look up confusion markers in background" defaultOn />
                  <ReviewToggle label="Email yourself a recap" sub="Tomorrow morning · 8 am" />
                </div>
              </div>
            </div>

            {/* Confusion timeline */}
            <div className="card" style={{ background: 'var(--bg-sunken)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <FlagIcon />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Confusion timeline</span>
              </div>
              {confusionMarkers.length > 0 ? (
                <ConfusionTimeline markers={confusionMarkers} duration={recordingTime} />
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: 0, fontStyle: 'italic' }}>No confusion markers recorded.</p>
              )}
            </div>

            {/* Course selector */}
            {courses.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 6 }}>Course</div>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                >
                  <option value="">No course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Supplemental files */}
            <div>
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon />
                {isOptimizing ? 'Processing files…' : 'Attach files (slides, photos)'}
              </button>
              {uploadedFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {uploadedFiles.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{f.name}</span>
                      <button type="button" onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)', lineHeight: 1, padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── TRANSCRIBING / SUMMARIZING ─── */
  if (status === AppState.TRANSCRIBING || status === AppState.SUMMARIZING) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 48 }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 700ms linear infinite' }} />
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          {status === AppState.TRANSCRIBING ? 'Transcribing…' : 'Generating notes…'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>AI is processing your lecture.</p>
      </div>
    );
  }

  /* ─── ERROR ─── */
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div className="card" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h3>
        <p style={{ color: 'var(--bad)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>{errorMessage}</p>
        <button className="btn btn-primary" onClick={() => setStatus(AppState.IDLE)}>Back to dashboard</button>
      </div>
    </div>
  );
};

export default RecordPage;
