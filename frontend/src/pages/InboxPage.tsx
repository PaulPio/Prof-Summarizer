import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import TopBar from '../components/TopBar';
import type { AgentJob, SavedLecture } from '../types';

type FilterKind = 'all' | 'needs' | 'research' | 'study';
type InboxKind = 'organize' | 'research' | 'pipeline-fail' | 'study-plan' | 'transcript-ready';
type InboxPriority = 'high' | 'medium' | 'low';

interface InboxItem {
  id: string;
  kind: InboxKind;
  priority: InboxPriority;
  at: string;
  title: string;
  sub: string;
  lectureId?: string;
  detail?: string[];
  primary: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  study_planner: 'Study Planner',
  auto_organizer: 'Auto-Organizer',
  research: 'Research Assistant',
  multi_step: 'Multi-Step Pipeline',
  pipeline: 'Pipeline',
};

function jobToItem(job: AgentJob, lectures: SavedLecture[]): InboxItem | null {
  const lecture = lectures.find(l => l.id === job.lecture_id);
  const lectureTitle = lecture?.title ?? 'Unknown lecture';
  const agentLabel = AGENT_TYPE_LABELS[job.agent_type] ?? job.agent_type;
  const at = job.completed_at ?? job.created_at;

  if (job.status === 'failed') {
    return {
      id: job.id,
      kind: 'pipeline-fail',
      priority: 'high',
      at,
      title: `Pipeline failed: ${lectureTitle}`,
      sub: `${agentLabel} · Failed ${timeAgo(at)}`,
      lectureId: job.lecture_id,
      primary: 'Open lecture',
    };
  }

  if (job.status === 'completed') {
    if (job.agent_type === 'study_planner') {
      return {
        id: job.id,
        kind: 'study-plan',
        priority: 'medium',
        at,
        title: 'Study plan ready',
        sub: `${agentLabel} · Generated ${timeAgo(at)}`,
        primary: 'Open planner',
      };
    }
    if (job.agent_type === 'auto_organizer') {
      return {
        id: job.id,
        kind: 'organize',
        priority: 'medium',
        at,
        title: `Organizer suggestion: ${lectureTitle}`,
        sub: `${agentLabel} · ${timeAgo(at)}`,
        lectureId: job.lecture_id,
        primary: 'Review',
      };
    }
    if (job.agent_type === 'research') {
      const sources: string[] = job.result?.sources ?? [];
      return {
        id: job.id,
        kind: 'research',
        priority: 'medium',
        at,
        title: `Research results for: ${lectureTitle}`,
        sub: `${agentLabel} · ${timeAgo(at)}`,
        lectureId: job.lecture_id,
        detail: sources.length > 0 ? sources : undefined,
        primary: 'Open lecture',
      };
    }
    return {
      id: job.id,
      kind: 'transcript-ready',
      priority: 'low',
      at,
      title: `${agentLabel} completed: ${lectureTitle}`,
      sub: `Completed ${timeAgo(at)}`,
      lectureId: job.lecture_id,
      primary: 'Open lecture',
    };
  }

  return null;
}

const KIND_CONFIG: Record<InboxKind, { color: string; label: string }> = {
  organize:           { color: 'var(--accent)',    label: 'Auto-Organizer' },
  research:           { color: '#0ea5e9',           label: 'Research' },
  'pipeline-fail':    { color: 'var(--bad)',        label: 'Pipeline error' },
  'study-plan':       { color: 'var(--accent)',     label: 'Study plan' },
  'transcript-ready': { color: 'var(--text-muted)', label: 'Ready' },
};

