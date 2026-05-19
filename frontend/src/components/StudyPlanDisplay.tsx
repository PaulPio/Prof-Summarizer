import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { displayCourseColor } from '../constants/courseColors';
import type { StudyPlan, StudyPlanItem } from '../types';

interface StudyPlanDisplayProps {
  plan: StudyPlan;
  title?: string;
  createdAt?: string;
}

const EMPHASIS_COLORS = [
  'var(--accent)',
  'var(--good)',
  'var(--confuse)',
  'var(--text-soft)',
];

const ACTIVITY_META: Record<string, { color: string; icon: string }> = {
  summary:  { color: '#5b5bd6', icon: '📄' },
  cornell:  { color: '#0ea5e9', icon: '📝' },
  cards:    { color: '#16a34a', icon: '🃏' },
  quiz:     { color: '#f59e0b', icon: '✅' },
  review:   { color: '#5b5bd6', icon: '📖' },
  default:  { color: '#6b6b6b', icon: '•' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const StudyPlanDisplay: React.FC<StudyPlanDisplayProps> = ({ plan, title, createdAt }) => {
  const navigate = useNavigate();
  const { courses } = useAppContext();
  const course = courses.find(c => c.id === plan.courseId);

  const nearestDue = plan.planItems
    .map(i => i.dueDate)
    .filter(Boolean)
    .sort()[0];

  const daysLeft = nearestDue ? daysUntil(nearestDue) : null;

  const guideParagraphs = (plan.studyGuide ?? '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ flex: 1 }}>
          {(course || plan.courseName) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {course && (
                <span style={{
                  width: 10, height: 10, borderRadius: 3,
                  background: displayCourseColor(course.color), flexShrink: 0,
                }} />
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-soft)',
              }}>
                {course?.name ?? plan.courseName}
                {plan.planItems.length > 0 && ` · ${plan.planItems.length} lectures`}
              </span>
            </div>
          )}
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em',
            lineHeight: 1.05, margin: 0, color: 'var(--text)',
          }}>
            {title ?? (plan.courseName ? `Study plan · ${plan.courseName}` : 'Study plan')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            {plan.planItems.length} lecture{plan.planItems.length !== 1 ? 's' : ''} to review
            {plan.knowledgeGaps.length > 0 && ` · ${plan.knowledgeGaps.length} knowledge gaps`}
            {createdAt && ` · generated ${timeAgo(createdAt)}`}
          </p>
        </div>

        {daysLeft !== null && (
          <div className="card" style={{ minWidth: 200, padding: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Time to deadline
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 300,
              letterSpacing: '-0.02em', color: daysLeft <= 2 ? 'var(--bad)' : 'var(--text)',
            }}>
              {daysLeft <= 0 ? 'due today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
            </span>
            <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(1, Math.max(0, 1 - daysLeft / 14)) * 100}%`,
                height: '100%', background: 'var(--accent)',
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
              {nearestDue && new Date(nearestDue).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* ── KNOWLEDGE GAPS (emphasis bar) ── */}
      {plan.knowledgeGaps.length > 0 && (
        <section>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Topics to revisit
          </h3>
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* stacked bar */}
            {plan.knowledgeGaps.length > 0 && (
              <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--bg-sunken)' }}>
                {plan.knowledgeGaps.map((_, i) => (
                  <span key={i} style={{
                    flex: 1,
                    background: EMPHASIS_COLORS[i % EMPHASIS_COLORS.length],
                    borderRight: i < plan.knowledgeGaps.length - 1 ? '2px solid var(--bg-elev)' : undefined,
                  }} />
                ))}
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(plan.knowledgeGaps.length, 4)}, 1fr)`,
              gap: 12,
            }}>
              {plan.knowledgeGaps.map((gap, i) => (
                <div key={gap}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: 2,
                      background: EMPHASIS_COLORS[i % EMPHASIS_COLORS.length],
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{gap}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: 0, lineHeight: 1.4 }}>
                    Needs more study
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STUDY GUIDE ── */}
      {guideParagraphs.length > 0 && (
        <section>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            Study guide
          </h3>
          <div className="card" style={{ padding: 20 }}>
            <blockquote style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 15, lineHeight: 1.65, color: 'var(--text-muted)',
              margin: 0, padding: '0 0 0 16px',
              borderLeft: '2px solid var(--border-strong)',
            }}>
              {guideParagraphs[0]}
            </blockquote>
            {guideParagraphs.slice(1).map((p, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}>
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ── PLAN ITEMS (session cards) ── */}
      {plan.planItems.length === 0 ? (
        <p style={{
          fontSize: 13, color: 'var(--text-soft)', padding: 16,
          border: '1px dashed var(--border)', borderRadius: 'var(--r)',
          textAlign: 'center',
        }}>
          No lecture steps in this plan. Generate again or pick more lectures.
        </p>
      ) : (
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
              Schedule
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
              {plan.planItems.length} lecture{plan.planItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(plan.planItems.length, 4)}, 1fr)`,
            gap: 12,
          }}>
            {plan.planItems.map((item, i) => (
              <PlanItemCard
                key={`${item.lectureId}-${i}`}
                item={item}
                index={i}
                onOpen={() => navigate(`/lecture/${item.lectureId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTNOTE ── */}
      <div style={{
        padding: 14, background: 'var(--accent-soft)',
        borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>✦</span>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)', margin: 0 }}>
            How this plan was built
          </p>
          <p style={{ fontSize: 12, color: 'var(--accent-text)', margin: '4px 0 0', lineHeight: 1.55, opacity: 0.85 }}>
            Lectures are ordered by priority based on your confusion flags, quiz history, and Cornell note coverage.
            Materials are selected to give you spaced active recall across all topics.
            {plan.knowledgeGaps.length > 0 && ` Focus extra time on: ${plan.knowledgeGaps.slice(0, 2).join(', ')}.`}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PlanItemCardProps {
  item: StudyPlanItem;
  index: number;
  onOpen: () => void;
}

const ACTIVITY_ICONS: Record<string, string> = {
  summary: '📄',
  cornell: '📝',
  flashcard: '🃏',
  card: '🃏',
  quiz: '✅',
  review: '📖',
  read: '📖',
  practice: '🎯',
  write: '✏️',
};

function activityIcon(text: string): string {
  const lower = text.toLowerCase();
  for (const [k, v] of Object.entries(ACTIVITY_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return '•';
}

const PlanItemCard: React.FC<PlanItemCardProps> = ({ item, index, onOpen }) => {
  const isFirst = index === 0;
  const daysLeft = item.dueDate ? daysUntil(item.dueDate) : null;

  return (
    <article style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <header style={{
        padding: '10px 12px',
        background: isFirst ? 'var(--accent-soft)' : 'var(--bg-sunken)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            color: isFirst ? 'var(--accent-text)' : 'var(--text-soft)',
          }}>
            #{index + 1}
          </span>
          {isFirst && (
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 999,
              background: 'var(--accent)', color: 'white',
              fontWeight: 600, letterSpacing: '0.04em',
            }}>
              START
            </span>
          )}
          {daysLeft !== null && daysLeft >= 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)' }}>
              {daysLeft === 0 ? 'today' : `${daysLeft}d`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            textAlign: 'left', width: '100%',
          }}
        >
          <span style={{
            fontSize: 12.5, fontWeight: 600,
            color: isFirst ? 'var(--accent-text)' : 'var(--text)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.lectureTitle}
          </span>
        </button>
      </header>

      <div style={{ padding: '8px 8px 10px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {/* Reason */}
        {item.reason && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px 4px', lineHeight: 1.4 }}>
            {item.reason}
          </p>
        )}

        {/* Materials to review as activity blocks */}
        {item.materialsToReview && item.materialsToReview.map((mat, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            padding: '5px 7px', borderRadius: 6,
            background: 'var(--bg-sunken)',
          }}>
            <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1.4 }}>{activityIcon(mat)}</span>
            <span style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.35 }}>{mat}</span>
          </div>
        ))}

        {/* Suggested activities */}
        {item.suggestedActivities && item.suggestedActivities.length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {item.suggestedActivities.map((act, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent-text)',
                fontWeight: 500,
              }}>
                {act}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '0 8px 8px' }}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            width: '100%', padding: '5px 8px', fontSize: 11,
            background: 'var(--bg-sunken)', border: '1px solid var(--border)',
            borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          Open lecture →
        </button>
      </div>
    </article>
  );
};

export default StudyPlanDisplay;
