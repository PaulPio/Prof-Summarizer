import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import CourseManager from './CourseManager';
import { StorageService } from '../services/storageService';
import { displayCourseColor } from '../constants/courseColors';
import { STUDY_PLANNER_ENABLED } from '../constants/featureFlags';

interface CourseRailProps {
  navigate: NavigateFunction;
  onLogout: () => void;
}

const CourseRail: React.FC<CourseRailProps> = ({ navigate, onLogout }) => {
  const { user, courses, setCourses, lectures, agentJobs, activeCourseId, setActiveCourseId } = useAppContext();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const activeNav = location.pathname === '/planner' ? 'planner'
    : location.pathname === '/inbox' ? 'inbox'
    : location.pathname === '/saved' ? 'saved'
    : (location.state as { openRecord?: boolean } | null)?.openRecord ? 'record'
    : 'dashboard';

  const pendingInbox = agentJobs.filter(j => j.status === 'failed' || j.status === 'completed').length;

  const lectureCount = (courseId: string | null) => {
    if (courseId === null) return lectures.length;
    return lectures.filter(l => l.courseId === courseId).length;
  };

  const handleCreate = async (name: string, color: string) => {
    if (!user) return;
    try {
      const course = await StorageService.saveCourse(user.id, name, color);
      setCourses(prev => [...prev, course]);
      setActiveCourseId(course.id);
    } catch (err) {
      console.error('Failed to create course:', err);
    }
    setShowCreate(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside style={{
      width: 248,
      flexShrink: 0,
      background: 'var(--bg-sunken)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Brand row */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10.5C2 9 3 7.5 7 7.5C11 7.5 12 9 12 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="4.5" r="2" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)' }}>ProfSummarizer</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.2 }}>Studio · v3</div>
          </div>
        </div>

        {/* Search box — not yet implemented */}
        <button
          type="button"
          disabled
          title="Search coming soon"
          style={{
            width: '100%',
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 8px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text-soft)',
            fontSize: 12,
            cursor: 'not-allowed',
            textAlign: 'left',
            opacity: 0.5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5" cy="5" r="3.5" />
            <path d="M8 8l2 2" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>Search…</span>
          <kbd className="kbd" style={{ fontSize: 9 }}>⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <div style={{ padding: '8px 8px 4px' }}>
        <NavItem
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" />
              <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" />
              <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" />
              <rect x="8" y="8" width="4.5" height="4.5" rx="1" />
            </svg>
          }
          label="Dashboard"
          active={activeNav === 'dashboard'}
          onClick={() => navigate('/')}
        />
        <NavItem
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" />
              <circle cx="7" cy="7" r="2" fill="currentColor" stroke="none" />
            </svg>
          }
          label="Record"
          active={activeNav === 'record'}
          onClick={() => navigate('/', { state: { openRecord: true } })}
        />
        {STUDY_PLANNER_ENABLED && (
        <NavItem
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h10M2 7h7M2 10h5" strokeLinecap="round" />
            </svg>
          }
          label="Study planner"
          active={activeNav === 'planner'}
          onClick={() => navigate('/planner')}
        />
        )}
        <NavItem
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h10v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
              <path d="M2 3l5 4.5L12 3" strokeLinejoin="round" />
            </svg>
          }
          label="Inbox"
          active={activeNav === 'inbox'}
          onClick={() => navigate('/inbox')}
          badge={pendingInbox > 0 ? pendingInbox : undefined}
        />
        <NavItem
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 2h8a1 1 0 011 1v9.5l-5-2.8-5 2.8V3a1 1 0 011-1z" strokeLinejoin="round" />
            </svg>
          }
          label="Saved"
          active={activeNav === 'saved'}
          onClick={() => navigate('/saved')}
        />
      </div>

      {/* Courses section */}
      <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
          Courses
        </span>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 20, height: 20 }}
          onClick={() => setShowCreate(true)}
          title="Add course"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 1v8M1 5h8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <CourseItem
          label="All lectures"
          sublabel={`${lectureCount(null)} total`}
          active={activeCourseId === null}
          color="var(--accent)"
          onClick={() => setActiveCourseId(null)}
        />
        {courses.map(course => (
          <CourseItem
            key={course.id}
            label={course.name}
            sublabel={`${lectureCount(course.id)} lecture${lectureCount(course.id) !== 1 ? 's' : ''}`}
            active={activeCourseId === course.id}
            color={displayCourseColor(course.color)}
            onClick={() => setActiveCourseId(course.id)}
          />
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {user?.picture ? (
          <img
            src={user.picture}
            alt=""
            style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: 'white',
          }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name ?? 'Guest'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-soft)' }}>
            {user?.id === 'guest' ? 'Guest · local only' : user?.email ?? 'Signed in'}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6.5 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            <path d="M10.5 6.5a4 4 0 01-.1.8l1.2.9-1 1.7-1.4-.5a4 4 0 01-1.3.8l-.2 1.5h-2l-.2-1.5a4 4 0 01-1.3-.8l-1.4.5-1-1.7 1.2-.9a4 4 0 010-1.6L2 5.4l1-1.7 1.4.5a4 4 0 011.3-.8L6 2h2l.2 1.4a4 4 0 011.3.8l1.4-.5 1 1.7-1.2.9a4 4 0 01.1.7z" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          onClick={onLogout}
          title="Sign out"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8.5 4.5L11 7l-2.5 2.5M11 7H5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 2H3a1 1 0 00-1 1v7a1 1 0 001 1h2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showCreate && (
        <CourseManager mode="create" onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}
    </aside>
  );
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ icon, label, active, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 'var(--r-sm)',
      border: active ? '1px solid var(--border)' : '1px solid transparent',
      background: active ? 'var(--bg-elev)' : 'transparent',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
      color: active ? 'var(--text)' : 'var(--text-muted)',
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      cursor: 'pointer',
      textAlign: 'left',
      marginBottom: 1,
      transition: 'background 80ms, color 80ms',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && (
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
        padding: '1px 5px', borderRadius: 99,
        background: 'var(--bad)', color: 'white',
        lineHeight: 1.4,
      }}>{badge}</span>
    )}
  </button>
);

const CourseItem: React.FC<{
  label: string;
  sublabel: string;
  active: boolean;
  color: string;
  courseCode?: string;
  onClick: () => void;
}> = ({ label, sublabel, active, color, courseCode, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 'var(--r-sm)',
      border: active ? '1px solid var(--border)' : '1px solid transparent',
      background: active ? 'var(--bg-elev)' : 'transparent',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
      cursor: 'pointer',
      textAlign: 'left',
      marginBottom: 1,
      transition: 'background 80ms',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    <div style={{
      width: 8, height: 8, borderRadius: 2, flexShrink: 0,
      background: color,
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 12, fontWeight: active ? 500 : 400,
        color: active ? 'var(--text)' : 'var(--text-muted)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {courseCode && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)' }}>
            {courseCode}
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>{sublabel}</span>
      </div>
    </div>
  </button>
);

export default CourseRail;
