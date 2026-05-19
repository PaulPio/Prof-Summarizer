/* global React, Icon, PSData, TopBar, fmtTime, fmtDate */
const { useState, useMemo } = React;

/* ════════════════════════════════════════════════════════════════
   SAVED — bookmark library across lectures
   Mixed feed: starred lectures, pinned Cornell rows, transcript
   clips, custom flashcards, missed quiz questions.
═══════════════════════════════════════════════════════════════ */

const SAVED_ITEMS = [
  {
    id: 's1', kind: 'lecture', at: '2026-05-14T10:00:00Z',
    lecture: 'l1',
    title: 'The Default Mode Network',
    sub: 'Cognitive Neuroscience · 34:30 · 8 cards',
    note: 'Starred — central to midterm.',
    accent: 'starred',
  },
  {
    id: 's2', kind: 'cornell-row', at: '2026-05-14T11:32:00Z',
    lecture: 'l1', lectureTitle: 'The Default Mode Network',
    cue: 'PCC + mPFC hubs',
    body: 'Core hubs: posterior cingulate cortex (PCC), medial prefrontal cortex (mPFC), angular gyrus, hippocampus. Hub damage \u2192 disproportionate network collapse.',
    timestamp: 884,
  },
  {
    id: 's3', kind: 'clip', at: '2026-05-14T11:48:00Z',
    lecture: 'l1', lectureTitle: 'The Default Mode Network',
    quote: 'And these hubs are like the airports of the brain — lose one, and traffic everywhere gets disrupted.',
    timestamp: 1010,
    durationSec: 14,
  },
  {
    id: 's4', kind: 'card', at: '2026-05-15T09:11:00Z',
    lecture: 'l1', lectureTitle: 'The Default Mode Network',
    term: 'Why is anti-correlation important?',
    def: 'It is the signature of healthy switching between internal (DMN) and external (TPN) cognitive modes.',
    custom: true,
  },
  {
    id: 's5', kind: 'missed-question', at: '2026-05-13T17:42:00Z',
    lecture: 'l4', lectureTitle: 'Consensus under Partial Failure',
    q: 'In Raft, what happens to the leader\u2019s log entries that are uncommitted when a new leader is elected?',
    yourAnswer: 'They are committed by the new leader',
    correctAnswer: 'They are overwritten by the new leader\u2019s log',
    explanation: 'Only the new leader\u2019s log is authoritative; conflicting uncommitted entries from the old leader are overwritten.',
  },
  {
    id: 's6', kind: 'lecture', at: '2026-05-13T14:00:00Z',
    lecture: 'l4',
    title: 'Consensus under Partial Failure',
    sub: 'Distributed Systems · 55:00 · 14 cards',
    note: 'Re-listen to Raft section.',
    accent: 'starred',
  },
  {
    id: 's7', kind: 'cornell-row', at: '2026-05-09T16:20:00Z',
    lecture: 'l2', lectureTitle: 'Synaptic Plasticity, Part II',
    cue: 'CaMKII autophosphorylation',
    body: 'CaMKII becomes self-sustaining via autophosphorylation at Thr286 — this is one molecular substrate of LTP persistence beyond the initial Ca²⁺ signal.',
    timestamp: 1820,
  },
  {
    id: 's8', kind: 'clip', at: '2026-05-09T16:32:00Z',
    lecture: 'l2', lectureTitle: 'Synaptic Plasticity, Part II',
    quote: 'Memory is not stored in a single synapse. Memory is the pattern of which synapses got stronger together — and that pattern is the engram.',
    timestamp: 2190,
    durationSec: 19,
  },
  {
    id: 's9', kind: 'card', at: '2026-05-09T16:48:00Z',
    lecture: 'l2', lectureTitle: 'Synaptic Plasticity, Part II',
    term: 'What is an engram?',
    def: 'The physical trace of a memory in the brain — typically a pattern of synaptic weights distributed across a network.',
    custom: false,
  },
  {
    id: 's10', kind: 'cornell-row', at: '2026-05-11T15:10:00Z',
    lecture: 'l5', lectureTitle: 'Fiscal Multipliers',
    cue: 'Liquidity trap',
    body: 'When nominal rates hit zero and conventional monetary policy loses traction, fiscal multipliers are estimated to be much higher (~1.5–2.5) than in normal times (~0.5–1.0).',
    timestamp: 980,
  },
  {
    id: 's11', kind: 'missed-question', at: '2026-05-11T15:55:00Z',
    lecture: 'l5', lectureTitle: 'Fiscal Multipliers',
    q: 'According to the Keynesian cross, what does the fiscal multiplier equal when the marginal propensity to consume is 0.8?',
    yourAnswer: '4',
    correctAnswer: '5',
    explanation: 'Multiplier = 1 / (1 − MPC) = 1 / 0.2 = 5.',
  },
  {
    id: 's12', kind: 'clip', at: '2026-05-07T11:00:00Z',
    lecture: 'l6', lectureTitle: 'Donne\u2019s Holy Sonnets',
    quote: 'Doubt, in Donne, is not the opposite of faith. Doubt is faith working out loud.',
    timestamp: 1240,
    durationSec: 8,
  },
];