function kindIcon(kind: InboxKind): React.ReactNode {
  if (kind === 'pipeline-fail') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" strokeLinejoin="round" />
      <path d="M7 5.5V8.5" strokeLinecap="round" />
      <circle cx="7" cy="10" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
  if (kind === 'research') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="5.5" cy="5.5" r="3.5" />
      <path d="M8.5 8.5L12 12" strokeLinecap="round" />
    </svg>
  );
  if (kind === 'organize') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="4" height="4" rx="1" />
      <rect x="8.5" y="1.5" width="4" height="4" rx="1" />
      <rect x="1.5" y="8.5" width="4" height="4" rx="1" />
      <rect x="8.5" y="8.5" width="4" height="4" rx="1" />
    </svg>
  );
  if (kind === 'study-plan') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h10M2 7h7M2 10h5" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const InboxPage: React.FC = () => {
  const { agentJobs, lectures } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo<InboxItem[]>(() => {
    return agentJobs
      .map(job => jobToItem(job, lectures))
      .filter((item): item is InboxItem => item !== null && !dismissed.has(item.id))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [agentJobs, lectures, dismissed]);

  const counts = useMemo(() => ({
    all: items.length,
    needs: items.filter(i => i.priority === 'high').length,
    research: items.filter(i => i.kind === 'research').length,
    study: items.filter(i => i.kind === 'study-plan' || i.kind === 'transcript-ready').length,
  }), [items]);

  const filtered = useMemo(() => {
    if (filter === 'needs') return items.filter(i => i.priority === 'high');
    if (filter === 'research') return items.filter(i => i.kind === 'research');
    if (filter === 'study') return items.filter(i => i.kind === 'study-plan' || i.kind === 'transcript-ready');
    return items;
  }, [items, filter]);

  const selectedItem = items.find(i => i.id === selectedId) ?? null;

  const dismiss = (id: string) => {
    setDismissed(d => { const n = new Set(d); n.add(id); return n; });
    if (selectedId === id) setSelectedId(null);
  };

  const handlePrimary = (item: InboxItem) => {
    if (item.kind === 'study-plan') navigate('/planner');
    else if (item.lectureId) navigate(`/lecture/${item.lectureId}`);
    dismiss(item.id);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
            <ChevronRight />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Inbox</span>
            {counts.all > 0 && (
              <span className="chip" style={{ marginLeft: 4 }}>{counts.all} open</span>
            )}
          </>
        }
      >
        {items.length > 0 && (
          <button
            className="btn"
            onClick={() => setDismissed(new Set(items.map(i => i.id)))}
          >
            Mark all read
          </button>
        )}
      </TopBar>

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: selectedItem ? '1fr 420px' : '1fr',
        overflow: 'hidden',
      }}>
        <main style={{ overflowY: 'auto' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 28px 60px' }}>
            <header style={{ marginBottom: 18 }}>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em',
                margin: 0, lineHeight: 1.05, color: 'var(--text)',
              }}>
                {counts.all === 0 ? 'Inbox zero.' : `${counts.all} thing${counts.all === 1 ? '' : 's'} waiting.`}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                Agent activity and items that need your attention land here.
              </p>
            </header>

            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              {([
                { k: 'all',      label: 'All',       count: counts.all },
                { k: 'needs',    label: 'Needs you', count: counts.needs,    dot: 'var(--bad)' },
                { k: 'research', label: 'Research',  count: counts.research },
                { k: 'study',    label: 'Study',     count: counts.study },
              ] as Array<{ k: FilterKind; label: string; count: number; dot?: string }>).map(tab => (
                <FilterTab
                  key={tab.k}
                  active={filter === tab.k}
                  onClick={() => setFilter(tab.k)}
                  label={tab.label}
                  count={tab.count}
                  dot={tab.dot}
                />
              ))}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Sort: recent</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-soft)' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.4, display: 'block', margin: '0 auto' }}>
                  <path d="M5 16l7 7L27 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ fontSize: 14, margin: '10px 0 0' }}>Nothing here.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>
                  {items.length === 0
                    ? 'Agent job results will appear here when they complete.'
                    : 'Try a different filter.'}
                </p>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
                {filtered.map((item, i) => (
                  <InboxRow
                    key={item.id}
                    item={item}
                    active={selectedId === item.id}
                    last={i === filtered.length - 1}
                    onSelect={() => setSelectedId(item.id === selectedId ? null : item.id)}
                    onDismiss={() => dismiss(item.id)}
                    onPrimary={() => handlePrimary(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {selectedItem && (
          <aside style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-sunken)' }}>
            <InboxDetail
              item={selectedItem}
              onClose={() => setSelectedId(null)}
              onDismiss={() => dismiss(selectedItem.id)}
              onPrimary={() => handlePrimary(selectedItem)}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

const FilterTab: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}> = ({ active, onClick, label, count, dot }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      background: 'transparent', border: 0,
      borderBottom: `2px solid ${active ? 'var(--text)' : 'transparent'}`,
      color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      marginBottom: -7,
    }}
  >
    {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: dot, flexShrink: 0 }} />}
    {label}
    <span style={{
      fontSize: 10.5, padding: '1px 5px', borderRadius: 4,
      background: active ? 'var(--text)' : 'var(--bg-sunken)',
      color: active ? 'var(--bg)' : 'var(--text-soft)',
      fontFamily: 'var(--font-mono)',
    }}>{count}</span>
  </button>
);

const InboxRow: React.FC<{
  item: InboxItem;
  active: boolean;
  last: boolean;
  onSelect: () => void;
  onDismiss: () => void;
  onPrimary: () => void;
}> = ({ item, active, last, onSelect, onDismiss, onPrimary }) => {
  const cfg = KIND_CONFIG[item.kind];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: active ? 'var(--bg-sunken)' : 'transparent',
        borderLeft: `2px solid ${active ? cfg.color : 'transparent'}`,
        borderBottom: last ? 0 : '1px solid var(--border-subtle)',
        transition: 'background 80ms',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: cfg.color + '1a', color: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {kindIcon(item.kind)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.priority === 'high' && (
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--bad)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.sub}
        </p>
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {timeAgo(item.at)}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '4px 10px', fontSize: 11.5 }}
          onClick={e => { e.stopPropagation(); onPrimary(); }}
        >
          {item.primary}
        </button>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          title="Dismiss"
          onClick={e => { e.stopPropagation(); onDismiss(); }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const InboxDetail: React.FC<{
  item: InboxItem;
  onClose: () => void;
  onDismiss: () => void;
  onPrimary: () => void;
}> = ({ item, onClose, onDismiss, onPrimary }) => {
  const cfg = KIND_CONFIG[item.kind];
  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: cfg.color + '1a', color: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {kindIcon(item.kind)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {cfg.label}
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '2px 0 0', letterSpacing: '-0.005em', color: 'var(--text)' }}>
            {item.title}
          </h2>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '4px 0 0' }}>{timeAgo(item.at)}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="card" style={{ background: 'var(--bg-elev)' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{item.sub}</p>
        {item.detail && item.detail.length > 0 && (
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.detail.map((d, i) => (
              <li key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '8px 10px', background: 'var(--bg-sunken)', borderRadius: 6,
                fontSize: 12.5, lineHeight: 1.45, color: 'var(--text)',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-soft)', marginTop: 2, flexShrink: 0 }}>
                  <path d="M3 6h6M7 4l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={onPrimary}>
          {item.primary}
        </button>
        <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onDismiss}>
          Dismiss
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-soft)', padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Why this is here</strong>
        {item.kind === 'pipeline-fail' && 'The agent hit an error and could not complete. The original lecture data is safe — only the agent output needs to be regenerated.'}
        {item.kind === 'study-plan' && 'Your Study Planner agent finished building a prioritized review schedule. Open the planner to see it.'}
        {item.kind === 'organize' && 'Auto-Organizer compared the transcript content against your courses and found a high-confidence match for filing.'}
        {item.kind === 'research' && 'You flagged a confusing moment. Research Assistant searched and found sources to help clarify it.'}
        {item.kind === 'transcript-ready' && 'The agent finished processing. You can open the lecture to review the output whenever you are ready.'}
      </div>
    </div>
  );
};

const ChevronRight: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
    <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default InboxPage;
