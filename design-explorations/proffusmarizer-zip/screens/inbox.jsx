/* global React, Icon, PSData, TopBar, fmtTime, fmtDate */
const { useState, useMemo } = React;

/* ════════════════════════════════════════════════════════════════
   INBOX — triage queue for AI-driven items
═══════════════════════════════════════════════════════════════ */

const INBOX_ITEMS = [
  {
    id: 'i1',
    kind: 'organize',
    priority: 'high',
    at: '2026-05-18T16:42:00Z',
    title: 'File "The Default Mode Network" under Cognitive Neuroscience',
    sub: 'Auto-Organizer · 96% confidence · matches PSY 312 syllabus week 11',
    lectureId: 'l1',
    actions: ['accept', 'pick-other', 'dismiss'],
    primary: 'Accept',
  },
  {
    id: 'i2',
    kind: 'research',
    priority: 'medium',
    at: '2026-05-18T15:10:00Z',
    title: 'Found 3 sources for "anti-correlation" confusion',
    sub: 'Research Assistant · From your 11:52 flag in DMN lecture',
    lectureId: 'l1',
    detail: ['Fox 2005 — "The human brain is intrinsically organized…" (Nature)', 'Murphy 2009 — "The impact of global signal regression"', 'YouTube · MIT 9.13 (12 min explainer)'],
    actions: ['open', 'attach', 'dismiss'],
    primary: 'Open',
  },
  {
    id: 'i3',
    kind: 'pipeline-fail',
    priority: 'high',
    at: '2026-05-17T22:00:00Z',
    title: 'Pipeline failed: Fiscal Multipliers',
    sub: 'Multi-Step Pipeline · Anthropic rate limit · 1 retry remaining',
    lectureId: 'l5',
    actions: ['retry', 'switch-provider', 'dismiss'],
    primary: 'Retry now',
  },
  {
    id: 'i4',
    kind: 'cards-due',
    priority: 'medium',
    at: '2026-05-18T07:00:00Z',
    title: '14 cards due today',
    sub: 'Spaced repetition · DMN (8) · Plasticity (6) · ~12 min',
    actions: ['study', 'snooze', 'dismiss'],
    primary: 'Study now',
  },
  {
    id: 'i5',
    kind: 'notion',
    priority: 'low',
    at: '2026-05-18T09:30:00Z',
    title: 'Approve Notion push',
    sub: 'CRDTs and Eventual Consistency → Cognitive Sci workspace',
    lectureId: 'l7',
    actions: ['push', 'preview', 'dismiss'],
    primary: 'Push',
  },
  {
    id: 'i6',
    kind: 'transcript-ready',
    priority: 'low',
    at: '2026-05-18T08:11:00Z',
    title: 'Transcript ready: Donne\u2019s Holy Sonnets',
    sub: '47 minutes processed in 22s · 0 confusion flags',
    lectureId: 'l6',
    actions: ['open', 'dismiss'],
    primary: 'Open',
  },
  {
    id: 'i7',
    kind: 'quiz-suggested',
    priority: 'low',
    at: '2026-05-17T16:30:00Z',
    title: 'Quiz suggested: Phillips Curve, Revisited',
    sub: 'You scored 90% — try the harder variant?',
    lectureId: 'l8',
    actions: ['take-quiz', 'dismiss'],
    primary: 'Take quiz',
  },
];

const KIND_META = {
  organize:         { icon: 'layers',   color: 'var(--accent)', label: 'Auto-Organizer' },
  research:         { icon: 'search',   color: '#0ea5e9', label: 'Research' },
  'pipeline-fail':  { icon: 'alert',    color: 'var(--bad)', label: 'Pipeline error' },
  'cards-due':      { icon: 'cards',    color: 'var(--good)', label: 'Cards due' },
  notion:           { icon: 'notion',   color: '#7c3aed', label: 'Notion' },
  'transcript-ready': { icon: 'check',  color: 'var(--text-muted)', label: 'Ready' },
  'quiz-suggested': { icon: 'check',    color: 'var(--confuse)', label: 'Quiz' },
};

