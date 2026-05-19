import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { displayCourseColor } from '../constants/courseColors';
import TopBar from '../components/TopBar';
import type { SavedLecture } from '../types';

type SavedKind = 'lecture' | 'cornell-row' | 'card';
type ViewMode = 'grid' | 'list';

interface SavedItem {
  id: string;
  kind: SavedKind;
  at: string;
  lectureId: string;
  lectureTitle: string;
  courseId?: string;
  // lecture
  sub?: string;
  // cornell-row
  cue?: string;
  body?: string;
  // card
  term?: string;
  def?: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function useStarred(userId: string | undefined) {
  const key = `ps_starred_${userId ?? 'guest'}`;
  const [starred, setStarredState] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const toggle = (lectureId: string) => {
    setStarredState(prev => {
      const next = new Set(prev);
      if (next.has(lectureId)) next.delete(lectureId); else next.add(lectureId);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  return { starred, toggle };
}

function buildItems(lectures: SavedLecture[], starred: Set<string>): SavedItem[] {
  const items: SavedItem[] = [];

  for (const l of lectures) {
    if (starred.has(l.id)) {
      const cardCount = l.flashcards?.length ?? 0;
      const duration = l.transcript ? `~${Math.round(l.transcript.split(' ').length / 130)} min` : '';
      items.push({
        id: `star-${l.id}`,
        kind: 'lecture',
        at: l.date,
        lectureId: l.id,
        lectureTitle: l.title,
        courseId: l.courseId,
        sub: [duration, cardCount > 0 ? `${cardCount} cards` : ''].filter(Boolean).join(' · '),
      });
    }

    if (l.cornellNotes?.cues) {
      const { cues, notes } = l.cornellNotes;
      const len = Math.min(cues.length, notes?.length ?? 0);
      for (let i = 0; i < len; i++) {
        if (cues[i]?.trim()) {
          items.push({
            id: `cn-${l.id}-${i}`,
            kind: 'cornell-row',
            at: l.date,
            lectureId: l.id,
            lectureTitle: l.title,
            courseId: l.courseId,
            cue: cues[i],
            body: notes[i] ?? '',
          });
        }
      }
    }

    if (l.flashcards?.length) {
      for (let i = 0; i < l.flashcards.length; i++) {
        const f = l.flashcards[i];
        items.push({
          id: `fc-${l.id}-${i}`,
          kind: 'card',
          at: l.date,
          lectureId: l.id,
          lectureTitle: l.title,
          courseId: l.courseId,
          term: f.term,
          def: f.definition,
        });
      }
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

const KIND_TABS = [
  { k: 'all'        as const, label: 'All',          icon: bookmarkIcon() },
  { k: 'lecture'    as const, label: 'Starred',       icon: starIcon() },
  { k: 'cornell-row'as const, label: 'Cornell rows',  icon: noteIcon() },
  { k: 'card'       as const, label: 'Flashcards',    icon: cardIcon() },
];

function bookmarkIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h7a1 1 0 011 1v8.5l-4.5-2.5L2 11.5V3a1 1 0 011-1z" strokeLinejoin="round" /></svg>;
}
function starIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><path d="M6.5 1.5l1.3 3.1H11L8.3 6.9l1 3.2-2.8-1.8-2.8 1.8 1-3.2L2 4.6h3.2z" /></svg>;
}
function noteIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h9M2 6.5h9M2 9.5h5" strokeLinecap="round" /></svg>;
}
function cardIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="3.5" width="10" height="7" rx="1.5" /><path d="M1.5 6h10" /></svg>;
}
function gridIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="4" height="4" rx="0.5" /><rect x="7" y="1" width="4" height="4" rx="0.5" /><rect x="1" y="7" width="4" height="4" rx="0.5" /><rect x="7" y="7" width="4" height="4" rx="0.5" /></svg>;
}
function listIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M2 6h8M2 9h8" strokeLinecap="round" /></svg>;
}

const SavedPage: React.FC = () => {
  const { lectures, courses, user } = useAppContext();
  const navigate = useNavigate();
  const { starred, toggle: toggleStar } = useStarred(user?.id);

  const [kindFilter, setKindFilter] = useState<SavedKind | 'all'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

  const allItems = useMemo(() => buildItems(lectures, starred), [lectures, starred]);

  const counts = useMemo(() => ({
    all: allItems.length,
    lecture: allItems.filter(i => i.kind === 'lecture').length,
    'cornell-row': allItems.filter(i => i.kind === 'cornell-row').length,
    card: allItems.filter(i => i.kind === 'card').length,
  }), [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (courseFilter !== 'all' && item.courseId !== courseFilter) return false;
      if (search) {
        const hay = [item.lectureTitle, item.cue, item.body, item.term, item.def, item.sub].join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [allItems, kindFilter, courseFilter, search]);

  const starredLectureIds = useMemo(() => new Set(allItems.filter(i => i.kind === 'lecture').map(i => i.lectureId)), [allItems]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
              <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Saved</span>
            {allItems.length > 0 && (
              <span className="chip" style={{ marginLeft: 4 }}>{allItems.length} items</span>
            )}
          </>
        }
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '16px 10px', background: 'var(--bg)' }}>
          <div style={{ padding: '0 6px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 20 }}>
            {KIND_TABS.map(tab => (
              <button
                key={tab.k}
                type="button"
                onClick={() => setKindFilter(tab.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px',
                  background: kindFilter === tab.k ? 'var(--bg-sunken)' : 'transparent',
                  border: `1px solid ${kindFilter === tab.k ? 'var(--border)' : 'transparent'}`,
                  borderRadius: 6,
                  color: kindFilter === tab.k ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 12.5, fontWeight: kindFilter === tab.k ? 600 : 500,
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                {tab.icon}
                <span style={{ flex: 1 }}>{tab.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                  {counts[tab.k] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: '0 6px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Course
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <CourseFilterBtn active={courseFilter === 'all'} onClick={() => setCourseFilter('all')} label="All courses" />
            {courses.map(c => (
              <CourseFilterBtn
                key={c.id}
                active={courseFilter === c.id}
                onClick={() => setCourseFilter(c.id)}
                label={c.name}
                color={displayCourseColor(c.color)}
              />
            ))}
          </div>

          {kindFilter === 'lecture' && lectures.length > 0 && (
            <div style={{ marginTop: 24, padding: 10, background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text)' }}>Tip:</strong> open any lecture and click the star icon to save it here.
              </p>
            </div>
          )}
        </nav>

        {/* Main */}
        <main style={{ overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 60px' }}>
            <header style={{ marginBottom: 18 }}>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em',
                margin: 0, lineHeight: 1.05, color: 'var(--text)',
              }}>
                {kindFilter === 'all' ? 'Your saved corner' : KIND_TABS.find(t => t.k === kindFilter)?.label ?? 'Saved'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                {filtered.length} item{filtered.length !== 1 ? 's' : ''} · starred lectures, Cornell rows, flashcards.
              </p>
            </header>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)', pointerEvents: 'none' }}>
                  <circle cx="5.5" cy="5.5" r="3.5" />
                  <path d="M8.5 8.5L12 12" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search saved items…"
                  style={{
                    width: '100%', padding: '6px 10px 6px 30px',
                    background: 'var(--bg-elev)', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 12.5, outline: 'none', color: 'var(--text)',
                  }}
                />
              </div>
              <span style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 1, background: 'var(--bg-sunken)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
                <ViewBtn active={view === 'grid'} onClick={() => setView('grid')} icon={gridIcon()} />
                <ViewBtn active={view === 'list'} onClick={() => setView('list')} icon={listIcon()} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-soft)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔖</div>
                <p style={{ fontSize: 14, margin: 0 }}>Nothing here yet.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>
                  {allItems.length === 0
                    ? 'Star a lecture or generate Cornell notes and flashcards to see them here.'
                    : 'Try clearing the filters.'}
                </p>
              </div>
            ) : view === 'grid' ? (
              <div style={{ columnCount: 3, columnGap: 14 }}>
                {filtered.map(item => (
                  <SavedCard
                    key={item.id}
                    item={item}
                    starred={starredLectureIds.has(item.lectureId)}
                    onToggleStar={() => toggleStar(item.lectureId)}
                    onOpenLecture={() => navigate(`/lecture/${item.lectureId}`)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
                {filtered.map((item, i) => (
                  <SavedListRow
                    key={item.id}
                    item={item}
                    last={i === filtered.length - 1}
                    onOpenLecture={() => navigate(`/lecture/${item.lectureId}`)}
                  />
                ))}
              </div>
            )}

            {kindFilter === 'lecture' && filtered.length === 0 && allItems.length === 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600, margin: 0 }}>All lectures</p>
                {lectures.slice(0, 10).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                    <button
                      type="button"
                      onClick={() => toggleStar(l.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: starred.has(l.id) ? 'var(--confuse)' : 'var(--text-faint)', flexShrink: 0 }}
                      title={starred.has(l.id) ? 'Unstar' : 'Star'}
                    >
                      {starIcon()}
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--text)' }}>{l.title}</span>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate(`/lecture/${l.id}`)}>Open</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const CourseFilterBtn: React.FC<{ active: boolean; onClick: () => void; label: string; color?: string }> = ({ active, onClick, label, color }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
      background: active ? 'var(--bg-sunken)' : 'transparent',
      border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
      borderRadius: 6, color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 12, fontWeight: active ? 600 : 500, textAlign: 'left', cursor: 'pointer',
    }}
  >
    {color
      ? <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
      : <span style={{ width: 7 }} />
    }
    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
  </button>
);

const ViewBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--bg-elev)' : 'transparent',
      border: 0, borderRadius: 4,
      color: active ? 'var(--text)' : 'var(--text-soft)',
      cursor: 'pointer', padding: 0,
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
    }}
  >
    {icon}
  </button>
);

const SavedCard: React.FC<{
  item: SavedItem;
  starred: boolean;
  onToggleStar: () => void;
  onOpenLecture: () => void;
}> = ({ item, starred, onToggleStar, onOpenLecture }) => {
  const cardStyle: React.CSSProperties = {
    breakInside: 'avoid',
    marginBottom: 14,
    border: '1px solid var(--border)',
    borderRadius: 10,
    background: 'var(--bg-elev)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerRow = (label: string, color: string, right?: React.ReactNode) => (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-sunken)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>{label}</span>
      {right}
    </div>
  );

  const footerRow = (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={onOpenLecture}
        style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5.5h7M6 3l2.5 2.5L6 8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {item.lectureTitle}
      </button>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>{timeAgo(item.at)}</span>
    </div>
  );

  if (item.kind === 'lecture') {
    return (
      <article style={cardStyle}>
        {headerRow('Starred lecture', 'var(--confuse)',
          <button type="button" onClick={onToggleStar} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--confuse)', display: 'flex' }}>
            {starIcon()}
          </button>
        )}
        <div style={{ padding: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, fontWeight: 400, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.15, color: 'var(--text)' }}>
            {item.lectureTitle}
          </h3>
          {item.sub && <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '6px 0 0' }}>{item.sub}</p>}
        </div>
        {footerRow}
      </article>
    );
  }

  if (item.kind === 'cornell-row') {
    return (
      <article style={cardStyle}>
        {headerRow('Cornell row', 'var(--accent)')}
        <div style={{ padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', margin: 0 }}>{item.cue}</p>
          <p style={{ fontSize: 12.5, color: 'var(--text)', margin: '6px 0 0', lineHeight: 1.55 }}>{item.body}</p>
        </div>
        {footerRow}
      </article>
    );
  }

  if (item.kind === 'card') {
    return (
      <article style={cardStyle}>
        {headerRow('Flashcard', 'var(--good)')}
        <div style={{ padding: 14 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.3, margin: 0, color: 'var(--text)' }}>
            {item.term}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.55, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
            {item.def}
          </p>
        </div>
        {footerRow}
      </article>
    );
  }

  return null;
};

const SAVED_LIST_META: Record<SavedKind, { color: string; label: string }> = {
  lecture:      { color: 'var(--confuse)', label: 'Starred' },
  'cornell-row':{ color: 'var(--accent)', label: 'Cornell row' },
  card:         { color: 'var(--good)',   label: 'Flashcard' },
};

const SavedListRow: React.FC<{ item: SavedItem; last: boolean; onOpenLecture: () => void }> = ({ item, last, onOpenLecture }) => {
  const meta = SAVED_LIST_META[item.kind];
  let primary = '', secondary = '';
  if (item.kind === 'lecture') { primary = item.lectureTitle; secondary = item.sub ?? ''; }
  else if (item.kind === 'cornell-row') { primary = item.cue ?? ''; secondary = (item.body ?? '').slice(0, 120) + (item.body && item.body.length > 120 ? '…' : ''); }
  else if (item.kind === 'card') { primary = item.term ?? ''; secondary = (item.def ?? '').slice(0, 100) + (item.def && item.def.length > 100 ? '…' : ''); }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenLecture}
      onKeyDown={e => e.key === 'Enter' && onOpenLecture()}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: last ? 0 : '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: meta.color + '1a', color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.kind === 'lecture' ? starIcon() : item.kind === 'cornell-row' ? noteIcon() : cardIcon()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{primary}</p>
        <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secondary}</p>
      </div>
      <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{meta.label}</span>
      <span style={{ fontSize: 10.5, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{timeAgo(item.at)}</span>
    </div>
  );
};

export default SavedPage;
