/* global React, ReactDOM, Icon, PSData, CourseRail, TopBar,
   Dashboard, Record,
   VariantDocument, VariantWorkbench, VariantTabs,
   VariantCommand, VariantTimeline, VariantCanvas,
   TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, useTweaks, fmtDate */

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "compact",
  "variant": "document",
  "accent": "indigo"
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  indigo: { v: '#5b5bd6', h: '#4d4dc4', s: '#eeeefb', t: '#4338ca', vd: '#818cf8', hd: '#6f7af0', sd: '#1d1d35', td: '#c4caff' },
  emerald: { v: '#059669', h: '#047857', s: '#d1fae5', t: '#065f46', vd: '#34d399', hd: '#10b981', sd: '#0f2820', td: '#a7f3d0' },
  graphite: { v: '#1f2937', h: '#0f172a', s: '#e5e7eb', t: '#0f172a', vd: '#e5e7eb', hd: '#fafafa', sd: '#1f1f1f', td: '#e5e7eb' },
  amber: { v: '#d97706', h: '#b45309', s: '#fef3c7', t: '#92400e', vd: '#fbbf24', hd: '#f59e0b', sd: '#2a1a05', td: '#fde68a' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState('lecture');             // dashboard | record | lecture | inbox | saved | settings | onboarding
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeLectureId, setActiveLectureId] = useState('l1');

  // apply theme + density to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.setAttribute('data-density', t.density);
  }, [t.theme, t.density]);

  // apply accent
  useEffect(() => {
    const a = ACCENT_MAP[t.accent] || ACCENT_MAP.indigo;
    const root = document.documentElement;
    if (t.theme === 'dark') {
      root.style.setProperty('--accent', a.vd);
      root.style.setProperty('--accent-hover', a.hd);
      root.style.setProperty('--accent-soft', a.sd);
      root.style.setProperty('--accent-text', a.td);
    } else {
      root.style.setProperty('--accent', a.v);
      root.style.setProperty('--accent-hover', a.h);
      root.style.setProperty('--accent-soft', a.s);
      root.style.setProperty('--accent-text', a.t);
    }
  }, [t.accent, t.theme]);

  const lecture = window.PSData.LECTURES.find(l => l.id === activeLectureId) || window.PSData.LECTURES[0];
  const course = window.PSData.COURSES.find(c => c.id === lecture.courseId);

  const onOpenLecture = (id) => { setActiveLectureId(id); setRoute('lecture'); };
  const onStartRecord = () => setRoute('record');
  const onBackToList = () => setRoute('dashboard');

  let mainScreen;
  if (route === 'onboarding') {
    return <Onboarding onFinish={() => setRoute('dashboard')} />;
  } else if (route === 'settings') {
    mainScreen = <Settings onBack={() => setRoute('dashboard')} />;
  } else if (route === 'planner') {
    mainScreen = <Planner onBack={() => setRoute('dashboard')} />;
  } else if (route === 'inbox') {
    mainScreen = <Inbox onOpenLecture={onOpenLecture} />;
  } else if (route === 'saved') {
    mainScreen = <Saved onOpenLecture={onOpenLecture} />;
  } else if (route === 'dashboard') {
    mainScreen = (
      <Dashboard
        activeCourseId={activeCourseId}
        setActiveCourseId={setActiveCourseId}
        onOpenLecture={onOpenLecture}
        onStartRecord={onStartRecord}
        density={t.density}
      />
    );
  } else if (route === 'record') {
    mainScreen = (
      <Record
        activeCourseId={activeCourseId}
        onCancel={() => setRoute('dashboard')}
        onComplete={() => { setActiveLectureId('l1'); setRoute('lecture'); }}
      />
    );
  } else {
    const Variant = {
      document: VariantDocument,
      workbench: VariantWorkbench,
      tabs: VariantTabs,
      command: VariantCommand,
      timeline: VariantTimeline,
      canvas: VariantCanvas,
    }[t.variant] || VariantDocument;
    mainScreen = <Variant lecture={lecture} course={course} onBack={onBackToList} />;
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <CourseRail
          activeCourseId={activeCourseId}
          setActiveCourseId={(id) => { setActiveCourseId(id); if (route === 'lecture') setRoute('dashboard'); }}
          route={route}
          setRoute={setRoute}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {mainScreen}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Lecture detail">
          <TweakSelect
            label="Variant"
            help="The hero IA experiment. Open a lecture to see the difference."
            value={t.variant}
            onChange={v => setTweak('variant', v)}
            options={window.PSData.VARIANTS.map(v => ({ value: v.key, label: `${v.label} — ${v.sub}` }))}
          />
          <button
            onClick={() => setRoute('lecture')}
            style={{
              marginTop: 6, padding: '6px 10px', background: 'var(--text)', color: 'var(--bg)',
              border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}
          >
            Jump to lecture detail →
          </button>
        </TweakSection>

        <TweakSection title="Theme">
          <TweakRadio
            label="Mode"
            value={t.theme}
            onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            onChange={v => setTweak('density', v)}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'cozy', label: 'Cozy' }]}
          />
          <TweakSelect
            label="Accent"
            value={t.accent}
            onChange={v => setTweak('accent', v)}
            options={[
              { value: 'indigo', label: 'Indigo (default)' },
              { value: 'emerald', label: 'Emerald' },
              { value: 'graphite', label: 'Graphite' },
              { value: 'amber', label: 'Amber' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Navigation">
          <button onClick={() => setRoute('dashboard')} style={miniBtn(route === 'dashboard')}>Dashboard</button>
          <button onClick={() => setRoute('record')} style={miniBtn(route === 'record')}>Record</button>
          <button onClick={() => setRoute('lecture')} style={miniBtn(route === 'lecture')}>Lecture detail</button>
          <button onClick={() => setRoute('planner')} style={miniBtn(route === 'planner')}>Study Planner</button>
          <button onClick={() => setRoute('inbox')} style={miniBtn(route === 'inbox')}>Inbox</button>
          <button onClick={() => setRoute('saved')} style={miniBtn(route === 'saved')}>Saved</button>
          <button onClick={() => setRoute('settings')} style={miniBtn(route === 'settings')}>Settings</button>
          <button onClick={() => setRoute('onboarding')} style={miniBtn(route === 'onboarding')}>Onboarding</button>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function miniBtn(active) {
  return {
    width: '100%',
    padding: '6px 10px',
    marginTop: 4,
    background: active ? 'var(--text)' : 'var(--bg-sunken)',
    color: active ? 'var(--bg)' : 'var(--text)',
    border: active ? '1px solid var(--text)' : '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
