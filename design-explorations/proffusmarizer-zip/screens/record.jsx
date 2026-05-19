/* global React, Icon, PSData, TopBar, fmtTime */

const { useState, useEffect, useRef } = React;

/* ──────────────── RECORD (reimagined) ────────────────
   Three-state machine: setup → live → review.
   Live mode: an ambient waveform "constellation" with a live transcript
   ribbon that scrolls upward, a confusion flag stack, and a single big
   stop control. No "studio panic" red — calm dark with a lime pulse.
*/
function Record({ activeCourseId, onCancel, onComplete }) {
  const { COURSES, HERO_TRANSCRIPT_SNIPPETS } = window.PSData;
  const [phase, setPhase] = useState('setup');     // setup | live | review
  const [elapsed, setElapsed] = useState(0);
  const [confusions, setConfusions] = useState([]); // [{at, note?}]
  const [courseId, setCourseId] = useState(activeCourseId || 'c1');
  const [visibleSnippets, setVisibleSnippets] = useState([]);
  const [levels, setLevels] = useState(() => Array.from({ length: 64 }, () => Math.random() * 0.3 + 0.1));

  const tickRef = useRef(null);
  const levelRef = useRef(null);

  useEffect(() => {
    if (phase !== 'live') return;
    tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    levelRef.current = setInterval(() => {
      setLevels(prev => {
        const next = [...prev.slice(1), Math.random() * 0.9 + 0.1];
        return next;
      });
    }, 90);
    return () => {
      clearInterval(tickRef.current);
      clearInterval(levelRef.current);
    };
  }, [phase]);

  // populate transcript snippets as time advances (demo data uses real timestamps)
  useEffect(() => {
    const newOnes = HERO_TRANSCRIPT_SNIPPETS.filter(s => s.at <= elapsed + 30 && s.at > elapsed - 8);
    if (newOnes.length !== visibleSnippets.length) {
      setVisibleSnippets(newOnes);
    }
  }, [elapsed, HERO_TRANSCRIPT_SNIPPETS, visibleSnippets.length]);

  const start = () => { setElapsed(0); setConfusions([]); setVisibleSnippets([]); setPhase('live'); };
  const stop = () => setPhase('review');
  const mark = () => setConfusions(prev => [...prev, { at: elapsed, note: '' }]);

  /* ── SETUP ── */
  if (phase === 'setup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <TopBar breadcrumb={
          <>
            <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '4px 8px' }}>
              <Icon name="chevronLeft" size={13} /> Back
            </button>
            <Icon name="chevronRight" size={12} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>New capture</span>
          </>
        }>
          <span className="chip"><Icon name="clock" size={11} /> Mic check ok</span>
        </TopBar>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Capture</span>
              <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
                Ready when you are.
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55, maxWidth: 480 }}>
                Hit record before class starts. Mark moments of confusion with a tap — we&apos;ll loop the transcript back to those exact seconds later.
              </p>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <RecordRow icon="book" label="Course" >
                <select value={courseId} onChange={e => setCourseId(e.target.value)} style={RecS.select}>
                  {COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </RecordRow>
              <RecordRow icon="mic" label="Source">
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Built-in microphone · 16kbps mono</span>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11.5 }}>Change</button>
              </RecordRow>
              <RecordRow icon="brain" label="On stop">
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Transcribe → Cornell → Cards → Quiz</span>
                <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>
                  <Icon name="sparkle" size={10} /> Auto
                </span>
              </RecordRow>
              <RecordRow icon="flag" label="Confusion shortcut" last>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Tap the lime ring, or press</span>
                <span className="kbd">Space</span>
              </RecordRow>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={start} style={RecS.bigStart}>
                <span style={RecS.bigStartDot} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, lineHeight: 1.1 }}>Start recording</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.7, marginTop: 2 }}>Hold ⌥ to start with screen capture</span>
                </span>
                <Icon name="arrowRight" size={16} />
              </button>
              <button className="btn"><Icon name="upload" size={13} /> Upload audio</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── LIVE ── */
  if (phase === 'live') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-sunken)' }}>
        <TopBar breadcrumb={
          <>
            <span style={{ ...RecS.recPulseDot }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rec-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live</span>
            <span style={{ color: 'var(--text-faint)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtTime(elapsed)}</span>
          </>
        }>
          <span className="chip">{confusions.length} confusion{confusions.length === 1 ? '' : 's'} flagged</span>
          <button className="btn" onClick={stop}><Icon name="square" size={12} /> Stop &amp; review</button>
        </TopBar>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
          {/* CANVAS */}
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* faint clock */}
            <div style={{ position: 'absolute', top: 32, left: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)', letterSpacing: '0.05em' }}>
              {COURSES.find(c => c.id === courseId)?.code} · live capture · {fmtTime(elapsed)}
            </div>

            {/* big timer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginTop: -40 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 96,
                fontWeight: 300,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtTime(elapsed)}
              </div>
              <Waveform levels={levels} />
            </div>

            {/* confusion ring */}
            <button onClick={mark} onKeyDown={e => { if (e.key === ' ') mark(); }} style={RecS.confusionRing} aria-label="Mark confusion">
              <div style={RecS.confusionRingInner}>
                <Icon name="question" size={26} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
                  Flag&nbsp;moment
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 2 }}>{confusions.length} marked</span>
              </div>
            </button>
          </div>

          {/* TRANSCRIPT RIBBON */}
          <aside style={{ background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live transcript</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--good)' }} /> 2s behind
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleSnippets.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-soft)', fontStyle: 'italic' }}>Listening…</p>
              )}
              {visibleSnippets.map((s, i) => {
                const isLatest = i === visibleSnippets.length - 1;
                return (
                  <div key={s.at} style={{ opacity: isLatest ? 1 : 0.5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)', letterSpacing: '0.04em' }}>
                      {fmtTime(s.at)}
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, margin: '2px 0 0', fontWeight: isLatest ? 500 : 400 }}>
                      {s.t}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Flagged moments</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--confuse)' }}>{confusions.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {confusions.length === 0 && <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: 0 }}>Press the lime ring whenever something stops making sense.</p>}
                {confusions.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--confuse-soft)', borderRadius: 6 }}>
                    <Icon name="flag" size={11} style={{ color: 'var(--confuse)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)' }}>{fmtTime(c.at)}</span>
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

  /* ── REVIEW ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumb={
        <>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Review capture</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(elapsed)}</span>
        </>
      }>
        <button className="btn" onClick={() => setPhase('setup')}>Discard</button>
        <button className="btn"><Icon name="download" size={13} /> Save audio only</button>
        <button className="btn btn-accent" onClick={() => onComplete()}>
          <Icon name="sparkle" size={13} /> Process &amp; open
        </button>
      </TopBar>
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>That sounded clean.</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {Math.floor(elapsed / 60)} min captured · {confusions.length} confusion marker{confusions.length === 1 ? '' : 's'} · ready for the AI pipeline.
          </p>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pipeline</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
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
                <Toggle label="Auto-organize into course" sub="Suggested folder · Cognitive Neuroscience" on />
                <Toggle label="Push to Notion" sub="Not connected — connect from settings" />
                <Toggle label="Research mode" sub="Look up confusion markers in background" on />
                <Toggle label="Email yourself a recap" sub="Tomorrow morning · 8am" />
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--bg-sunken)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icon name="flag" size={14} style={{ color: 'var(--confuse)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Confusion timeline</span>
            </div>
            <ConfusionTimeline confusions={confusions.length ? confusions : [{ at: 712 }, { at: 1402 }, { at: 1690 }]} duration={elapsed || 2070} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Waveform({ levels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 80 }}>
      {levels.map((l, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 3,
            height: `${Math.max(6, l * 80)}px`,
            background: i === levels.length - 1 ? 'var(--rec-deep)' : 'var(--text-soft)',
            borderRadius: 2,
            opacity: 0.35 + l * 0.65,
            transition: 'height 90ms linear',
          }}
        />
      ))}
    </div>
  );
}

function RecordRow({ icon, label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: last ? 0 : '1px solid var(--border-subtle)',
    }}>
      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Icon name={icon} size={14} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 500, width: 140 }}>{label}</span>
      {children}
    </div>
  );
}

function Stage({ label, terminal }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: terminal ? 'var(--text)' : 'var(--bg-sunken)', color: terminal ? 'var(--bg)' : 'var(--text-muted)', fontSize: 11, fontWeight: 500, border: '1px solid var(--border)' }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: terminal ? 'var(--rec)' : 'var(--text-soft)' }} />
      {label}
    </div>
  );
}
function Connector() {
  return <div style={{ width: 14, height: 1, background: 'var(--border)' }} />;
}

function Toggle({ label, sub, on }) {
  const [active, setActive] = useState(!!on);
  return (
    <button
      onClick={() => setActive(a => !a)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 12, border: '1px solid var(--border)',
        borderRadius: 8, background: 'var(--bg-elev)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{sub}</span>
      </div>
      <span style={{
        width: 28, height: 16, borderRadius: 99,
        background: active ? 'var(--text)' : 'var(--border-strong)',
        position: 'relative', flexShrink: 0,
        transition: 'background 100ms',
      }}>
        <span style={{
          width: 12, height: 12, borderRadius: 99,
          background: 'var(--bg)',
          position: 'absolute',
          top: 2, left: active ? 14 : 2,
          transition: 'left 120ms',
        }} />
      </span>
    </button>
  );
}

function ConfusionTimeline({ confusions, duration }) {
  return (
    <div style={{ position: 'relative', height: 36, background: 'var(--bg-elev)', borderRadius: 6, border: '1px solid var(--border)', padding: '0 8px' }}>
      <div style={{ position: 'absolute', inset: '50% 8px auto', height: 1, background: 'var(--border-strong)' }} />
      {confusions.map((c, i) => {
        const pct = (c.at / duration) * 100;
        return (
          <div key={i} style={{
            position: 'absolute', left: `calc(${pct}% + 4px)`, top: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            transform: 'translateX(-50%)',
          }}>
            <div style={{ width: 1, height: 10, background: 'var(--confuse)' }} />
            <Icon name="flag" size={10} style={{ color: 'var(--confuse)' }} />
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtTime(c.at)}</span>
          </div>
        );
      })}
    </div>
  );
}

const RecS = {
  select: {
    flex: 1,
    fontSize: 12.5,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
  },
  bigStart: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    padding: '14px 18px',
    background: 'var(--text)',
    color: 'var(--bg)',
    border: 0,
    borderRadius: 10,
    cursor: 'pointer',
  },
  bigStartDot: {
    width: 10, height: 10, borderRadius: 99,
    background: 'var(--rec)',
    boxShadow: '0 0 0 4px rgba(212, 240, 0, 0.25)',
    flexShrink: 0,
  },
  recPulseDot: {
    width: 8, height: 8, borderRadius: 99,
    background: 'var(--rec-deep)',
    boxShadow: '0 0 0 3px var(--bg-sunken), 0 0 0 5px var(--rec)',
    animation: 'rec-pulse 1.6s ease-in-out infinite',
  },
  confusionRing: {
    position: 'absolute', bottom: 32, right: 32,
    width: 120, height: 120, borderRadius: 99,
    background: 'var(--bg-elev)',
    border: '1.5px solid var(--rec-deep)',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 0 0 8px rgba(212, 240, 0, 0.18), 0 12px 30px rgba(0,0,0,0.08)',
    color: 'var(--text)',
    transition: 'transform 100ms',
  },
  confusionRingInner: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderRadius: 99,
  },
};

window.Record = Record;