const KINDS = [
  { k: 'all',       label: 'All',          icon: 'bookmark' },
  { k: 'lecture',   label: 'Starred',      icon: 'starFill' },
  { k: 'cornell-row', label: 'Cornell rows', icon: 'book' },
  { k: 'clip',      label: 'Audio clips',  icon: 'wave' },
  { k: 'card',      label: 'Flashcards',   icon: 'cards' },
  { k: 'missed-question', label: 'Missed Qs', icon: 'question' },
];

function Saved({ onOpenLecture }) {
  const { LECTURES, COURSES } = window.PSData;
  const [kind, setKind] = useState('all');
  const [view, setView] = useState('grid'); // grid | list
  const [courseFilter, setCourseFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return SAVED_ITEMS.filter(it => {
      if (kind !== 'all' && it.kind !== kind) return false;
      const lec = LECTURES.find(l => l.id === it.lecture);
      if (courseFilter !== 'all' && lec?.courseId !== courseFilter) return false;
      if (search) {
        const hay = JSON.stringify(it).toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [kind, courseFilter, search, LECTURES]);

  const counts = useMemo(() => {
    const c = { all: SAVED_ITEMS.length };
    KINDS.forEach(k => { if (k.k !== 'all') c[k.k] = SAVED_ITEMS.filter(i => i.kind === k.k).length; });
    return c;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar breadcrumb={
        <>
          <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
          <Icon name="chevronRight" size={12} style={{ color: 'var(--text-faint)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Saved</span>
          <span className="chip" style={{ marginLeft: 4 }}>{SAVED_ITEMS.length} items</span>
        </>
      }>
        <button className="btn"><Icon name="download" size={13} /> Export</button>
        <button className="btn"><Icon name="plus" size={13} /> Add manually</button>
      </TopBar>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <nav style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '16px 10px', background: 'var(--bg)' }}>
          <div style={{ padding: '0 6px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {KINDS.map(k => (
              <button key={k.k} onClick={() => setKind(k.k)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px',
                background: kind === k.k ? 'var(--bg-sunken)' : 'transparent',
                border: '1px solid', borderColor: kind === k.k ? 'var(--border)' : 'transparent',
                borderRadius: 6,
                color: kind === k.k ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 12.5, fontWeight: kind === k.k ? 600 : 500,
                textAlign: 'left', cursor: 'pointer',
              }}>
                <Icon name={k.icon} size={14} />
                <span style={{ flex: 1 }}>{k.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>{counts[k.k] ?? 0}</span>
              </button>
            ))}
          </div>

          <div style={{ padding: '20px 6px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Course
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <CourseFilter active={courseFilter === 'all'} onClick={() => setCourseFilter('all')} label="All courses" />
            {COURSES.map(c => (
              <CourseFilter key={c.id} active={courseFilter === c.id} onClick={() => setCourseFilter(c.id)} label={c.name} color={c.color} />
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 10, background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text)' }}>Tip:</strong> in any lecture, hover a Cornell row and press <span className="kbd">S</span> to save it here.
            </p>
          </div>
        </nav>

        {/* MAIN */}
        <main style={{ overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 60px' }}>
            <header style={{ marginBottom: 18 }}>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em',
                margin: 0, lineHeight: 1.05,
              }}>
                {kind === 'all' ? 'Your saved corner' : KINDS.find(k => k.k === kind)?.label}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                {filtered.length} item{filtered.length === 1 ? '' : 's'} · stars, pinned rows, clipped quotes, custom cards.
              </p>
            </header>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your saved items…"
                  style={{
                    width: '100%', padding: '6px 10px 6px 30px',
                    background: 'var(--bg-elev)', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 12.5, outline: 'none',
                  }}
                />
              </div>
              <span style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 1, background: 'var(--bg-sunken)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                <ViewBtn active={view === 'grid'} onClick={() => setView('grid')} icon="grid" />
                <ViewBtn active={view === 'list'} onClick={() => setView('list')} icon="list" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-soft)' }}>
                <Icon name="bookmark" size={24} stroke={1.2} />
                <p style={{ fontSize: 14, margin: '10px 0 0' }}>Nothing matches.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try clearing filters.</p>
              </div>
            ) : view === 'grid' ? (
              <div style={{ columnCount: 3, columnGap: 14 }}>
                {filtered.map(it => <SavedCard key={it.id} item={it} onOpenLecture={onOpenLecture} />)}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
                {filtered.map((it, i) => (
                  <SavedListRow key={it.id} item={it} last={i === filtered.length - 1} onOpenLecture={onOpenLecture} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function CourseFilter({ active, onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 10px',
      background: active ? 'var(--bg-sunken)' : 'transparent',
      border: '1px solid', borderColor: active ? 'var(--border)' : 'transparent',
      borderRadius: 6,
      color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 12, fontWeight: active ? 600 : 500,
      textAlign: 'left', cursor: 'pointer',
    }}>
      {color ? <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} /> : <span style={{ width: 7 }} />}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}

function ViewBtn({ active, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--bg-elev)' : 'transparent',
      border: 0, borderRadius: 4,
      color: active ? 'var(--text)' : 'var(--text-soft)',
      cursor: 'pointer', padding: 0,
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
    }}>
      <Icon name={icon} size={12} />
    </button>
  );
}

/* ── Masonry grid card ── */
function SavedCard({ item, onOpenLecture }) {
  const wrap = {
    breakInside: 'avoid',
    marginBottom: 14,
    border: '1px solid var(--border)',
    borderRadius: 10,
    background: 'var(--bg-elev)',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    transition: 'border-color 100ms',
  };
  const head = (label, color, extra) => (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-sunken)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ flex: 1 }} />
      {extra}
    </div>
  );
  const footer = (item) => (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={() => onOpenLecture?.(item.lecture)} style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon name="link" size={11} /> {item.lectureTitle || item.title || 'lecture'}
      </button>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>{timeAgo(item.at)}</span>
    </div>
  );

  if (item.kind === 'lecture') {
    return (
      <article style={wrap}>
        {head('Starred lecture', 'var(--confuse)', <Icon name="starFill" size={12} style={{ color: 'var(--confuse)' }} />)}
        <div style={{ padding: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, fontWeight: 400, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.15 }}>{item.title}</h3>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '6px 0 0' }}>{item.sub}</p>
          {item.note && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', padding: '6px 8px', borderLeft: '2px solid var(--confuse)', background: 'var(--confuse-soft)' }}>{item.note}</p>}
        </div>
        {footer(item)}
      </article>
    );
  }
  if (item.kind === 'cornell-row') {
    return (
      <article style={wrap}>
        {head('Cornell row', 'var(--accent)', <span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{fmtTime(item.timestamp)}</span>)}
        <div style={{ padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', margin: 0 }}>{item.cue}</p>
          <p style={{ fontSize: 12.5, color: 'var(--text)', margin: '6px 0 0', lineHeight: 1.55 }}>{item.body}</p>
        </div>
        {footer(item)}
      </article>
    );
  }
  if (item.kind === 'clip') {
    return (
      <article style={wrap}>
        {head('Audio clip', '#0ea5e9', <span className="mono" style={{ fontSize: 10, color: '#0ea5e9' }}>{item.durationSec}s @ {fmtTime(item.timestamp)}</span>)}
        <div style={{ padding: 14 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
            &ldquo;{item.quote}&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <button style={{
              width: 24, height: 24, borderRadius: 99,
              background: '#0ea5e9', color: 'white', border: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><Icon name="play" size={11} /></button>
            <div style={{ flex: 1, height: 14, position: 'relative', background: 'var(--bg-sunken)', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 4px', gap: 1 }}>
              {Array.from({ length: 36 }, (_, i) => {
                const v = 0.3 + Math.abs(Math.sin(i * 0.7 + item.id.charCodeAt(1))) * 0.7;
                return <span key={i} style={{ flex: 1, height: `${v * 100}%`, background: '#0ea5e9', opacity: 0.7, borderRadius: 0.5 }} />;
              })}
            </div>
          </div>
        </div>
        {footer(item)}
      </article>
    );
  }
  if (item.kind === 'card') {
    return (
      <article style={wrap}>
        {head('Flashcard', 'var(--good)', item.custom && <span className="chip" style={{ padding: '0 6px', fontSize: 9, background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}>custom</span>)}
        <div style={{ padding: 14 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.3, margin: 0, color: 'var(--text)' }}>{item.term}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.55, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>{item.def}</p>
        </div>
        {footer(item)}
      </article>
    );
  }
  if (item.kind === 'missed-question') {
    return (
      <article style={wrap}>
        {head('Missed quiz Q', 'var(--bad)', <Icon name="x" size={11} style={{ color: 'var(--bad)' }} stroke={2.4} />)}
        <div style={{ padding: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.45 }}>{item.q}</p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bad-soft)', borderRadius: 4 }}>
              <Icon name="x" size={10} style={{ color: 'var(--bad)' }} stroke={2.4} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>You: <span style={{ color: 'var(--text)' }}>{item.yourAnswer}</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--good-soft)', borderRadius: 4 }}>
              <Icon name="check" size={10} style={{ color: 'var(--good)' }} stroke={2.4} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Correct: <span style={{ color: 'var(--text)' }}>{item.correctAnswer}</span></span>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '10px 0 0', lineHeight: 1.55, fontStyle: 'italic' }}>{item.explanation}</p>
        </div>
        {footer(item)}
      </article>
    );
  }
  return null;
}

/* ── List row ── */
function SavedListRow({ item, last, onOpenLecture }) {
  const meta = {
    'lecture': { icon: 'starFill', color: 'var(--confuse)', label: 'Starred' },
    'cornell-row': { icon: 'book', color: 'var(--accent)', label: 'Cornell row' },
    'clip': { icon: 'wave', color: '#0ea5e9', label: 'Audio clip' },
    'card': { icon: 'cards', color: 'var(--good)', label: 'Flashcard' },
    'missed-question': { icon: 'question', color: 'var(--bad)', label: 'Missed Q' },
  }[item.kind];

  let primary = '', secondary = '';
  if (item.kind === 'lecture') { primary = item.title; secondary = item.sub; }
  else if (item.kind === 'cornell-row') { primary = item.cue; secondary = item.body.slice(0, 120) + '…'; }
  else if (item.kind === 'clip') { primary = `"${item.quote.slice(0, 80)}…"`; secondary = `${item.durationSec}s · ${fmtTime(item.timestamp)}`; }
  else if (item.kind === 'card') { primary = item.term; secondary = item.def.slice(0, 100) + '…'; }
  else if (item.kind === 'missed-question') { primary = item.q; secondary = `You answered: ${item.yourAnswer}`; }

  return (
    <div onClick={() => onOpenLecture?.(item.lecture)} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: last ? 0 : '1px solid var(--border-subtle)',
      cursor: 'pointer',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 6,
        background: `${meta.color}1a`, color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={meta.icon} size={13} stroke={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primary}</p>
        <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secondary}</p>
      </div>
      <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{meta.label}</span>
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{timeAgo(item.at)}</span>
    </div>
  );
}

function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

window.Saved = Saved;