function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Inbox({ onOpenLecture }) {
  const [filter, setFilter] = useState('all'); // all | needs | research | study
  const [done, setDone] = useState(() => new Set()); // dismissed/accepted ids
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const visible = INBOX_ITEMS.filter(i => !done.has(i.id));
    if (filter === 'all') return visible;
    if (filter === 'needs') return visible.filter(i => i.priority === 'high');
    if (filter === 'research') return visible.filter(i => i.kind === 'research');
    if (filter === 'study') return visible.filter(i => i.kind === 'cards-due' || i.kind === 'quiz-suggested');
    return visible;
  }, [filter, done]);

  const counts = useMemo(() => {
    const v = INBOX_ITEMS.filter(i => !done.has(i.id));
    return {
      all: v.length,
      needs: v.filter(i => i.priority === 'high').length,
      research: v.filter(i => i.kind === 'research').length,
      study: v.filter(i => i.kind === 'cards-due' || i.kind === 'quiz-suggested').length,
    };
  }, [done]);

  const dismiss = (id) => {
    setDone(d => { const n = new Set(d); n.add(id); return n; });
    if (selected === id) setSelected(null);
  };

  const detail = INBOX_ITEMS.find(i => i.id === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar breadcrumb={
        <>
          <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
          <Icon name="chevronRight" size={12} style={{ color: 'var(--text-faint)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Inbox</span>
          <span className="chip" style={{ marginLeft: 4 }}>{counts.all} open</span>
        </>
      }>
        <button className="btn"><Icon name="check" size={13} /> Mark all read</button>
        <button className="btn"><Icon name="filter" size={13} /> Settings</button>
      </TopBar>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: detail ? '1fr 420px' : '1fr', overflow: 'hidden' }}>
        <main style={{ overflowY: 'auto' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 28px 60px' }}>
            <header style={{ marginBottom: 18 }}>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em',
                margin: 0, lineHeight: 1.05,
              }}>
                {counts.all === 0 ? 'Inbox zero.' : `${counts.all} things waiting on you.`}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                Your AI agents work in the background — anything that needs your decision lands here.
              </p>
            </header>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
              <FilterTab active={filter === 'needs'} onClick={() => setFilter('needs')} label="Needs you" count={counts.needs} dot="var(--bad)" />
              <FilterTab active={filter === 'research'} onClick={() => setFilter('research')} label="Research" count={counts.research} />
              <FilterTab active={filter === 'study'} onClick={() => setFilter('study')} label="Study" count={counts.study} />
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Sort: priority</span>
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-soft)' }}>
                <Icon name="check" size={28} stroke={1.2} />
                <p style={{ fontSize: 14, margin: '10px 0 0' }}>Nothing left here.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>Go capture a lecture, or take a break.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
              {filtered.map((it, i) => (
                <InboxRow key={it.id} item={it}
                  active={selected === it.id}
                  onSelect={() => setSelected(it.id === selected ? null : it.id)}
                  onDismiss={() => dismiss(it.id)}
                  onPrimary={() => { if (it.lectureId) onOpenLecture?.(it.lectureId); dismiss(it.id); }}
                  last={i === filtered.length - 1}
                />
              ))}
            </div>
          </div>
        </main>

        {detail && (
          <aside style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-sunken)' }}>
            <InboxDetail item={detail}
              onClose={() => setSelected(null)}
              onDismiss={() => dismiss(detail.id)}
              onPrimary={() => { if (detail.lectureId) onOpenLecture?.(detail.lectureId); dismiss(detail.id); }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, label, count, dot }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      background: 'transparent', border: 0,
      borderBottom: `2px solid ${active ? 'var(--text)' : 'transparent'}`,
      color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      marginBottom: -7,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: dot }} />}
      {label}
      {count != null && <span style={{
        fontSize: 10.5, padding: '1px 5px', borderRadius: 4,
        background: active ? 'var(--text)' : 'var(--bg-sunken)',
        color: active ? 'var(--bg)' : 'var(--text-soft)',
        fontFamily: 'var(--font-mono)',
      }}>{count}</span>}
    </button>
  );
}

function InboxRow({ item, active, onSelect, onDismiss, onPrimary, last }) {
  const meta = KIND_META[item.kind] || KIND_META.organize;
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: active ? 'var(--bg-sunken)' : 'transparent',
        borderLeft: `2px solid ${active ? meta.color : 'transparent'}`,
        borderBottom: last ? 0 : '1px solid var(--border-subtle)',
        transition: 'background 80ms',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: `${meta.color}1a`, color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={meta.icon} size={14} stroke={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.priority === 'high' && <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--bad)' }} />}
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</p>
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{timeAgo(item.at)}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={e => { e.stopPropagation(); onPrimary(); }}
          className="btn btn-primary"
          style={{ padding: '4px 10px', fontSize: 11.5 }}
        >{item.primary}</button>
        <button
          onClick={e => { e.stopPropagation(); onDismiss(); }}
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          title="Dismiss"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  );
}

function InboxDetail({ item, onClose, onDismiss, onPrimary }) {
  const meta = KIND_META[item.kind] || KIND_META.organize;
  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${meta.color}1a`, color: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={meta.icon} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{meta.label}</span>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '2px 0 0', letterSpacing: '-0.005em' }}>{item.title}</h2>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '4px 0 0' }}>{timeAgo(item.at)}</p>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
      </header>
      <div className="card" style={{ background: 'var(--bg-elev)' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{item.sub}</p>
        {item.detail && (
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.detail.map((d, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-sunken)', borderRadius: 6, fontSize: 12.5, lineHeight: 1.45 }}>
                <Icon name="link" size={12} style={{ color: 'var(--text-soft)', marginTop: 2, flexShrink: 0 }} />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPrimary} className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }}>{item.primary}</button>
        <button onClick={onDismiss} className="btn" style={{ flex: 1, justifyContent: 'center' }}>Dismiss</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-soft)', padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Why this is here</strong>
        {item.kind === 'organize' && 'Auto-Organizer compared the transcript and Cornell topics against your syllabi. It is very confident this lecture belongs in Cognitive Neuroscience week 11.'}
        {item.kind === 'research' && 'You flagged this moment as confusing. Research Assistant searched papers, your library, and YouTube — these are the top three matches.'}
        {item.kind === 'pipeline-fail' && 'The pipeline hit Anthropic\u2019s rate limit mid-summarization. The transcript is safe; only Cornell + cards need to be regenerated.'}
        {item.kind === 'cards-due' && 'Spaced repetition surfaces cards at intervals that maximize retention. Today\u2019s set is balanced across two topics.'}
        {item.kind === 'notion' && 'You enabled "Push to Notion" but kept manual approval on. This will create a page in your Cognitive Sci workspace.'}
        {item.kind === 'transcript-ready' && 'Pipeline finished without any confusion flags or errors. You can read it whenever you\u2019re ready.'}
        {item.kind === 'quiz-suggested' && 'You\u2019ve mastered the basic quiz on this topic — the harder variant uses your weakest distractors as primary options.'}
      </div>
    </div>
  );
}

window.Inbox = Inbox;
