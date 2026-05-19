/* global React, Icon, PSData, TopBar, fmtTime, fmtDate,
   CornellBlock, KeyPoints, ActionItems, Vocab, Flashcards, Quiz, Chat */
// Six lecture-detail variants. Each is a complete IA experiment.

const { useState, useEffect, useRef, useMemo } = React;

/* ───────────────── shared header strip ───────────────── */
function LectureHeader({ lecture, course, onBack, sticky = false }) {
  return (
    <header style={{
      display: 'flex', flexDirection: 'column',
      padding: '20px 28px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: sticky ? 'sticky' : 'static',
      top: 0, zIndex: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onBack}><Icon name="chevronLeft" size={13} /> All lectures</button>}
        {course && (
          <span className="chip">
            <span style={{ width: 6, height: 6, borderRadius: 2, background: course.color }} />
            {course.code} · {course.name}
          </span>
        )}
        <span className="chip"><Icon name="calendar" size={11} />{fmtDate(lecture.date)}</span>
        <span className="chip"><Icon name="clock" size={11} />{lecture.durationLabel}</span>
        <span className="chip" style={{ background: 'var(--confuse-soft)', color: 'var(--confuse)', borderColor: 'transparent' }}>
          <Icon name="flag" size={11} />{lecture.confusions} confusion{lecture.confusions === 1 ? '' : 's'}
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn"><Icon name="notion" size={13} /> Export</button>
        <button className="btn"><Icon name="more" size={13} /></button>
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 'var(--text-display)',
        fontWeight: 400,
        letterSpacing: '-0.025em',
        lineHeight: 1.02,
        margin: 0,
      }}>{lecture.title}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: 720 }}>{lecture.subtitle}</p>
    </header>
  );
}

