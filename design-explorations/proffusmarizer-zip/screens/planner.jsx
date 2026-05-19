/* global React, Icon, PSData, TopBar, fmtDate */
const { useState, useMemo } = React;

/* Mock generated plan output */
const MOCK_PLAN = {
  title: 'Cognitive Neuroscience · Midterm review',
  generatedAt: '2026-05-18T16:42:00Z',
  for: 'Midterm · May 28',
  totalMins: 320,
  sessions: [
    {
      day: 'Today',
      date: 'Tue · May 19',
      mins: 60,
      blocks: [
        { type: 'review', what: 'Re-read Cornell notes', target: 'The Default Mode Network', mins: 15, priority: 'high' },
        { type: 'cards',  what: 'Flashcards (active recall)', target: '8 cards · DMN', mins: 15 },
        { type: 'cards',  what: 'Flashcards', target: '12 cards · Synaptic Plasticity', mins: 20 },
        { type: 'quiz',   what: 'Quiz', target: '5 questions · DMN', mins: 10 },
      ],
    },
    {
      day: 'Tomorrow',
      date: 'Wed · May 20',
      mins: 75,
      blocks: [
        { type: 'read',   what: 'Read paper', target: 'Raichle 2001 — methods + fig 1–3 only', mins: 25 },
        { type: 'cards',  what: 'Flashcards (mixed)', target: '20 cards · DMN + Plasticity', mins: 20, priority: 'high' },
        { type: 'office', what: 'Office hours prep', target: 'Bring 3 confusion flags', mins: 10 },
        { type: 'quiz',   what: 'Quiz', target: '5 questions · Plasticity', mins: 20 },
      ],
    },
    {
      day: 'Thursday',
      date: 'Thu · May 21',
      mins: 60,
      blocks: [
        { type: 'review', what: 'Cornell notes', target: 'The Visual Cortex', mins: 15 },
        { type: 'cards',  what: 'Flashcards', target: '9 cards · V1', mins: 15 },
        { type: 'cards',  what: 'Spaced re-review', target: '14 cards · DMN (interleaved)', mins: 15, priority: 'high' },
        { type: 'write',  what: 'One-page synthesis', target: 'Compare DMN ↔ Task-positive network', mins: 15 },
      ],
    },
    {
      day: 'Weekend',
      date: 'Sat · May 23',
      mins: 80,
      blocks: [
        { type: 'practice', what: 'Practice exam', target: 'All 3 lectures · full quiz set', mins: 30, priority: 'high' },
        { type: 'cards', what: 'Final card sweep', target: '29 cards · all topics', mins: 30 },
        { type: 'write', what: 'Cheat-sheet build', target: 'One-page mind map of DMN', mins: 20 },
      ],
    },
    {
      day: 'Day before',
      date: 'Wed · May 27',
      mins: 45,
      blocks: [
        { type: 'review',   what: 'Last pass', target: 'Read summaries only', mins: 20 },
        { type: 'practice', what: 'Mock test', target: 'Time-boxed · 15 questions', mins: 25, priority: 'high' },
      ],
    },
  ],
  emphasis: [
    { topic: 'Default Mode Network',    pct: 0.40, why: 'Most confusion flags, central to midterm' },
    { topic: 'Synaptic Plasticity',     pct: 0.32, why: 'Last quiz score 80% — solid but worth reinforcing' },
    { topic: 'Visual Cortex',           pct: 0.18, why: 'Strong quiz performance, light review only' },
    { topic: 'Cross-topic synthesis',   pct: 0.10, why: 'High-yield for short-answer questions' },
  ],
};

const TYPE_META = {
  review:   { color: '#5b5bd6', icon: 'book',  label: 'Review' },
  cards:    { color: '#16a34a', icon: 'cards', label: 'Cards' },
  quiz:     { color: '#f59e0b', icon: 'check', label: 'Quiz' },
  read:     { color: '#0ea5e9', icon: 'book',  label: 'Read' },
  office:   { color: '#db2777', icon: 'message', label: 'Office' },
  write:    { color: '#7c3aed', icon: 'list',  label: 'Write' },
  practice: { color: '#dc2626', icon: 'zap',   label: 'Practice' },
};

