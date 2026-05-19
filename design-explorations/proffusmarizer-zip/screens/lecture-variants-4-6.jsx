/* global React, Icon, PSData, TopBar, fmtTime, fmtDate,
   CornellBlock, KeyPoints, ActionItems, Vocab, Flashcards, Quiz, Chat,
   LectureHeader, DocBreadcrumb, lectureStyles */

const { useState, useEffect, useRef, useMemo } = React;
const S = window.lectureStyles;

/* ═════════════════════════════════════════════════════════════════
   VARIANT 4 · COMMAND
   A monastic single-column reading view. ⌘K palette is the entire UI:
   summons cards / quiz / chat / search / jump. Press K to open.
═════════════════════════════════════════════════════════════════ */
function VariantCommand({ lecture, course, onBack }) {
  const [palette, setPalette] = useState(false);
  const [overlay, setOverlay] = useState(null); // 'cards' | 'quiz' | 'chat' | null
  const [paletteQ, setPaletteQ] = useState('');
  const [paletteIdx, setPaletteIdx] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (((e.metaKey || e.ctrlKey) && e.key === 'k') || (e.key === 'k' && !isInput && !palette)) {
        e.preventDefault();
        setPalette(p => !p);
      }
      if (e.key === 'Escape') {
        setPalette(false);
        setOverlay(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette]);

  const commands = [
    { id: 'cards', label: 'Study flashcards', sub: '8 cards · spaced repetition', icon: 'cards', shortcut: 'C' },
    { id: 'quiz', label: 'Take the quiz', sub: '5 questions · ~3 min', icon: 'check', shortcut: 'Q' },
    { id: 'chat', label: 'Ask Professor', sub: 'Grounded chat about this lecture', icon: 'message', shortcut: 'A' },
    { id: 'transcript', label: 'Search transcript', sub: 'Jump to any moment', icon: 'search', shortcut: '/' },
    { id: 'jump-1', label: 'Jump: Default Mode Network', sub: '02:22 · cue 01', icon: 'arrowRight' },
    { id: 'jump-2', label: 'Jump: PCC + mPFC hubs', sub: '14:44 · cue 04', icon: 'arrowRight' },
    { id: 'jump-3', label: 'Jump: Alzheimer\u2019s pathology', sub: '24:52 · cue 06', icon: 'arrowRight' },
    { id: 'audio', label: 'Play audio', sub: 'From start, 1.0×', icon: 'play' },
    { id: 'flags', label: 'Show your flags', sub: '3 unresolved questions', icon: 'flag' },
    { id: 'export', label: 'Export to Notion', sub: 'Cognitive Sci workspace', icon: 'notion' },
  ];
  const filtered = commands.filter(c => c.label.toLowerCase().includes(paletteQ.toLowerCase()));
  const run = (id) => {
    if (['cards', 'quiz', 'chat'].includes(id)) setOverlay(id);
    setPalette(false);
    setPaletteQ('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <button className="btn" onClick={() => setPalette(true)}>
          <Icon name="command" size={13} /> Commands
          <span className="kbd" style={{ marginLeft: 4 }}>K</span>
        </button>
      </TopBar>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <article style={{ maxWidth: 660, padding: '60px 32px 100px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
              {course?.code} · {fmtDate(lecture.date)}
            </span>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 64,
              fontWeight: 400,
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              margin: '10px 0 16px',
            }}>{lecture.title}</h1>
            <p style={{ fontSize: 19, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
              {lecture.subtitle}
            </p>
          </div>

          <hr style={{ border: 0, height: 1, background: 'var(--border)', margin: 0 }} />

          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
            {window.PSData.HERO_CORNELL.summary}
          </p>

          {window.PSData.HERO_CORNELL.notes.map((n, i) => {
            const cue = window.PSData.HERO_CORNELL.cues[i];
            return (
              <section key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3 style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--accent)',
                  margin: 0, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span className="mono" style={{ color: 'var(--text-soft)' }}>{String(i + 1).padStart(2, '0')}</span>
                  {cue.cue}
                  <span style={{ flex: 1 }} />
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{fmtTime(cue.at)}</span>
                </h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--text)', margin: 0 }}>{n.text}</p>
              </section>
            );
          })}

          <hr style={{ border: 0, height: 1, background: 'var(--border)', margin: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>Press <span className="kbd" style={{ margin: '0 4px' }}>⌘ K</span> for everything else.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setOverlay('cards')}><Icon name="cards" size={13} /> Cards</button>
              <button className="btn" onClick={() => setOverlay('quiz')}><Icon name="check" size={13} /> Quiz</button>
              <button className="btn btn-accent" onClick={() => setOverlay('chat')}><Icon name="message" size={13} /> Ask</button>
            </div>
          </div>
        </article>
      </div>

      {/* FLOATING HINT */}
      <button onClick={() => setPalette(true)} style={S_command.floatingHint}>
        <Icon name="command" size={13} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quick actions</span>
        <span className="kbd">K</span>
      </button>

      {/* PALETTE */}
      {palette && (
        <div style={S_command.scrim} onClick={() => setPalette(false)}>
          <div onClick={e => e.stopPropagation()} style={S_command.palette} className="fade-in">
            <div style={S_command.paletteInput}>
              <Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
              <input
                autoFocus
                value={paletteQ}
                onChange={e => { setPaletteQ(e.target.value); setPaletteIdx(0); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { setPaletteIdx(i => Math.min(i + 1, filtered.length - 1)); e.preventDefault(); }
                  if (e.key === 'ArrowUp') { setPaletteIdx(i => Math.max(i - 1, 0)); e.preventDefault(); }
                  if (e.key === 'Enter' && filtered[paletteIdx]) { run(filtered[paletteIdx].id); }
                }}
                placeholder="What do you want to do?"
                style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 16 }}
              />
              <span className="kbd">esc</span>
            </div>
            <div style={{ padding: 6, maxHeight: 360, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>No matches.</div>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => run(c.id)}
                  onMouseEnter={() => setPaletteIdx(i)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    background: paletteIdx === i ? 'var(--bg-sunken)' : 'transparent',
                    border: 0, borderRadius: 6,
                    cursor: 'pointer', color: 'var(--text)', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Icon name={c.icon} size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{c.sub}</div>
                  </div>
                  {c.shortcut && <span className="kbd">{c.shortcut}</span>}
                  <Icon name="enter" size={12} style={{ color: 'var(--text-faint)' }} />
                </button>
              ))}
            </div>
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, color: 'var(--text-soft)' }}>
              <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
              <span><span className="kbd">⏎</span> run</span>
              <span><span className="kbd">esc</span> close</span>
              <span style={{ flex: 1 }} />
              <span>{filtered.length} of {commands.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY (cards / quiz / chat) */}
      {overlay && (
        <div style={S_command.scrim} onClick={() => setOverlay(null)}>
          <div onClick={e => e.stopPropagation()} style={S_command.overlay} className="fade-in">
            <div style={S_command.overlayHead}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {overlay === 'cards' && 'Flashcards'}
                {overlay === 'quiz' && 'Quiz'}
                {overlay === 'chat' && 'Ask Professor'}
              </span>
              <button className="icon-btn" onClick={() => setOverlay(null)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: overlay === 'chat' ? 0 : 24, flex: 1, overflow: 'hidden' }}>
              {overlay === 'cards' && <Flashcards />}
              {overlay === 'quiz' && <Quiz />}
              {overlay === 'chat' && <div style={{ height: '100%' }}><Chat /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S_command = {
  floatingHint: {
    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 999,
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  scrim: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: 120, zIndex: 50,
  },
  palette: {
    width: 580, maxWidth: '92vw',
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-pop)',
    overflow: 'hidden',
  },
  paletteInput: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px',
    borderBottom: '1px solid var(--border)',
  },
  overlay: {
    width: 780, maxWidth: '92vw',
    maxHeight: '80vh', minHeight: 420,
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-pop)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  overlayHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-sunken)',
  },
};

