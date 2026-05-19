/* global React, Icon, PSData, TopBar, fmtTime, fmtDate */

const { useState, useEffect, useMemo, useRef } = React;

/* ──────────────── DASHBOARD ──────────────── */
function Dashboard({ activeCourseId, setActiveCourseId, onOpenLecture, onStartRecord, density }) {
  const { LECTURES, COURSES } = window.PSData;
  const activeCourse = COURSES.find(c => c.id === activeCourseId);
  const scoped = useMemo(() => {
    if (!activeCourseId) return LECTURES;
    return LECTURES.filter(l => l.courseId === activeCourseId);
  }, [activeCourseId, LECTURES]);

  const totalDuration = scoped.reduce((n, l) => n + l.duration, 0);
  const totalCards = scoped.reduce((n, l) => n + l.flashcards, 0);
  const totalConfusions = scoped.reduce((n, l) => n + l.confusions, 0);
  const quizzed = scoped.filter(l => l.quizScore != null);
  const avgScore = quizzed.length ? quizzed.reduce((n, l) => n + l.quizScore, 0) / quizzed.length : 0;
  const continueL = [...scoped].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
            <Icon name="chevronRight" size={12} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              {activeCourse ? activeCourse.name : 'All lectures'}
            </span>
          </>
        }
      >
        <button className="btn"><Icon name="filter" size={13} /> Filter</button>
        <button className="btn"><Icon name="upload" size={13} /> Import audio</button>
        <button className="btn btn-accent" onClick={onStartRecord}><Icon name="mic" size={13} /> Record</button>
      </TopBar>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 60px' }}>
          {/* hero */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: 0 }}>
              {activeCourse ? `${activeCourse.code} · ${activeCourse.instructor}` : 'Tuesday, May 18'}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: density === 'cozy' ? 56 : 44,
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              margin: '6px 0 0',
            }}>
              {activeCourse ? activeCourse.name : 'Welcome back, Ari.'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, maxWidth: 580 }}>
              {scoped.length} lectures · {Math.round(totalDuration / 3600)} hours captured · {totalCards} cards waiting · {totalConfusions} unresolved questions.
            </p>
          </div>

          {/* stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            <Stat label="Lectures" value={scoped.length} sub="this term" />
            <Stat label="Cards mastered" value="38%" sub={`of ${totalCards} cards`} accent="var(--accent)" progress={0.38} />
            <Stat label="Avg. quiz" value={quizzed.length ? `${Math.round(avgScore * 100)}%` : '—'} sub={`${quizzed.length} taken`} accent="var(--good)" progress={avgScore} />
            <Stat label="Open questions" value={totalConfusions} sub="needs research" accent="var(--confuse)" />
          </div>

          {/* continue + record */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 32 }}>
            {continueL && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>
                    <Icon name="bolt" size={11} />
                    Continue
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                    Last opened {fmtDate(continueL.date)} · {continueL.durationLabel} · {continueL.readMins} min read
                  </span>
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  fontWeight: 400,
                  margin: '4px 0 2px',
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                }} onClick={() => onOpenLecture(continueL.id)}>{continueL.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{continueL.subtitle}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={() => onOpenLecture(continueL.id)}>
                    Resume reading <Icon name="arrowRight" size={13} />
                  </button>
                  <button className="btn">Open cards</button>
                  <button className="btn">Quiz</button>
                  <span style={{ flex: 1 }} />
                  <Progress value={0.62} label="62% through" />
                </div>
              </div>
            )}

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-sunken)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Capture</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Heading into class?</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Start the recorder before you sit down — we keep a 16kbps mono capture and stream it to the AI as soon as you stop.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                <button className="btn btn-accent" onClick={onStartRecord} style={{ flex: 1, justifyContent: 'center' }}>
                  <Icon name="mic" size={13} /> Start recording
                </button>
                <button className="btn"><Icon name="upload" size={13} /></button>
              </div>
            </div>
          </div>

          {/* lecture table */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>Recent lectures</h3>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--text-soft)' }}>
              <button className="btn btn-ghost" style={{ padding: '3px 6px' }}>Sort: Recent</button>
              <span>·</span>
              <button className="btn btn-ghost" style={{ padding: '3px 6px' }}>View: Table</button>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
            <div style={DS.tableRow}>
              <div style={DS.tableHeadCell('40%')}>Lecture</div>
              <div style={DS.tableHeadCell('15%')}>Course</div>
              <div style={DS.tableHeadCell('11%')}>Captured</div>
              <div style={DS.tableHeadCell('10%', 'right')}>Duration</div>
              <div style={DS.tableHeadCell('10%', 'right')}>Cards</div>
              <div style={DS.tableHeadCell('14%', 'right')}>Quiz</div>
            </div>
            {scoped.map(l => {
              const course = COURSES.find(c => c.id === l.courseId);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onOpenLecture(l.id)}
                  style={DS.tableLectureRow}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={DS.tableCell('40%')}>
                    <Icon name={l.starred ? 'starFill' : 'star'} size={13} style={{ color: l.starred ? 'var(--confuse)' : 'var(--text-faint)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.subtitle}</span>
                    </div>
                    {l.confusions > 0 && (
                      <span className="chip" style={{
                        background: 'var(--confuse-soft)', color: 'var(--confuse)', borderColor: 'transparent',
                        fontSize: 10, padding: '2px 6px',
                      }}>
                        <Icon name="flag" size={9} /> {l.confusions}
                      </span>
                    )}
                  </div>
                  <div style={DS.tableCell('15%')}>
                    {course && (
                      <span className="chip" style={{ background: 'transparent' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 2, background: course.color }} />
                        {course.code}
                      </span>
                    )}
                  </div>
                  <div style={DS.tableCell('11%')}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(l.date)}</span>
                  </div>
                  <div style={{ ...DS.tableCell('10%'), justifyContent: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {l.durationLabel}
                  </div>
                  <div style={{ ...DS.tableCell('10%'), justifyContent: 'flex-end', fontSize: 12, color: 'var(--text-muted)' }}>
                    {l.flashcards}
                  </div>
                  <div style={{ ...DS.tableCell('14%'), justifyContent: 'flex-end' }}>
                    {l.quizScore == null
                      ? <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>
                      : <QuizPill score={l.quizScore} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent = 'var(--text)', progress }) {
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: accent, fontFeatureSettings: '"tnum"' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</span>
      {progress != null && (
        <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: '100%', background: accent }} />
        </div>
      )}
    </div>
  );
}

function Progress({ value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)' }}>
      <div style={{ width: 80, height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', background: 'var(--accent)' }} />
      </div>
      {label}
    </div>
  );
}

function QuizPill({ score }) {
  const color = score >= 0.8 ? 'var(--good)' : score >= 0.6 ? 'var(--confuse)' : 'var(--bad)';
  const bg = score >= 0.8 ? 'var(--good-soft)' : score >= 0.6 ? 'var(--confuse-soft)' : 'var(--bad-soft)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4,
      background: bg, color, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
    }}>
      {Math.round(score * 100)}%
    </span>
  );
}

const DS = {
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 14px',
    background: 'var(--bg-sunken)',
    borderBottom: '1px solid var(--border)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-soft)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  tableHeadCell: (w, align = 'left') => ({
    width: w,
    textAlign: align,
  }),
  tableLectureRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'transparent',
    border: 0,
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--text)',
    transition: 'background 80ms',
  },
  tableCell: (w) => ({
    width: w,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  }),
};

window.Dashboard = Dashboard;
window.QuizPill = QuizPill;