function Planner({ onBack }) {
  const { COURSES, LECTURES } = window.PSData;
  const [phase, setPhase] = useState('plan'); // setup | generating | plan
  const [courseId, setCourseId] = useState('c1');
  const courseLectures = useMemo(
    () => LECTURES.filter(l => l.courseId === courseId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [LECTURES, courseId]
  );
  const [selected, setSelected] = useState(() => new Set(courseLectures.slice(0, 4).map(l => l.id)));
  const [mats, setMats] = useState({ summary: true, cornell: true, cards: true, quiz: true });
  const [deadline, setDeadline] = useState('2026-05-28');
  const [intensity, setIntensity] = useState('balanced'); // light | balanced | crash

  const course = COURSES.find(c => c.id === courseId);
  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const generate = () => {
    setPhase('generating');
    setTimeout(() => setPhase('plan'), 1100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar breadcrumb={
        <>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onBack}>
            <Icon name="chevronLeft" size={13} /> Back
          </button>
          <Icon name="chevronRight" size={11} style={{ color: 'var(--text-faint)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Study Planner</span>
          {phase === 'plan' && <>
            <Icon name="chevronRight" size={11} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{MOCK_PLAN.title}</span>
          </>}
        </>
      }>
        {phase === 'plan' && (
          <>
            <button className="btn" onClick={() => setPhase('setup')}><Icon name="settings" size={13} /> Refine</button>
            <button className="btn"><Icon name="calendar" size={13} /> Add to calendar</button>
            <button className="btn btn-accent"><Icon name="bookmark" size={13} /> Save plan</button>
          </>
        )}
      </TopBar>

      {phase === 'setup' && (
        <PlannerSetup
          course={course} COURSES={COURSES} setCourseId={setCourseId}
          lectures={courseLectures} selected={selected} toggle={toggle}
          mats={mats} setMats={setMats}
          intensity={intensity} setIntensity={setIntensity}
          deadline={deadline} setDeadline={setDeadline}
          onGenerate={generate}
        />
      )}
      {phase === 'generating' && <PlannerGenerating />}
      {phase === 'plan' && <PlannerOutput plan={MOCK_PLAN} course={course} />}
    </div>
  );
}

/* ───────── SETUP ───────── */
function PlannerSetup({ course, COURSES, setCourseId, lectures, selected, toggle, mats, setMats, intensity, setIntensity, deadline, setDeadline, onGenerate }) {
  const canGo = selected.size > 0 && Object.values(mats).some(Boolean);
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            New plan
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', margin: '6px 0 6px' }}>
            Build a study plan
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, maxWidth: 580, lineHeight: 1.55 }}>
            Pick a course folder, the lectures you want included, and what to study from each. The planner balances spacing, confusion flags, and your quiz history.
          </p>
        </div>

        {/* STEP 1: COURSE */}
        <Step n="1" title="Course folder">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {COURSES.map(c => (
              <button key={c.id} onClick={() => setCourseId(c.id)} style={{
                padding: '12px 14px', textAlign: 'left',
                background: course?.id === c.id ? 'var(--accent-soft)' : 'var(--bg-elev)',
                border: `1px solid ${course?.id === c.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)',
              }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                    {c.code} · {c.lecturesCount} lectures
                  </div>
                </div>
                {course?.id === c.id && <Icon name="check" size={14} style={{ color: 'var(--accent)' }} stroke={2.2} />}
              </button>
            ))}
          </div>
        </Step>

        {/* STEP 2: LECTURES */}
        <Step n="2" title="Lectures to include"
          right={
            <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
              <span style={{ color: 'var(--text-soft)' }}>{selected.size} / {lectures.length} selected</span>
            </div>
          }
        >
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-elev)', overflow: 'hidden' }}>
            {lectures.length === 0 && (
              <p style={{ padding: 16, fontSize: 13, color: 'var(--text-soft)' }}>No lectures filed under this course.</p>
            )}
            {lectures.map((l, i) => (
              <label key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i === lectures.length - 1 ? 0 : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: selected.has(l.id) ? 'var(--bg-sunken)' : 'transparent',
              }}>
                <Checkbox checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{fmtDate(l.date)} · {l.durationLabel} · {l.flashcards} cards · {l.confusions} flags</div>
                </div>
                {l.quizScore != null && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '2px 6px', borderRadius: 4,
                    background: l.quizScore >= 0.8 ? 'var(--good-soft)' : 'var(--confuse-soft)',
                    color: l.quizScore >= 0.8 ? 'var(--good)' : 'var(--confuse)',
                  }}>{Math.round(l.quizScore * 100)}%</span>
                )}
              </label>
            ))}
          </div>
        </Step>

        {/* STEP 3: MATERIALS */}
        <Step n="3" title="Materials to study">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { k: 'summary', label: 'Summaries', desc: 'Overview and takeaways', icon: 'list' },
              { k: 'cornell', label: 'Cornell notes', desc: 'Cue rows and synthesis', icon: 'book' },
              { k: 'cards', label: 'Flashcards', desc: 'Spaced active recall', icon: 'cards' },
              { k: 'quiz', label: 'Quizzes', desc: 'MCQ + explanations', icon: 'check' },
            ].map(m => (
              <label key={m.k} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                background: mats[m.k] ? 'var(--bg-elev)' : 'var(--bg-sunken)',
                border: `1px solid ${mats[m.k] ? 'var(--border)' : 'var(--border)'}`,
                opacity: mats[m.k] ? 1 : 0.65,
                borderRadius: 8, cursor: 'pointer',
              }}>
                <Checkbox checked={mats[m.k]} onChange={() => setMats(p => ({ ...p, [m.k]: !p[m.k] }))} />
                <Icon name={m.icon} size={14} style={{ color: 'var(--text-muted)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Step>

        {/* STEP 4: SHAPE */}
        <Step n="4" title="Shape of the plan">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 14, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Deadline</div>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{
                width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: 12.5, outline: 'none',
              }} />
              <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: '8px 0 0' }}>Plan ends the day before — buffer for rest.</p>
            </div>
            <div style={{ padding: 14, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Intensity</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { k: 'light', label: 'Light', sub: '~30 min/day' },
                  { k: 'balanced', label: 'Balanced', sub: '~60 min/day' },
                  { k: 'crash', label: 'Crash', sub: '~2h/day' },
                ].map(p => (
                  <button key={p.k} onClick={() => setIntensity(p.k)} style={{
                    flex: 1, padding: '6px 8px',
                    background: intensity === p.k ? 'var(--text)' : 'var(--bg-sunken)',
                    color: intensity === p.k ? 'var(--bg)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <span style={{ fontSize: 12 }}>{p.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Step>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <button
            disabled={!canGo}
            onClick={onGenerate}
            className="btn btn-accent"
            style={{ padding: '10px 18px', fontSize: 13, opacity: canGo ? 1 : 0.5 }}
          >
            <Icon name="sparkle" size={14} />
            Generate study plan
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
            {selected.size} lecture{selected.size === 1 ? '' : 's'} · {Object.values(mats).filter(Boolean).length} material types · {intensity} intensity
          </span>
          <span style={{ flex: 1 }} />
          <button className="btn btn-ghost">Save preset</button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, right, children }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 99, background: 'var(--bg-sunken)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>{n}</span>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{title}</h3>
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </section>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button onClick={onChange} style={{
      width: 16, height: 16, flexShrink: 0,
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 4,
      background: checked ? 'var(--accent)' : 'transparent',
      color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0,
    }}>
      {checked && <Icon name="check" size={11} stroke={2.5} />}
    </button>
  );
}

/* ───────── GENERATING ───────── */
function PlannerGenerating() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--bg-sunken)' }}>
      <div style={{ maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 99,
          border: '3px solid var(--bg-elev)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.9s linear infinite',
        }} />
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>Building your plan…</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
          Weighting lectures by confusion flags and quiz history. Spacing for retention. Reserving the day before for rest.
        </p>
      </div>
    </div>
  );
}

/* ───────── OUTPUT ───────── */
function PlannerOutput({ plan, course }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 80px' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: course?.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
                {course?.code} · {plan.for}
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em',
              lineHeight: 1.05, margin: 0,
            }}>{plan.title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              {plan.sessions.length} sessions · {Math.round(plan.totalMins / 60 * 10) / 10}h total · generated just now
            </p>
          </div>
          <div className="card" style={{ minWidth: 220, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, letterSpacing: '0.02em' }}>Time to deadline</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>9 days</span>
            <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: '35%', height: '100%', background: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>~36 min/day average</span>
          </div>
        </div>

        {/* EMPHASIS */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.02em' }}>Topic emphasis</h3>
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* bar */}
            <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--bg-sunken)' }}>
              {plan.emphasis.map((e, i) => (
                <span key={i} title={`${e.topic} · ${Math.round(e.pct * 100)}%`} style={{
                  width: `${e.pct * 100}%`,
                  background: ['var(--accent)', 'var(--good)', 'var(--confuse)', 'var(--text-soft)'][i],
                }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {plan.emphasis.map((e, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: ['var(--accent)', 'var(--good)', 'var(--confuse)', 'var(--text-soft)'][i] }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{e.topic}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{Math.round(e.pct * 100)}%</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: 0, lineHeight: 1.4 }}>{e.why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SESSIONS as horizontal timeline */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>Schedule</h3>
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{plan.sessions.length} sessions across 9 days</span>
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>List view</button>
              <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}>Timeline view</button>
            </div>
          </div>
          {/* spine */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${plan.sessions.length}, 1fr)`, gap: 12 }}>
            {plan.sessions.map((s, i) => (
              <SessionCard key={i} session={s} index={i} isFirst={i === 0} isLast={i === plan.sessions.length - 1} />
            ))}
          </div>
        </section>

        {/* FOOTNOTE */}
        <div style={{ marginTop: 24, padding: 14, background: 'var(--accent-soft)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="sparkle" size={16} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)', margin: 0 }}>How this plan was built</p>
            <p style={{ fontSize: 12, color: 'var(--accent-text)', margin: '4px 0 0', lineHeight: 1.55, opacity: 0.85 }}>
              DMN gets the most weight — it has the most confusion flags and is densest in the syllabus. Cards are interleaved across topics for retention. Practice exams are reserved for the weekend and day-before. Saturday is your highest-energy day from past usage data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, index }) {
  return (
    <article style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <header style={{
        padding: '10px 12px',
        background: index === 0 ? 'var(--accent-soft)' : 'var(--bg-sunken)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: index === 0 ? 'var(--accent-text)' : 'var(--text)' }}>{session.day}</span>
          {index === 0 && <span className="chip" style={{ fontSize: 9, padding: '1px 5px', background: 'var(--accent)', color: 'white', borderColor: 'transparent' }}>NOW</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-soft)' }}>{session.date}</span>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)' }}>{session.mins} min</span>
        </div>
      </header>
      <div style={{ padding: '6px 6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {session.blocks.map((b, i) => {
          const meta = TYPE_META[b.type] || TYPE_META.review;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: b.priority === 'high' ? 'var(--bg-sunken)' : 'transparent',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                background: `${meta.color}22`,
                color: meta.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={meta.icon} size={11} stroke={2} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{b.what}</span>
                  {b.priority === 'high' && <Icon name="bolt" size={10} style={{ color: 'var(--confuse)' }} stroke={2.2} />}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: '1px 0 0', lineHeight: 1.4 }}>{b.target}</p>
              </div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-soft)', flexShrink: 0, paddingTop: 1 }}>{b.mins}m</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

window.Planner = Planner;