/* ═════════════════════════════════════════════════════════════════
   VARIANT 5 · TIMELINE
   Audio scrubber at top drives a synchronized Cornell view below.
   Confusion flags, vocab markers, section bands live on the scrubber.
═════════════════════════════════════════════════════════════════ */
function VariantTimeline({ lecture, course, onBack }) {
  const { HERO_CORNELL, HERO_CONFUSIONS, HERO_VOCAB, HERO_TRANSCRIPT_SNIPPETS } = window.PSData;
  const [t, setT] = useState(640);
  const [playing, setPlaying] = useState(false);
  const tickRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    tickRef.current = setInterval(() => {
      setT(prev => Math.min(prev + 2, lecture.duration));
    }, 100);
    return () => clearInterval(tickRef.current);
  }, [playing, lecture.duration]);

  // current section
  const sections = HERO_CORNELL.cues.map((c, i) => ({
    ...c,
    note: HERO_CORNELL.notes[i],
    end: HERO_CORNELL.cues[i + 1]?.at ?? lecture.duration,
  }));
  const current = sections.findIndex(s => t >= s.at && t < s.end);

  const seek = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setT(Math.floor(f * lecture.duration));
  };

  // vocab markers (synthetic timestamps spread across)
  const vocabMarkers = HERO_VOCAB.map((v, i) => ({
    ...v,
    at: Math.floor(lecture.duration * ((i + 0.5) / HERO_VOCAB.length)),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <span className="chip">{HERO_CONFUSIONS.length} flags</span>
        <span className="chip">{HERO_VOCAB.length} terms</span>
      </TopBar>

      {/* SCRUBBER PANEL */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)', padding: '20px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 10 }}>
          <button onClick={() => setPlaying(p => !p)} style={S_timeline.playBtn}>
            <Icon name={playing ? 'pause' : 'play'} size={16} stroke={2} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em',
              margin: 0, lineHeight: 1.1,
            }}>{lecture.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-soft)' }}>
              <span className="mono">{fmtTime(t)} / {lecture.durationLabel}</span>
              <span>·</span>
              <span>{course?.code} · {fmtDate(lecture.date)}</span>
              {current >= 0 && <>
                <span>·</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Now: {sections[current].cue}</span>
              </>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>1.0×</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }}><Icon name="download" size={12} /></button>
          </div>
        </div>

        {/* the track */}
        <div
          ref={trackRef}
          onClick={e => seek(e.clientX)}
          style={S_timeline.track}
        >
          {/* section bands */}
          {sections.map((s, i) => {
            const left = (s.at / lecture.duration) * 100;
            const width = ((s.end - s.at) / lecture.duration) * 100;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${left}%`, top: 0, width: `${width}%`, bottom: 0,
                borderLeft: '1px dashed var(--border-strong)',
                background: i === current ? 'var(--accent-soft)' : 'transparent',
              }}>
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  color: i === current ? 'var(--accent-text)' : 'var(--text-soft)',
                  fontWeight: 600, letterSpacing: '0.02em',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  maxWidth: 'calc(100% - 6px)',
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none',
                }}>{String(i + 1).padStart(2, '0')} · {s.cue}</span>
              </div>
            );
          })}
          {/* mini waveform */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '40%', bottom: '20%',
            display: 'flex', alignItems: 'end', gap: 1, padding: '0 4px', pointerEvents: 'none',
          }}>
            {Array.from({ length: 120 }, (_, i) => {
              const v = 0.18 + Math.abs(Math.sin(i * 0.41) + Math.cos(i * 0.13)) * 0.45;
              const past = (i / 120) < (t / lecture.duration);
              return <span key={i} style={{ flex: 1, height: `${v * 100}%`, background: past ? 'var(--text)' : 'var(--border-strong)', minWidth: 1 }} />;
            })}
          </div>
          {/* playhead */}
          <div style={{
            position: 'absolute', top: -4, bottom: -4,
            left: `${(t / lecture.duration) * 100}%`,
            width: 2, background: 'var(--accent)',
            transform: 'translateX(-1px)',
            boxShadow: '0 0 0 2px var(--bg-sunken), 0 0 0 3px var(--accent)',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', top: -8, left: -7,
              width: 16, height: 16, borderRadius: 99,
              background: 'var(--accent)', border: '2px solid var(--bg-sunken)',
            }} />
          </div>
          {/* confusion flags below track */}
          <div style={S_timeline.markerRow}>
            {HERO_CONFUSIONS.map((c, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setT(c.at); }} style={{
                position: 'absolute', left: `${(c.at / lecture.duration) * 100}%`,
                transform: 'translateX(-50%)', top: 0,
                background: 'var(--confuse)', color: 'var(--bg)',
                padding: '2px 6px', borderRadius: 4, fontSize: 10,
                display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                border: 0,
              }} title={c.note}>
                <Icon name="flag" size={9} stroke={2.2} />
                <span className="mono">{fmtTime(c.at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* legend row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22, fontSize: 11, color: 'var(--text-soft)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 3, background: 'var(--accent)' }} /> playhead
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 8, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }} /> active section
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="flag" size={11} style={{ color: 'var(--confuse)' }} /> confusion
          </span>
          <span style={{ flex: 1 }} />
          <span>scrub to navigate · click flag to jump</span>
        </div>
      </div>

      {/* SYNC PANE */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
        <main style={{ overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map((s, i) => (
              <div key={i}
                   onClick={() => setT(s.at)}
                   style={{
                     padding: '14px 16px',
                     border: `1px solid ${i === current ? 'var(--accent)' : 'var(--border)'}`,
                     borderRadius: 10,
                     background: i === current ? 'var(--accent-soft)' : 'var(--bg-elev)',
                     cursor: 'pointer',
                     position: 'relative',
                     transition: 'background 80ms',
                   }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-soft)', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: i === current ? 'var(--accent-text)' : 'var(--text)' }}>{s.cue}</h3>
                  <span style={{ flex: 1 }} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)' }}>{fmtTime(s.at)} – {fmtTime(s.end)}</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>{s.note.text}</p>
              </div>
            ))}
          </div>
        </main>

        <aside style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-sunken)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={S.paneLabel}>Transcript (live sync)</span>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HERO_TRANSCRIPT_SNIPPETS.map((s, i) => {
              const next = HERO_TRANSCRIPT_SNIPPETS[i + 1]?.at ?? lecture.duration;
              const isCurrent = t >= s.at && t < next;
              return (
                <button key={i} onClick={() => setT(s.at)} style={{
                  background: 'transparent', border: 0, padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
                  borderRadius: 6, borderLeft: `2px solid ${isCurrent ? 'var(--accent)' : 'transparent'}`,
                  color: isCurrent ? 'var(--text)' : 'var(--text-muted)',
                  opacity: isCurrent ? 1 : 0.65,
                }}>
                  <span className="mono" style={{ fontSize: 10, color: isCurrent ? 'var(--accent)' : 'var(--text-soft)', fontWeight: 600 }}>{fmtTime(s.at)}</span>
                  <p style={{ fontSize: 12.5, margin: '2px 0 0', lineHeight: 1.5, fontWeight: isCurrent ? 500 : 400 }}>{s.t}</p>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

const S_timeline = {
  playBtn: {
    width: 48, height: 48, borderRadius: 99,
    background: 'var(--text)', color: 'var(--bg)',
    border: 0, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  track: {
    position: 'relative', height: 60,
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    overflow: 'visible',
  },
  markerRow: {
    position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)',
    height: 20,
  },
};

/* ═════════════════════════════════════════════════════════════════
   VARIANT 6 · CANVAS
   Spatial whiteboard. Cards are absolutely positioned across a wide
   plane; the viewport pans via scroll, with a small minimap for orient.
═════════════════════════════════════════════════════════════════ */
function VariantCanvas({ lecture, course, onBack }) {
  const { HERO_CORNELL, HERO_CONFUSIONS, HERO_VOCAB, HERO_KEY_POINTS, HERO_ACTIONS } = window.PSData;
  const scrollRef = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const CANVAS_W = 1900;
  const CANVAS_H = 1380;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewport({ x: el.scrollLeft, y: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  // pan with middle-mouse / drag
  const dragRef = useRef(null);
  const onMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('[data-noclickdrag]')) return;
    dragRef.current = { x: e.clientX, y: e.clientY, sx: scrollRef.current.scrollLeft, sy: scrollRef.current.scrollTop };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    scrollRef.current.scrollLeft = dragRef.current.sx - dx;
    scrollRef.current.scrollTop = dragRef.current.sy - dy;
  };
  const onMouseUp = () => { dragRef.current = null; };

  // card positions
  const cards = [
    { x: 540, y: 60,  w: 520, h: 230, render: () => <TitleCard lecture={lecture} course={course} /> },
    { x: 110, y: 320, w: 380, h: 260, render: () => <SummaryCard /> },
    { x: 530, y: 350, w: 540, h: 320, render: () => <KeyPointsCard /> },
    { x: 1100,y: 320, w: 440, h: 360, render: () => <VocabCard /> },
    { x: 100, y: 620, w: 420, h: 320, render: () => <CornellPair idx={0} /> },
    { x: 560, y: 720, w: 420, h: 320, render: () => <CornellPair idx={2} /> },
    { x: 1020,y: 720, w: 420, h: 280, render: () => <CornellPair idx={4} /> },
    { x: 1480,y: 380, w: 380, h: 360, render: () => <ConfusionCard /> },
    { x: 1480,y: 780, w: 380, h: 260, render: () => <ActionsCard /> },
    { x: 100, y: 990, w: 540, h: 320, render: () => <FlashcardsCard /> },
    { x: 680, y: 1080,w: 520, h: 230, render: () => <QuizCard /> },
    { x: 1240,y: 1080,w: 460, h: 230, render: () => <ChatHintCard /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>
          <Icon name="grid" size={11} /> Canvas
        </span>
        <button className="btn"><Icon name="plus" size={13} /> Add note</button>
      </TopBar>
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          flex: 1, position: 'relative', overflow: 'auto',
          background:
            'radial-gradient(circle at 1px 1px, var(--border-subtle) 1px, transparent 0) 0 0 / 24px 24px, var(--bg-sunken)',
          cursor: 'grab',
        }}
      >
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
          {cards.map((c, i) => (
            <div key={i} data-noclickdrag style={{
              position: 'absolute', left: c.x, top: c.y, width: c.w, minHeight: c.h, maxHeight: c.h,
              boxShadow: 'var(--shadow-lg)', borderRadius: 12,
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {c.render()}
            </div>
          ))}
          {/* connectors */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--border-strong)" />
              </marker>
            </defs>
            <path d="M 800,290 Q 800,310 800,320" stroke="var(--border-strong)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
            <path d="M 310,580 Q 310,600 310,620" stroke="var(--border-strong)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
            <path d="M 800,670 Q 800,700 770,720" stroke="var(--border-strong)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          </svg>
        </div>
      </div>

      {/* minimap */}
      <Minimap viewport={viewport} canvasW={CANVAS_W} canvasH={CANVAS_H} cards={cards} />
      {/* hint */}
      <div style={S_canvas.hint}>
        <Icon name="more" size={12} />
        <span>Drag to pan · scroll to navigate</span>
      </div>
    </div>
  );
}

function TitleCard({ lecture, course }) {
  return (
    <div style={{ padding: 22, background: 'linear-gradient(180deg, var(--bg-elev), var(--bg-sunken))', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: course?.color }} />
        {course?.code} · {fmtDate(lecture.date)} · {lecture.durationLabel}
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontSize: 40, fontWeight: 400, letterSpacing: '-0.025em',
        margin: '4px 0 0', lineHeight: 1.0,
      }}>{lecture.title}</h1>
      <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{lecture.subtitle}</p>
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button className="btn btn-primary"><Icon name="play" size={12} /> Play</button>
        <button className="btn"><Icon name="cards" size={12} /> Cards</button>
        <button className="btn"><Icon name="check" size={12} /> Quiz</button>
      </div>
    </div>
  );
}

function SummaryCard() {
  return (
    <div style={{ padding: 18, height: '100%', overflow: 'hidden' }}>
      <span style={S.paneLabel}>Summary</span>
      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, margin: '8px 0 0', color: 'var(--text)' }}>
        {window.PSData.HERO_CORNELL.summary}
      </p>
    </div>
  );
}

function KeyPointsCard() {
  const { HERO_KEY_POINTS } = window.PSData;
  return (
    <div style={{ padding: '18px 0 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 18px' }}>
        <span style={S.paneLabel}>Key takeaways</span>
      </div>
      <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', overflow: 'auto' }}>
        {HERO_KEY_POINTS.map((p, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, padding: '8px 18px', borderTop: i === 0 ? 0 : '1px solid var(--border-subtle)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)', flexShrink: 0, paddingTop: 1, width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VocabCard() {
  const { HERO_VOCAB } = window.PSData;
  return (
    <div style={{ padding: 18, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <span style={S.paneLabel}>Vocabulary · {HERO_VOCAB.length} terms</span>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        {HERO_VOCAB.map((v, i) => (
          <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-sunken)', display: 'flex', gap: 10 }}>
            <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, flexShrink: 0, minWidth: 80 }}>{v.term}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{v.def}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CornellPair({ idx }) {
  const { HERO_CORNELL } = window.PSData;
  const cue = HERO_CORNELL.cues[idx];
  const note = HERO_CORNELL.notes[idx];
  return (
    <div style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--border)' }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
          CUE {String(idx + 1).padStart(2, '0')} · {fmtTime(cue.at)}
        </span>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '4px 0 0', color: 'var(--text)' }}>{cue.cue}</h3>
      </div>
      <div style={{ padding: '14px 16px', flex: 1, overflow: 'auto' }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{note.text}</p>
      </div>
    </div>
  );
}

function ConfusionCard() {
  const { HERO_CONFUSIONS } = window.PSData;
  return (
    <div style={{ padding: 18, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--confuse-soft)', color: 'var(--confuse)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="flag" size={12} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Your confusion flags</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {HERO_CONFUSIONS.map((c, i) => (
          <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--confuse-soft)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--confuse)', fontWeight: 600 }}>{fmtTime(c.at)}</span>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: '4px 0 0', color: 'var(--text)' }}>{c.note}</p>
          </div>
        ))}
      </div>
      <button className="btn btn-accent" style={{ justifyContent: 'center', marginTop: 'auto' }}>
        <Icon name="sparkle" size={12} /> Ask Professor about all 3
      </button>
    </div>
  );
}

function ActionsCard() {
  return (
    <div style={{ padding: 0, height: '100%' }}><ActionItems /></div>
  );
}

function FlashcardsCard() {
  return (
    <div style={{ padding: 18, height: '100%' }}>
      <span style={S.paneLabel}>Flashcards · 8 cards</span>
      <div style={{ marginTop: 10 }}><Flashcards /></div>
    </div>
  );
}

function QuizCard() {
  return (
    <div style={{ padding: 18, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--good-soft)', color: 'var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={12} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Quick check</span>
        <span className="chip">5 questions</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        Test your understanding of DMN hubs, anti-correlation, and the Alzheimer&apos;s link.
      </p>
      <button className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 'auto' }}>
        Start quiz <Icon name="arrowRight" size={12} />
      </button>
    </div>
  );
}

function ChatHintCard() {
  return (
    <div style={{ padding: 18, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="graduation" size={12} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Ask Professor</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Have a question? I&apos;m grounded in this lecture.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <button className="btn" style={{ justifyContent: 'flex-start' }}>What\u2019s on the midterm?</button>
        <button className="btn" style={{ justifyContent: 'flex-start' }}>Explain anti-correlation simply</button>
      </div>
    </div>
  );
}

function Minimap({ viewport, canvasW, canvasH, cards }) {
  const W = 180, H = 130;
  const sx = W / canvasW, sy = H / canvasH;
  return (
    <div style={S_canvas.minimap}>
      <div style={{ position: 'relative', width: W, height: H, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: c.x * sx, top: c.y * sy,
            width: c.w * sx, height: c.h * sy,
            background: 'var(--border)', borderRadius: 1,
          }} />
        ))}
        <div style={{
          position: 'absolute',
          left: viewport.x * sx, top: viewport.y * sy,
          width: viewport.w * sx, height: viewport.h * sy,
          border: '1.5px solid var(--accent)',
          background: 'rgba(91, 91, 214, 0.06)',
          borderRadius: 2,
        }} />
      </div>
      <span style={{ fontSize: 9, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', marginTop: 4, display: 'block', letterSpacing: '0.04em' }}>
        {Math.round(viewport.x)} · {Math.round(viewport.y)}
      </span>
    </div>
  );
}

const S_canvas = {
  minimap: {
    position: 'absolute', right: 18, bottom: 18,
    padding: 8,
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 5,
  },
  hint: {
    position: 'absolute', left: 18, bottom: 18,
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px',
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    boxShadow: 'var(--shadow)',
    color: 'var(--text-muted)',
    fontSize: 11,
    zIndex: 5,
  },
};

window.VariantCommand = VariantCommand;
window.VariantTimeline = VariantTimeline;
window.VariantCanvas = VariantCanvas;
