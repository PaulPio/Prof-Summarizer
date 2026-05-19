import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard, QuizQuestion } from '../types';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';
import CornellNotesDisplay from '../components/CornellNotesDisplay';
import StudyModePanel from '../components/StudyModePanel';
import ChatWindow from '../components/ChatWindow';
import NotionExportModal from '../components/NotionExportModal';
import { ResearchAssistantGate } from '../components/ResearchPanel';
import AutoOrganizerSuggestionCard from '../components/AutoOrganizerSuggestionCard';
import TopBar from '../components/TopBar';
import { displayCourseColor } from '../constants/courseColors';

const LectureDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, lectures, setLectures, courses, userSettings, agentJobs, refreshLecture } = useAppContext();

  const lecture = lectures.find(l => l.id === id);
  const course = lecture?.courseId ? courses.find(c => c.id === lecture.courseId) : null;

  const isStudyMaterialsLoading = agentJobs.some(
    j => j.lecture_id === id && j.agent_type === 'pipeline' && j.status === 'running',
  );

  const wasPipelineLoading = useRef(false);
  useEffect(() => {
    if (!id) return;
    if (isStudyMaterialsLoading) { wasPipelineLoading.current = true; return; }
    if (wasPipelineLoading.current) { wasPipelineLoading.current = false; refreshLecture(id).catch(() => {}); }
  }, [id, isStudyMaterialsLoading, refreshLecture]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNotionExport, setShowNotionExport] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Vocabulary expand
  const [activeVocab, setActiveVocab] = useState<number | null>(null);

  // Action items done state
  const [actionsDone, setActionsDone] = useState<Set<number>>(new Set());
  const toggleDone = useCallback((i: number) => {
    setActionsDone(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, []);

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardRatings, setCardRatings] = useState<Record<number, 'again' | 'hard' | 'good'>>({});

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  if (!lecture) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Lecture not found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back home</button>
        </div>
      </div>
    );
  }

  const handleFlashcardsGenerated = async (flashcards: Flashcard[]) => {
    if (!user) return;
    const updated = { ...lecture, flashcards };
    setLectures(prev => prev.map(l => l.id === lecture.id ? updated : l));
    try { await StorageService.updateLectureFlashcards(lecture.id, user.id, flashcards); }
    catch (err) { console.error('Failed to save flashcards:', err); }
  };

  const handleQuizGenerated = async (quizData: QuizQuestion[]) => {
    if (!user) return;
    const updated = { ...lecture, quizData };
    setLectures(prev => prev.map(l => l.id === lecture.id ? updated : l));
    try { await StorageService.updateLectureQuiz(lecture.id, user.id, quizData); }
    catch (err) { console.error('Failed to save quiz:', err); }
  };

  const suggestion = (lecture as unknown as Record<string, unknown>).autoOrganizerSuggestions as { suggestedCourseId?: string } | undefined;
  const showSuggestion = !suggestionDismissed && !lecture.courseId && suggestion?.suggestedCourseId && userSettings?.agentAutoOrganizer;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const cards = lecture.flashcards ?? [];
  const quiz = lecture.quizData ?? [];

  // Flashcard helpers
  const currentCard = cards[cardIndex];
  const rateCard = (rating: 'again' | 'hard' | 'good') => {
    setCardRatings(r => ({ ...r, [cardIndex]: rating }));
    if (cardIndex < cards.length - 1) { setCardIndex(i => i + 1); setCardFlipped(false); }
  };
  const resetCards = () => { setCardIndex(0); setCardFlipped(false); setCardRatings({}); };

  // Quiz helpers
  const currentQ = quiz[quizIndex];
  const checkQuiz = () => {
    setQuizRevealed(true);
    if (quizPicked === currentQ?.correctIndex) setQuizScore(s => s + 1);
  };
  const nextQuiz = () => {
    if (quizIndex >= quiz.length - 1) { setQuizDone(true); }
    else { setQuizIndex(i => i + 1); setQuizPicked(null); setQuizRevealed(false); }
  };
  const resetQuiz = () => { setQuizIndex(0); setQuizPicked(null); setQuizRevealed(false); setQuizScore(0); setQuizDone(false); };

  const outlineSections = [
    { id: 'overview', label: 'Overview' },
    ...(lecture.summary?.keyPoints?.length ? [{ id: 'takeaways', label: 'Key takeaways' }] : []),
    ...(lecture.cornellNotes ? [{ id: 'cornell', label: 'Cornell notes' }] : []),
    ...(lecture.summary?.vocabulary?.length ? [{ id: 'vocab', label: 'Vocabulary' }] : []),
    ...(lecture.summary?.actionItems?.length ? [{ id: 'actions', label: 'Action items' }] : []),
    ...(cards.length ? [{ id: 'cards', label: 'Flashcards' }] : []),
    ...(quiz.length ? [{ id: 'quiz', label: 'Quick check' }] : []),
    ...((!cards.length || !quiz.length) && !isStudyMaterialsLoading ? [{ id: 'study', label: 'Study materials' }] : []),
    ...(lecture.confusionMarkers?.length ? [{ id: 'research', label: 'Research' }] : []),
    { id: 'transcript', label: 'Transcript' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <TopBar
        breadcrumb={
          <>
            <button className="btn btn-ghost" style={{ padding: '3px 8px' }} onClick={() => navigate('/')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7.5 2L3 6l4.5 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {course && (
              <>
                <span className="chip" style={{ background: 'transparent' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: displayCourseColor(course.color) }} />
                  {course.name}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
                  <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
            <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {lecture.title}
            </span>
          </>
        }
      >
        {userSettings?.hasNotionConnection && (
          <button className="btn" onClick={() => setShowNotionExport(true)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="1.5" width="9" height="10" rx="1" /><path d="M4.5 4.5h4M4.5 6.5h4M4.5 8.5h2.5" strokeLinecap="round" />
            </svg>
            Export
          </button>
        )}
      </TopBar>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', maxWidth: 1100, margin: '0 auto', gap: 40, padding: '40px 32px 80px' }}>

          {/* ── Main article ── */}
          <article style={{ display: 'flex', flexDirection: 'column', gap: 36, minWidth: 0 }}>
            {/* Eyebrow + title */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {[course?.name, fmtDate(lecture.date)].filter(Boolean).join(' · ')}
              </span>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 56, fontWeight: 400, letterSpacing: '-0.025em',
                lineHeight: 1.02, margin: '8px 0 12px', color: 'var(--text)',
              }}>
                {lecture.title}
              </h1>
              {lecture.summary?.overview && (
                <p style={{ fontSize: 17, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, maxWidth: 640 }}>
                  {lecture.summary.overview.slice(0, 200)}
                </p>
              )}
            </div>

            {showSuggestion && (
              <AutoOrganizerSuggestionCard
                lectureId={lecture.id}
                suggestion={suggestion}
                onAccepted={() => setSuggestionDismissed(true)}
                onDismissed={() => setSuggestionDismissed(true)}
              />
            )}

            {/* Overview */}
            {lecture.summary?.overview && (
              <Section id="overview" label="Overview" onVisible={setActiveSection}>
                <p style={{
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: 21, lineHeight: 1.55, color: 'var(--text)',
                  margin: 0, borderLeft: '2px solid var(--accent)', paddingLeft: 18,
                }}>
                  {lecture.summary.overview}
                </p>
              </Section>
            )}

            {/* Key takeaways */}
            {(lecture.summary?.keyPoints?.length ?? 0) > 0 && (
              <Section id="takeaways" label="Key takeaways" onVisible={setActiveSection}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)', overflow: 'hidden' }}>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {lecture.summary!.keyPoints.map((pt, i) => (
                      <li key={i} style={{
                        display: 'flex', gap: 12, padding: '10px 16px',
                        borderBottom: i < lecture.summary!.keyPoints.length - 1 ? '1px solid var(--border-subtle)' : 0,
                      }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)', flexShrink: 0, width: 18, paddingTop: 2, textAlign: 'right' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>{pt}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Section>
            )}

            {/* Cornell notes */}
            {lecture.cornellNotes && (
              <Section id="cornell" label="Cornell notes" onVisible={setActiveSection}>
                <CornellNotesDisplay notes={lecture.cornellNotes} title={lecture.title} />
              </Section>
            )}

            {/* Vocabulary */}
            {(lecture.summary?.vocabulary?.length ?? 0) > 0 && (
              <Section id="vocab" label="Vocabulary" onVisible={setActiveSection}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)', overflow: 'hidden' }}>
                  <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {lecture.summary!.vocabulary.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveVocab(activeVocab === i ? null : i)}
                        className="chip"
                        style={{
                          background: activeVocab === i ? 'var(--text)' : 'var(--bg-sunken)',
                          color: activeVocab === i ? 'var(--bg)' : 'var(--text)',
                          borderColor: activeVocab === i ? 'var(--text)' : 'var(--border)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11.5,
                          transition: 'background 80ms, color 80ms',
                        }}
                      >
                        {v.term}
                      </button>
                    ))}
                  </div>
                  {activeVocab !== null && (
                    <div className="fade-in" style={{ padding: '0 16px 14px' }}>
                      <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lecture.summary!.vocabulary[activeVocab].term}</span>
                        {' — '}
                        {lecture.summary!.vocabulary[activeVocab].definition}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Action items */}
            {(lecture.summary?.actionItems?.length ?? 0) > 0 && (
              <Section id="actions" label="Action items" onVisible={setActiveSection}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)', overflow: 'hidden' }}>
                  <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
                    {lecture.summary!.actionItems.map((item, i) => {
                      const done = actionsDone.has(i);
                      return (
                        <li key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 16px',
                          borderBottom: i < lecture.summary!.actionItems.length - 1 ? '1px solid var(--border-subtle)' : 0,
                        }}>
                          <button
                            type="button"
                            onClick={() => toggleDone(i)}
                            style={{
                              width: 16, height: 16, marginTop: 2, flexShrink: 0,
                              border: `1.5px solid ${done ? 'var(--good)' : 'var(--border-strong)'}`,
                              borderRadius: 4,
                              background: done ? 'var(--good)' : 'transparent',
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', padding: 0,
                              transition: 'background 120ms, border-color 120ms',
                            }}
                          >
                            {done && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <span style={{
                            fontSize: 13, lineHeight: 1.5, color: done ? 'var(--text-soft)' : 'var(--text)',
                            textDecoration: done ? 'line-through' : 'none',
                            transition: 'color 120ms',
                          }}>
                            {item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Section>
            )}

            {/* Flashcards */}
            {cards.length > 0 && currentCard && (
              <Section id="cards" label="Flashcards" sub={`${cards.length} cards · spaced repetition`} onVisible={setActiveSection}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {String(cardIndex + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ width: `${((cardIndex + 1) / cards.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 200ms' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{Object.keys(cardRatings).length} reviewed</span>
                  </div>

                  {/* Card face */}
                  <button
                    type="button"
                    onClick={() => setCardFlipped(f => !f)}
                    style={{
                      background: 'var(--bg-elev)', border: '1px solid var(--border)',
                      borderRadius: 'var(--r-lg)', padding: '36px 28px', minHeight: 200,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center', cursor: 'pointer', position: 'relative', color: 'var(--text)',
                      width: '100%',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 12, left: 14,
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: cardFlipped ? 'var(--accent)' : 'var(--text-soft)',
                    }}>
                      {cardFlipped ? 'Definition' : 'Term'}
                    </span>
                    <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 10, color: 'var(--text-soft)' }}>
                      <span className="kbd">Space</span> to flip
                    </span>
                    {cardFlipped ? (
                      <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0, maxWidth: 540 }}>
                        {currentCard.definition}
                      </p>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 26, lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em', maxWidth: 540 }}>
                        {currentCard.term}
                      </p>
                    )}
                  </button>

                  {cardFlipped ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <button type="button" className="btn" onClick={() => rateCard('again')} style={{ justifyContent: 'center', borderColor: 'var(--bad)', color: 'var(--bad)' }}>
                        Again <span className="kbd" style={{ marginLeft: 4 }}>1</span>
                      </button>
                      <button type="button" className="btn" onClick={() => rateCard('hard')} style={{ justifyContent: 'center', borderColor: 'var(--confuse)', color: 'var(--confuse)' }}>
                        Hard <span className="kbd" style={{ marginLeft: 4 }}>2</span>
                      </button>
                      <button type="button" className="btn" onClick={() => rateCard('good')} style={{ justifyContent: 'center', borderColor: 'var(--good)', color: 'var(--good)' }}>
                        Good <span className="kbd" style={{ marginLeft: 4 }}>3</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="button" className="btn" onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setCardFlipped(false); }} disabled={cardIndex === 0}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7.5 2L3 6l4.5 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Prev
                      </button>
                      <button type="button" className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCardFlipped(true)}>
                        Reveal answer
                      </button>
                      <button type="button" className="btn" onClick={() => { setCardIndex(i => Math.min(cards.length - 1, i + 1)); setCardFlipped(false); }} disabled={cardIndex === cards.length - 1}>
                        Next
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 2l4.5 4-4.5 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  )}
                  {cardIndex === cards.length - 1 && Object.keys(cardRatings).length > 0 && (
                    <button type="button" className="btn btn-ghost" style={{ alignSelf: 'center', fontSize: 12 }} onClick={resetCards}>
                      Restart deck
                    </button>
                  )}
                </div>
              </Section>
            )}

            {/* Quiz */}
            {quiz.length > 0 && (
              <Section id="quiz" label="Quick check" sub={`${quiz.length} questions`} onVisible={setActiveSection}>
                <div className="card" style={{ padding: 20 }}>
                  {quizDone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--good)' }}>
                        {Math.round((quizScore / quiz.length) * 100)}%
                      </span>
                      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, margin: 0 }}>
                        {quizScore} of {quiz.length} correct.
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 380 }}>
                        {quizScore === quiz.length ? 'Perfect score! Great work.' : quizScore >= quiz.length * 0.8 ? 'Strong result. Review the questions you missed.' : 'Keep studying — try again after reviewing the material.'}
                      </p>
                      <button type="button" className="btn btn-accent" onClick={resetQuiz}>Try again</button>
                    </div>
                  ) : currentQ ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {String(quizIndex + 1).padStart(2, '0')} / {String(quiz.length).padStart(2, '0')}
                        </span>
                        <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
                          <div style={{ width: `${((quizIndex + (quizRevealed ? 1 : 0.4)) / quiz.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 200ms' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>Score {quizScore}</span>
                      </div>

                      <p style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 500, margin: 0, color: 'var(--text)' }}>
                        {currentQ.question}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {currentQ.options.map((opt, i) => {
                          const isAnswer = i === currentQ.correctIndex;
                          const isPicked = quizPicked === i;
                          let bg = 'var(--bg-elev)', border = 'var(--border)';
                          if (quizRevealed) {
                            if (isAnswer) { bg = 'var(--good-soft)'; border = 'var(--good)'; }
                            else if (isPicked) { bg = 'var(--bad-soft)'; border = 'var(--bad)'; }
                          } else if (isPicked) {
                            border = 'var(--accent)'; bg = 'var(--accent-soft)';
                          }
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => !quizRevealed && setQuizPicked(i)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', background: bg,
                                border: `1px solid ${border}`, borderRadius: 8,
                                cursor: quizRevealed ? 'default' : 'pointer',
                                color: 'var(--text)', textAlign: 'left',
                                transition: 'background 100ms, border-color 100ms',
                              }}
                            >
                              <span style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0,
                              }}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>{opt}</span>
                              {quizRevealed && isAnswer && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--good)" strokeWidth="2.5"><path d="M2 7l3.5 3.5 6.5-6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              )}
                              {quizRevealed && isPicked && !isAnswer && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--bad)" strokeWidth="2.5"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizRevealed && currentQ.explanation && (
                        <div className="fade-in" style={{ padding: 12, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent-text)' }}>
                          <strong>Why: </strong>{currentQ.explanation}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!quizRevealed ? (
                          <button type="button" className="btn btn-accent" disabled={quizPicked === null} onClick={checkQuiz}>
                            Check
                          </button>
                        ) : (
                          <button type="button" className="btn btn-accent" onClick={nextQuiz}>
                            {quizIndex >= quiz.length - 1 ? 'See results' : 'Next question'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            )}

            {/* Generate study materials (when none exist) */}
            {(!cards.length || !quiz.length) && !isStudyMaterialsLoading && (
              <Section id="study" label="Study materials" onVisible={setActiveSection}>
                <StudyModePanel
                  transcript={lecture.transcript}
                  lectureId={lecture.id}
                  initialFlashcards={cards.length ? undefined : lecture.flashcards}
                  initialQuizData={quiz.length ? undefined : lecture.quizData}
                  isStudyMaterialsLoading={isStudyMaterialsLoading}
                  onFlashcardsGenerated={handleFlashcardsGenerated}
                  onQuizGenerated={handleQuizGenerated}
                />
              </Section>
            )}

            {isStudyMaterialsLoading && (
              <Section id="study" label="Study materials" onVisible={setActiveSection}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 700ms linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating flashcards and quiz…</span>
                </div>
              </Section>
            )}

            {/* Research */}
            {(lecture.confusionMarkers?.length ?? 0) > 0 && (
              <Section id="research" label="Research suggestions" onVisible={setActiveSection}>
                <ResearchAssistantGate lectureId={lecture.id} confusionMarkers={lecture.confusionMarkers!} />
              </Section>
            )}

            {/* Full transcript */}
            <Section id="transcript" label="Full transcript" onVisible={setActiveSection}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full transcript</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                    ~{Math.round(lecture.transcript.split(' ').length / 130)} min read
                  </span>
                </div>
                <div style={{ padding: '16px 20px', maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lecture.transcript.split(/\n\n+/).filter(Boolean).map((para, i) => (
                    <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, color: 'var(--text-muted)' }}>
                      {para.trim()}
                    </p>
                  ))}
                  {!lecture.transcript.includes('\n\n') && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, color: 'var(--text-muted)' }}>
                      {lecture.transcript}
                    </p>
                  )}
                </div>
              </div>
            </Section>
          </article>

          {/* ── Right rail ── */}
          <aside style={{ position: 'sticky', top: 20, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* On this page */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 8px', padding: '0 10px' }}>
                On this page
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {outlineSections.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setActiveSection(s.id);
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '4px 10px', fontSize: 12,
                        borderLeft: `2px solid ${activeSection === s.id ? 'var(--text)' : 'var(--border)'}`,
                        borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                        color: activeSection === s.id ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: activeSection === s.id ? 600 : 400,
                        background: 'none', cursor: 'pointer', marginBottom: 2,
                        transition: 'color 100ms, border-color 100ms',
                      }}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confusion flags */}
            {(lecture.confusionMarkers?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 8px', padding: '0 10px' }}>
                  Your flags{' '}
                  <span style={{ color: 'var(--confuse)' }}>· {lecture.confusionMarkers!.length}</span>
                </p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lecture.confusionMarkers!.map((t, i) => (
                    <li key={i} style={{ padding: '6px 10px', background: 'var(--confuse-soft)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--confuse)' }}>
                        {`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.4 }}>Confusion flag</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI suggestion card */}
            {(lecture.summary?.keyPoints?.length ?? 0) > 0 && (
              <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  <span style={{ marginRight: 4 }}>✦</span>
                  AI suggests reviewing{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    {lecture.summary!.keyPoints[0]?.slice(0, 40) ?? 'key concepts'}
                  </strong>{' '}
                  before next class.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Floating Ask Professor button */}
      <button
        type="button"
        onClick={() => setIsChatOpen(o => !o)}
        aria-label="Ask Professor"
        style={{
          position: 'absolute', bottom: 22, right: 22, zIndex: 30,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: isChatOpen ? '8px' : '8px 14px 8px 10px',
          borderRadius: 999,
          background: 'var(--text)', color: 'var(--bg)',
          border: 'none', cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          transition: 'padding 120ms ease',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 99,
          background: 'var(--accent)', color: 'white',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isChatOpen ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l9 9M10 1L1 10" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1a5 5 0 110 10A5 5 0 016 1z" />
              <path d="M4 4.5C4 3.1 7.5 3.1 7.5 5c0 1.1-1.5 1.5-1.5 2.5" strokeLinecap="round" />
              <circle cx="6" cy="9" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          )}
        </span>
        {!isChatOpen && <span style={{ fontSize: 12.5, fontWeight: 500 }}>Ask Professor</span>}
      </button>

      {isChatOpen && (
        <div className="fade-in" style={{
          position: 'absolute', bottom: 70, right: 22, zIndex: 40,
          width: 380, height: 520, maxHeight: 'calc(100vh - 110px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-pop)', overflow: 'hidden',
        }}>
          <ChatWindow transcript={lecture.transcript} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
      )}

      {showNotionExport && (
        <NotionExportModal lecture={lecture} onClose={() => setShowNotionExport(false)} />
      )}
    </div>
  );
};

const Section: React.FC<{
  id: string;
  label: string;
  sub?: string;
  children: React.ReactNode;
  onVisible?: (id: string) => void;
}> = ({ id, label, sub, children, onVisible }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onVisible || !ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(id); },
      { threshold: 0.2 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [id, onVisible]);

  return (
    <section id={`section-${id}`} ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: '-0.005em', color: 'var(--text)' }}>{label}</h2>
        {sub && <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</span>}
      </div>
      {children}
    </section>
  );
};

export default LectureDetailPage;
