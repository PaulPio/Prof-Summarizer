/* global React, Icon, PSData */
// Shell: course rail (left), main column, top bar.

const { useState, useEffect, useMemo, useRef } = React;

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.floor((today - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
window.fmtTime = fmtTime;
window.fmtDate = fmtDate;

/* ───────────────── COURSE RAIL (left sidebar) ───────────────── */
function CourseRail({ activeCourseId, setActiveCourseId, route, setRoute }) {
  const { COURSES, LECTURES } = window.PSData;
  const countAll = LECTURES.length;
  return (
    <aside style={RS.rail}>
      <div style={RS.brand}>
        <div style={RS.brandMark}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="3" width="20" height="18" rx="4" fill="var(--text)"/>
            <path d="M7 8h10M7 12h7M7 16h5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="18" cy="16" r="2" fill="var(--rec)"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>ProfSummarizer</span>
          <span style={{ fontSize: 10, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Studio · v3</span>
        </div>
      </div>

      <div style={RS.searchBox}>
        <Icon name="search" size={14} />
        <span style={{ flex: 1, color: 'var(--text-soft)' }}>Search…</span>
        <span className="kbd">⌘K</span>
      </div>

      <nav style={RS.nav}>
        <NavItem icon="home" label="Dashboard" active={route === 'dashboard'} onClick={() => setRoute('dashboard')} />
        <NavItem icon="mic" label="Record" badge="•" active={route === 'record'} onClick={() => setRoute('record')} />
        <NavItem icon="calendar" label="Planner" active={route === 'planner'} onClick={() => setRoute('planner')} />
        <NavItem icon="inbox" label="Inbox" count={3} active={route === 'inbox'} onClick={() => setRoute('inbox')} />
        <NavItem icon="bookmark" label="Saved" active={route === 'saved'} onClick={() => setRoute('saved')} />
      </nav>

      <div style={RS.sectionLabel}>
        <span>Courses</span>
        <button className="icon-btn" style={{ width: 20, height: 20 }} title="New course"><Icon name="plus" size={13} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px', flex: 1, overflowY: 'auto' }}>
        <CourseItem
          active={activeCourseId === null}
          onClick={() => setActiveCourseId(null)}
          dot="var(--text-soft)"
          name="All lectures"
          count={countAll}
        />
        {COURSES.map(c => (
          <CourseItem
            key={c.id}
            active={activeCourseId === c.id}
            onClick={() => setActiveCourseId(c.id)}
            dot={c.color}
            name={c.name}
            code={c.code}
            count={c.lecturesCount}
          />
        ))}
      </div>

      <div style={RS.railFooter}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={RS.avatar}>AS</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Ari Salgado</span>
            <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>2nd year · Cognitive Sci</span>
          </div>
        </div>
        <button className="icon-btn" title="Settings" onClick={() => setRoute('settings')}><Icon name="settings" size={14} /></button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, count, badge, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...RS.navItem, ...(active ? RS.navItemActive : null) }}
    >
      <Icon name={icon} size={15} />
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge && <span style={{ color: 'var(--rec-deep)', fontSize: 18, lineHeight: 0.6 }}>{badge}</span>}
      {count != null && <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{count}</span>}
    </button>
  );
}

function CourseItem({ active, onClick, dot, name, code, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...RS.courseItem, ...(active ? RS.courseItemActive : null) }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </span>
      {code && <span style={{ fontSize: 10, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>{code}</span>}
      <span style={{ fontSize: 10, color: 'var(--text-soft)', minWidth: 14, textAlign: 'right' }}>{count}</span>
    </button>
  );
}

/* ───────────────── TOPBAR ───────────────── */
function TopBar({ children, breadcrumb }) {
  return (
    <header style={RS.topbar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {breadcrumb}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
      </div>
    </header>
  );
}

/* ───────────────── STYLES ───────────────── */
const RS = {
  rail: {
    width: 248,
    flexShrink: 0,
    height: '100vh',
    background: 'var(--bg-sunken)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    fontSize: 12,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px 12px',
  },
  brandMark: {
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    margin: '0 12px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text-muted)',
    cursor: 'text',
    fontSize: 12,
  },
  nav: {
    padding: '0 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    marginBottom: 10,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 12.5,
    fontWeight: 500,
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 16px 4px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-soft)',
  },
  courseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 12.5,
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  courseItemActive: {
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-sm)',
  },
  railFooter: {
    padding: '10px 12px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 26, height: 26, borderRadius: 7,
    background: 'linear-gradient(135deg, var(--accent), #c084fc)',
    color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
  },
  topbar: {
    height: 48,
    flexShrink: 0,
    padding: '0 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  },
};

window.CourseRail = CourseRail;
window.TopBar = TopBar;