/* ═════════════════════════════════════════════════════════════════
   VARIANT 1 · DOCUMENT
   Long-scroll reading with sticky right rail (outline + confusions).
═════════════════════════════════════════════════════════════════ */
function VariantDocument({ lecture, course, onBack }) {
  const { HERO_CORNELL, HERO_CONFUSIONS } = window.PSData;
  const [activeAnchor, setActiveAnchor] = useState('overview');
  const [chatOpen, setChatOpen] = useState(false);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'takeaways', label: 'Key takeaways' },
    { id: 'cornell', label: 'Cornell notes' },
    { id: 'vocab', label: 'Vocabulary' },
    { id: 'actions', label: 'Action items' },
    { id: 'cards', label: 'Flashcards' },
    { id: 'quiz', label: 'Quiz' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <button className="btn"><Icon name="copy" size={13} /> Copy link</button>
        <button className="btn"><Icon name="download" size={13} /> Export</button>
      </TopBar>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 220px',
          gap: 40,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '40px 32px 80px',
        }}>
          {/* MAIN COLUMN */}
          <article style={{ display: 'flex', flexDirection: 'column', gap: 36, minWidth: 0 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {course?.code} · {fmtDate(lecture.date)} · {lecture.durationLabel}
              </span>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 56,
                fontWeight: 400,
                letterSpacing: '-0.025em',
                lineHeight: 1.02,
                margin: '8px 0 12px',
              }}>{lecture.title}</h1>
              <p style={{ fontSize: 17, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, maxWidth: 640 }}>{lecture.subtitle}</p>
            </div>

            <Section id="overview" title="Overview">
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 21,
                lineHeight: 1.55,
                color: 'var(--text)',
                margin: 0,
                borderLeft: '2px solid var(--accent)',
                paddingLeft: 18,
              }}>{HERO_CORNELL.summary}</p>
            </Section>

            <Section id="takeaways" title="Key takeaways"><KeyPoints /></Section>
            <Section id="cornell" title="Cornell notes"><CornellBlock /></Section>
            <Section id="vocab" title="Vocabulary"><Vocab /></Section>
            <Section id="actions" title="Action items"><ActionItems /></Section>

            <Section id="cards" title="Flashcards" sub="8 cards · spaced repetition">
              <div className="card" style={{ padding: 20 }}><Flashcards /></div>
            </Section>

            <Section id="quiz" title="Quick check" sub="5 questions">
              <div className="card" style={{ padding: 20 }}><Quiz /></div>
            </Section>
          </article>

          {/* RIGHT RAIL: outline + confusions */}
          <aside style={{ position: 'sticky', top: 20, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <p style={LS.outlineLabel}>On this page</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.map(s => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} onClick={() => setActiveAnchor(s.id)} style={{
                      display: 'block', padding: '4px 10px', borderLeft: `2px solid ${activeAnchor === s.id ? 'var(--text)' : 'var(--border)'}`,
                      color: activeAnchor === s.id ? 'var(--text)' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: activeAnchor === s.id ? 600 : 400,
                      textDecoration: 'none',
                    }}>{s.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={LS.outlineLabel}>Your flags <span style={{ color: 'var(--confuse)' }}>· {HERO_CONFUSIONS.length}</span></p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {HERO_CONFUSIONS.map((c, i) => (
                  <li key={i} style={{ padding: 8, background: 'var(--confuse-soft)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--confuse)' }}>{fmtTime(c.at)}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.4 }}>{c.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                <Icon name="sparkle" size={11} style={{ verticalAlign: -1 }} />&nbsp;
                AI suggests reviewing <strong style={{ color: 'var(--text)' }}>BOLD signal</strong> &amp; <strong style={{ color: 'var(--text)' }}>anti-correlation</strong> before next class.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Ask Professor button + popover */}
      <button
        onClick={() => setChatOpen(o => !o)}
        aria-label="Ask Professor"
        style={{
          position: 'absolute', bottom: 22, right: 22, zIndex: 30,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: chatOpen ? '8px' : '8px 14px 8px 10px',
          borderRadius: 999,
          background: 'var(--text)', color: 'var(--bg)',
          border: 0, cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          transition: 'padding 120ms ease',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 99,
          background: 'var(--accent)', color: 'white',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={chatOpen ? 'x' : 'graduation'} size={12} stroke={2} />
        </span>
        {!chatOpen && <span style={{ fontSize: 12.5, fontWeight: 500 }}>Ask Professor</span>}
      </button>

      {chatOpen && (
        <div
          className="fade-in"
          style={{
            position: 'absolute', bottom: 70, right: 22, zIndex: 30,
            width: 380, height: 520, maxHeight: 'calc(100vh - 110px)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-pop)',
            overflow: 'hidden',
          }}
        >
          <Chat />
        </div>
      )}
    </div>
  );
}

function Section({ id, title, sub, children }) {
  return (
    <section id={id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{title}</h2>
        {sub && <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function DocBreadcrumb({ course, title, onBack }) {
  return (
    <>
      <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={onBack}>
        <Icon name="chevronLeft" size={13} />
      </button>
      {course && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{course.code}</span>}
      <Icon name="chevronRight" size={11} style={{ color: 'var(--text-faint)' }} />
      <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════
   VARIANT 2 · WORKBENCH
   Three-pane IDE: outline | notes | inspector (tabbed)
═════════════════════════════════════════════════════════════════ */
function VariantWorkbench({ lecture, course, onBack }) {
  const { HERO_CORNELL, HERO_CONFUSIONS } = window.PSData;
  const [tab, setTab] = useState('chat');
  const [activeIdx, setActiveIdx] = useState(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <span className="chip"><Icon name="clock" size={11} /> {lecture.durationLabel}</span>
        <button className="btn"><Icon name="play" size={12} /> Play audio</button>
      </TopBar>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr 360px', overflow: 'hidden' }}>
        {/* LEFT: outline tree */}
        <aside style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={LS.paneLabel}>Outline</span>
            <button className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="outline" size={12} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {HERO_CORNELL.cues.map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '7px 14px', width: '100%', textAlign: 'left',
                  background: activeIdx === i ? 'var(--bg-sunken)' : 'transparent',
                  border: 0, borderLeft: `2px solid ${activeIdx === i ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer', color: activeIdx === i ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.cue}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-soft)' }}>{fmtTime(c.at)}</span>
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px' }}>
            <span style={LS.paneLabel}>Confusions ({HERO_CONFUSIONS.length})</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
              {HERO_CONFUSIONS.map((c, i) => (
                <div key={i} style={{ padding: '6px 8px', background: 'var(--confuse-soft)', borderRadius: 4, fontSize: 11, color: 'var(--text)', display: 'flex', gap: 6 }}>
                  <span className="mono" style={{ color: 'var(--confuse)', flexShrink: 0 }}>{fmtTime(c.at)}</span>
                  <span style={{ lineHeight: 1.4 }}>{c.note}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER: notes editor view */}
        <main style={{ overflowY: 'auto', background: 'var(--bg-sunken)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)', marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: course?.color }} />
              {course?.code} / {course?.name}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 38,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              margin: '0 0 4px',
            }}>{lecture.title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>{lecture.subtitle}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <CornellBlock />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <KeyPoints />
                <ActionItems />
              </div>
              <Vocab />
            </div>
          </div>
        </main>

        {/* RIGHT: inspector tabs */}
        <aside style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              { k: 'chat', label: 'Chat', icon: 'message' },
              { k: 'cards', label: 'Cards', icon: 'cards' },
              { k: 'quiz', label: 'Quiz', icon: 'check' },
              { k: 'audio', label: 'Audio', icon: 'wave' },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                flex: 1, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: 'transparent', border: 0,
                borderBottom: `2px solid ${tab === t.k ? 'var(--text)' : 'transparent'}`,
                color: tab === t.k ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                <Icon name={t.icon} size={13} />
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {tab === 'chat' && <Chat />}
            {tab === 'cards' && <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}><Flashcards /></div>}
            {tab === 'quiz' && <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}><Quiz /></div>}
            {tab === 'audio' && <AudioInspector lecture={lecture} />}
          </div>
        </aside>
      </div>
      {/* status bar */}
      <div style={LS.statusBar}>
        <span><Icon name="bolt" size={11} style={{ verticalAlign: -1 }} /> processed in 18s</span>
        <span>·</span>
        <span>{HERO_CORNELL.cues.length} cue rows</span>
        <span>·</span>
        <span>8 cards</span>
        <span>·</span>
        <span style={{ color: 'var(--confuse)' }}>{HERO_CONFUSIONS.length} open questions</span>
        <span style={{ flex: 1 }} />
        <span className="mono">{lecture.durationLabel} · 16kbps</span>
      </div>
    </div>
  );
}

function AudioInspector({ lecture }) {
  const [t, setT] = useState(0);
  const total = lecture.duration;
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={LS.paneLabel}>Audio</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(t)} / {lecture.durationLabel}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: 99 }}>
          <Icon name="play" size={14} />
        </button>
        <div style={{ flex: 1, height: 36, position: 'relative', background: 'var(--bg-sunken)', borderRadius: 6, overflow: 'hidden' }}>
          <MiniWave count={48} active={t / total} onSeek={f => setT(Math.floor(total * f))} />
        </div>
      </div>
      <div>
        <span style={LS.paneLabel}>Transcript</span>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {window.PSData.HERO_TRANSCRIPT_SNIPPETS.map((s, i) => (
            <button key={i} onClick={() => setT(s.at)} style={{
              background: 'transparent', border: 0, padding: '4px 6px', cursor: 'pointer', textAlign: 'left',
              color: t >= s.at && t < s.at + 200 ? 'var(--text)' : 'var(--text-muted)',
              borderRadius: 4,
            }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-soft)' }}>{fmtTime(s.at)}</span>
              <p style={{ fontSize: 12, margin: '2px 0 0', lineHeight: 1.5 }}>{s.t}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniWave({ count = 48, active = 0.3, onSeek }) {
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7)) * 0.7), [count]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 6px', gap: 2 }}
         onClick={e => {
           const r = e.currentTarget.getBoundingClientRect();
           onSeek?.(((e.clientX - r.left) / r.width));
         }}>
      {seeds.map((v, i) => {
        const isActive = i / count <= active;
        return (
          <span key={i} style={{
            display: 'inline-block', width: 2, height: `${v * 100}%`,
            background: isActive ? 'var(--accent)' : 'var(--border-strong)',
            borderRadius: 1, flex: 1, minWidth: 2,
          }} />
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   VARIANT 3 · TABS
   Notion-style maximized tabs at top. Each tab fills the page.
═════════════════════════════════════════════════════════════════ */
function VariantTabs({ lecture, course, onBack }) {
  const [tab, setTab] = useState('notes');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar breadcrumb={<DocBreadcrumb course={course} title={lecture.title} onBack={onBack} />}>
        <button className="btn"><Icon name="copy" size={13} /></button>
        <button className="btn btn-accent"><Icon name="sparkle" size={13} /> Ask</button>
      </TopBar>
      <LectureHeader lecture={lecture} course={course} />
      {/* TAB BAR */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', gap: 4 }}>
        {[
          { k: 'notes',   label: 'Notes',       icon: 'book',   count: window.PSData.HERO_CORNELL.cues.length },
          { k: 'vocab',   label: 'Vocabulary',  icon: 'list',   count: window.PSData.HERO_VOCAB.length },
          { k: 'cards',   label: 'Flashcards',  icon: 'cards',  count: 8 },
          { k: 'quiz',    label: 'Quiz',        icon: 'check',  count: 5 },
          { k: 'transcript', label: 'Transcript', icon: 'wave' },
          { k: 'chat',    label: 'Ask Professor', icon: 'message' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '10px 14px', background: 'transparent', border: 0,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            borderBottom: `2px solid ${tab === t.k ? 'var(--text)' : 'transparent'}`,
            color: tab === t.k ? 'var(--text)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: tab === t.k ? 600 : 500, cursor: 'pointer',
            marginBottom: -1,
          }}>
            <Icon name={t.icon} size={14} />
            {t.label}
            {t.count != null && <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              padding: '1px 5px', borderRadius: 4,
              background: tab === t.k ? 'var(--text)' : 'var(--bg-sunken)',
              color: tab === t.k ? 'var(--bg)' : 'var(--text-soft)',
            }}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px' }}>
          {tab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '14px 18px', background: 'var(--accent-soft)', borderRadius: 'var(--r-lg)', borderLeft: '3px solid var(--accent)' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, margin: 0, color: 'var(--text)' }}>
                  {window.PSData.HERO_CORNELL.summary}
                </p>
              </div>
              <CornellBlock />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                <KeyPoints />
                <ActionItems />
              </div>
            </div>
          )}
          {tab === 'vocab' && <Vocab />}
          {tab === 'cards' && <div className="card"><Flashcards /></div>}
          {tab === 'quiz' && <div className="card"><Quiz /></div>}
          {tab === 'transcript' && <TranscriptView />}
          {tab === 'chat' && <div style={{ height: 'calc(100vh - 320px)', minHeight: 420 }}><Chat inline /></div>}
        </div>
      </div>
    </div>
  );
}

function TranscriptView() {
  const [active, setActive] = useState(null);
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full transcript</span>
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Click any line to play from there</span>
        <span style={{ flex: 1 }} />
        <input placeholder="Search transcript…" style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', outline: 'none', width: 200 }} />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 600, overflowY: 'auto' }}>
        {window.PSData.HERO_TRANSCRIPT_SNIPPETS.map((s, i) => (
          <div key={i} onClick={() => setActive(i)} style={{
            display: 'flex', gap: 14, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
            background: active === i ? 'var(--accent-soft)' : 'transparent',
          }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)', width: 50, flexShrink: 0, paddingTop: 2 }}>{fmtTime(s.at)}</span>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, color: 'var(--text)' }}>{s.t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* shared label */
const LS = {
  paneLabel: {
    fontSize: 10, fontWeight: 600, color: 'var(--text-soft)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  outlineLabel: {
    fontSize: 10, fontWeight: 600, color: 'var(--text-soft)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    margin: '0 0 8px',
    padding: '0 10px',
  },
  statusBar: {
    flexShrink: 0,
    height: 24,
    padding: '0 14px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-sunken)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 10.5,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
};

window.VariantDocument = VariantDocument;
window.VariantWorkbench = VariantWorkbench;
window.VariantTabs = VariantTabs;
window.LectureHeader = LectureHeader;
window.DocBreadcrumb = DocBreadcrumb;
window.lectureStyles = LS;
