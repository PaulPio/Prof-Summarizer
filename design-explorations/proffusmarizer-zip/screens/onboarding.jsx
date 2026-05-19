/* global React, Icon */
const { useState, useEffect } = React;

/* ════════════════════════════════════════════════════════════════
   ONBOARDING — full-screen wizard with Free / Pro plan picker
═══════════════════════════════════════════════════════════════ */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    sub: 'forever',
    blurb: 'Bring your own API key. Unlimited everything, paid through your provider directly.',
    bullets: [
      { ok: true,  t: 'Unlimited lectures, transcripts, and notes' },
      { ok: true,  t: 'All 6 lecture views (Document · Tabs · Timeline …)' },
      { ok: true,  t: 'Flashcards · quiz · Ask Professor · Notion export' },
      { ok: false, t: 'You manage the API key (Gemini / OpenAI / Anthropic / OpenRouter)' },
      { ok: false, t: 'Pipeline + agents run on your quota' },
      { ok: false, t: 'No cloud sync — local-first storage' },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Studio Pro',
    price: '$9.99',
    sub: '/ month',
    blurb: 'Everything in Free, plus our managed AI, agents, and cloud sync. No API keys, no fuss.',
    bullets: [
      { ok: true, t: 'All Free features' },
      { ok: true, t: 'Managed AI — no keys, no rate limits, no setup' },
      { ok: true, t: 'Background agents (Auto-Organizer · Research · Study Planner)' },
      { ok: true, t: 'Cloud sync across devices · encrypted at rest' },
      { ok: true, t: 'Priority transcription · live captions' },
      { ok: true, t: 'Email digest · weekly study report' },
    ],
    badge: '7-day free trial',
  },
};

function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0); // 0..5
  const [plan, setPlan] = useState('pro');
  const [name, setName] = useState('Ari Salgado');
  const [year, setYear] = useState('2nd year');
  const [program, setProgram] = useState('Cognitive Science');
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [coursesPicked, setCoursesPicked] = useState(['Cognitive Neuroscience', 'Macroeconomics II', 'Distributed Systems']);

  const steps = [
    { id: 'welcome',  label: 'Welcome' },
    { id: 'plan',     label: 'Plan' },
    { id: 'setup',    label: plan === 'pro' ? 'Subscribe' : 'API key' },
    { id: 'courses',  label: 'Courses' },
    { id: 'done',     label: 'Done' },
  ];

  // keyboard
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Enter' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        next();
      }
      if (e.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div style={S.shell}>
      {/* LEFT — editorial / hero column */}
      <aside style={S.aside}>
        <div style={S.asideTop}>
          <div style={S.brandMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="4" fill="var(--text)" />
              <path d="M7 8h10M7 12h7M7 16h5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="18" cy="16" r="2" fill="var(--rec)" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>ProfSummarizer</div>
            <div style={{ fontSize: 10, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Studio · Setup</div>
          </div>
        </div>

        <div style={S.asideMain}>
          <p style={S.eyebrow}>{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')} — {steps[step].label}</p>
          <h1 style={S.headline}>{HEADLINE[step]}</h1>
          <p style={S.subhead}>{SUBHEAD[step]}</p>

          <ol style={S.stepList}>
            {steps.map((s, i) => (
              <li key={s.id} onClick={() => i < step && setStep(i)} style={{
                ...S.stepListItem,
                ...(i === step ? S.stepListItemActive : null),
                ...(i < step ? S.stepListItemDone : null),
                cursor: i < step ? 'pointer' : 'default',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 99,
                  border: `1.5px solid ${i <= step ? 'var(--text)' : 'var(--border-strong)'}`,
                  background: i < step ? 'var(--text)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--bg)', flexShrink: 0,
                }}>
                  {i < step ? <Icon name="check" size={11} stroke={2.5} /> : <span style={{
                    width: 5, height: 5, borderRadius: 99,
                    background: i === step ? 'var(--text)' : 'transparent',
                  }} />}
                </span>
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div style={S.asideFooter}>
          <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>
            Already have an account? <a href="#" style={{ color: 'var(--text)', fontWeight: 500 }}>Sign in</a>
          </p>
        </div>
      </aside>

      {/* RIGHT — form column */}
      <main style={S.main}>
        <div style={S.mainInner}>
          {step === 0 && (
            <StepWelcome name={name} setName={setName} year={year} setYear={setYear} program={program} setProgram={setProgram} />
          )}
          {step === 1 && (
            <StepPlan plan={plan} setPlan={setPlan} />
          )}
          {step === 2 && plan === 'pro' && (
            <StepCheckout card={card} setCard={setCard} name={name} />
          )}
          {step === 2 && plan === 'free' && (
            <StepApiKey provider={provider} setProvider={setProvider} apiKey={apiKey} setApiKey={setApiKey} />
          )}
          {step === 3 && (
            <StepCourses coursesPicked={coursesPicked} setCoursesPicked={setCoursesPicked} />
          )}
          {step === 4 && (
            <StepDone name={name} plan={plan} />
          )}
        </div>

        <footer style={S.footer}>
          {step > 0 ? (
            <button onClick={back} className="btn"><Icon name="chevronLeft" size={13} /> Back</button>
          ) : <span />}
          <span style={{ flex: 1 }} />
          {step < steps.length - 1 ? (
            <>
              {(step === 0 || step === 3) && (
                <button onClick={next} className="btn btn-ghost">Skip</button>
              )}
              <button onClick={next} className="btn btn-accent">
                {step === 1 && plan === 'pro' && <>Start 7-day trial <Icon name="arrowRight" size={13} /></>}
                {step === 1 && plan === 'free' && <>Continue with Free <Icon name="arrowRight" size={13} /></>}
                {step === 2 && plan === 'pro' && <><Icon name="check" size={13} /> Subscribe — 7 days free</>}
                {step === 2 && plan === 'free' && <>Continue <Icon name="arrowRight" size={13} /></>}
                {step !== 1 && step !== 2 && <>Continue <Icon name="arrowRight" size={13} /></>}
              </button>
            </>
          ) : (
            <button onClick={onFinish} className="btn btn-accent" style={{ padding: '10px 18px' }}>
              <Icon name="sparkle" size={14} /> Open ProfSummarizer
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}

const HEADLINE = [
  'Welcome.',
  'Pick a plan.',
  'Two ways to pay.',
  'Your classes.',
  'You\u2019re ready.',
];
const SUBHEAD = [
  'A quiet workspace for lectures, notes, and the in-between thinking. Five short steps.',
  'Either bring your own API key, or let us run the AI for you. Switch anytime.',
  'Free is free forever. Pro adds managed AI, agents, and sync — 7 days on us.',
  'Drop in a few courses so we can sort your captures from day one. You can skip this.',
  'Everything\u2019s set. Capture your first lecture, or browse the demo workspace.',
];

/* ───── step components ───── */

function StepWelcome({ name, setName, year, setYear, program, setProgram }) {
  return (
    <div style={S.stepCard}>
      <FormTitle title="A bit about you" sub="Used in the rail and your weekly digest." />
      <FormRow label="Display name">
        <input value={name} onChange={e => setName(e.target.value)} style={S.input} placeholder="What should we call you?" />
      </FormRow>
      <FormRow label="Program">
        <input value={program} onChange={e => setProgram(e.target.value)} style={S.input} placeholder="e.g. Cognitive Science" />
      </FormRow>
      <FormRow label="Year">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['1st year', '2nd year', '3rd year', '4th year', 'Grad', 'Other'].map(y => (
            <button key={y} type="button" onClick={() => setYear(y)} style={{
              padding: '6px 12px',
              background: year === y ? 'var(--text)' : 'var(--bg-elev)',
              color: year === y ? 'var(--bg)' : 'var(--text-muted)',
              border: `1px solid ${year === y ? 'var(--text)' : 'var(--border)'}`,
              borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
            }}>{y}</button>
          ))}
        </div>
      </FormRow>
      <FormRow label="Avatar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #c084fc)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>{name.split(' ').map(p => p[0]).slice(0, 2).join('') || '·'}</div>
          <button className="btn">Upload photo</button>
        </div>
      </FormRow>
    </div>
  );
}

function StepPlan({ plan, setPlan }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[PLANS.free, PLANS.pro].map(p => (
        <article key={p.id}
          onClick={() => setPlan(p.id)}
          style={{
            border: `1px solid ${plan === p.id ? 'var(--text)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: 18,
            background: 'var(--bg-elev)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'border-color 100ms',
          }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{
              width: 18, height: 18, borderRadius: 99,
              border: `2px solid ${plan === p.id ? 'var(--text)' : 'var(--border-strong)'}`,
              background: plan === p.id ? 'var(--text)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}>
              {plan === p.id && <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--bg)' }} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{p.name}</h3>
                {p.badge && <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent', fontSize: 10 }}>{p.badge}</span>}
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>{p.price}</span>
                <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{p.sub}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 12px', lineHeight: 1.5 }}>{p.blurb}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'flex-start', color: b.ok ? 'var(--text)' : 'var(--text-muted)' }}>
                    <Icon name="check" size={13} stroke={2.4} style={{ color: b.ok ? 'var(--good)' : 'var(--text-soft)', marginTop: 2, flexShrink: 0 }} />
                    <span>{b.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
      <p style={{ fontSize: 11.5, color: 'var(--text-soft)', textAlign: 'center', margin: '4px 0 0' }}>
        Cancel anytime · No charges during the 7-day trial · Refunds within 14 days
      </p>
    </div>
  );
}

function StepCheckout({ card, setCard, name }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* trial banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--accent-soft)', borderRadius: 10, border: '1px solid transparent' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 99,
          background: 'var(--accent)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="sparkle" size={16} /></div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)', margin: 0 }}>You won&apos;t be charged today.</p>
          <p style={{ fontSize: 11.5, color: 'var(--accent-text)', margin: '2px 0 0', opacity: 0.8 }}>
            7-day free trial · then $9.99/mo · cancel anytime from Settings
          </p>
        </div>
      </div>

      {/* order summary */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Order summary</span>
        </div>
        <SummaryRow label="Studio Pro · monthly" sub="Renews May 26 if you don't cancel" right="$9.99" />
        <SummaryRow label="7-day free trial" sub="Today through May 26, 2026" right="−$9.99" muted last />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-sunken)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Due today</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>$0.00</span>
        </div>
      </div>

      {/* payment via stripe */}
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Payment method</span>
          <StripeBadge />
        </div>

        <FormRow label="Card number">
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              value={card.number}
              onChange={e => setCard(c => ({ ...c, number: formatCard(e.target.value) }))}
              placeholder="1234 5678 9012 3456"
              style={{ ...S.input, fontFamily: 'var(--font-mono)', paddingLeft: 12, paddingRight: 80 }}
            />
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
              <CardBrand brand="visa" />
              <CardBrand brand="mc" />
              <CardBrand brand="amex" />
            </div>
          </div>
        </FormRow>
        <div style={{ display: 'flex', gap: 8 }}>
          <FormRow label="Expiry" stack>
            <input
              value={card.expiry}
              onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
              placeholder="MM / YY"
              style={{ ...S.input, fontFamily: 'var(--font-mono)' }}
            />
          </FormRow>
          <FormRow label="CVC" stack>
            <input
              value={card.cvc}
              onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="123"
              style={{ ...S.input, fontFamily: 'var(--font-mono)' }}
            />
          </FormRow>
        </div>
        <FormRow label="Cardholder name">
          <input value={card.name || name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} style={S.input} placeholder="Name on card" />
        </FormRow>
        <FormRow label="Country">
          <select style={S.input}>
            <option>United States</option><option>United Kingdom</option><option>Canada</option><option>Other…</option>
          </select>
        </FormRow>
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--text-soft)', textAlign: 'center', margin: '4px 0 0', lineHeight: 1.5 }}>
        By starting your trial you agree to our <a href="#" style={{ color: 'var(--text-muted)' }}>Terms</a> and <a href="#" style={{ color: 'var(--text-muted)' }}>Privacy</a>.
        We&apos;ll email you 2 days before your trial ends.
      </p>
    </div>
  );
}

function SummaryRow({ label, sub, right, muted, last }) {
  return (
    <div style={{
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: last ? 0 : '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: muted ? 'var(--good)' : 'var(--text)', fontWeight: 500 }}>{right}</span>
    </div>
  );
}

function StripeBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 4,
      background: '#635bff', color: 'white',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      fontFamily: 'var(--font-ui)',
    }}>
      <Icon name="check" size={9} stroke={3} />
      SECURE · STRIPE
    </span>
  );
}

function CardBrand({ brand }) {
  const styles = {
    visa: { bg: '#1a1f71', color: 'white', text: 'VISA' },
    mc:   { bg: '#fff',    color: '#eb001b', text: 'MC', border: '1px solid var(--border)' },
    amex: { bg: '#0070ad', color: 'white', text: 'AMEX' },
  };
  const s = styles[brand];
  return (
    <span style={{
      padding: '2px 6px', borderRadius: 3,
      background: s.bg, color: s.color,
      fontSize: 8.5, fontWeight: 800, letterSpacing: '0.02em',
      border: s.border || 0, fontFamily: 'var(--font-mono)',
    }}>{s.text}</span>
  );
}

function formatCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

function StepApiKey({ provider, setProvider, apiKey, setApiKey }) {
  const providers = [
    { id: 'gemini',     name: 'Gemini',    sub: 'Free tier, multimodal', free: true, kbd: 'aistudio.google.com' },
    { id: 'openai',     name: 'OpenAI',    sub: 'gpt-4o-mini · fast',    kbd: 'platform.openai.com' },
    { id: 'anthropic',  name: 'Claude',    sub: 'Sonnet 4.6 · best prose', kbd: 'console.anthropic.com' },
    { id: 'openrouter', name: 'OpenRouter', sub: 'One key · 200+ models', kbd: 'openrouter.ai' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-sunken)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--text)' }}>Free forever.</strong> ProfSummarizer reads your API key locally and sends prompts straight to your provider. You pay them, not us.
      </div>
      <FormTitle title="1. Choose your provider" sub="You can switch later in Settings." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {providers.map(p => (
          <button key={p.id} onClick={() => setProvider(p.id)} style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: 12, textAlign: 'left',
            background: provider === p.id ? 'var(--accent-soft)' : 'var(--bg-elev)',
            border: `1px solid ${provider === p.id ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, cursor: 'pointer', color: 'var(--text)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 14, height: 14, borderRadius: 99,
                border: `1.5px solid ${provider === p.id ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: provider === p.id ? 'var(--accent)' : 'transparent', flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              {p.free && <span className="chip" style={{ fontSize: 9, padding: '1px 5px', background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}>free tier</span>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{p.sub}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{p.kbd}</span>
          </button>
        ))}
      </div>
      <FormTitle title="2. Paste your API key" sub="Encrypted at rest. We never see it in plaintext on our servers." />
      <FormRow label="API key">
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={'sk-' + (provider === 'anthropic' ? 'ant-' : '') + '…'}
          style={{ ...S.input, fontFamily: 'var(--font-mono)' }}
        />
      </FormRow>
      <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="question" size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Don&apos;t have a key yet?</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.5 }}>
            You can skip this step and start in demo mode — limited to 3 lectures, no AI features until you add a key.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepCourses({ coursesPicked, setCoursesPicked }) {
  const [input, setInput] = useState('');
  const suggestions = ['Linear Algebra', 'Organic Chemistry I', 'Modern Philosophy', 'Algorithms II', 'Microeconomics', 'World History'];

  const add = (label) => {
    if (!label || coursesPicked.includes(label)) return;
    setCoursesPicked([...coursesPicked, label]);
    setInput('');
  };
  const remove = (label) => setCoursesPicked(coursesPicked.filter(c => c !== label));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormTitle title="Add a few courses" sub="You can paste a schedule from Notion or upload an .ics calendar — or just type." />
      <form onSubmit={e => { e.preventDefault(); add(input); }} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a course name…"
          style={{ ...S.input, flex: 1 }}
        />
        <button type="submit" className="btn btn-primary"><Icon name="plus" size={13} /> Add</button>
      </form>
      <div className="card" style={{ padding: coursesPicked.length === 0 ? 24 : 0 }}>
        {coursesPicked.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: 0, textAlign: 'center' }}>No courses yet — add some above, or skip and do it later.</p>
        ) : (
          coursesPicked.map((c, i) => (
            <div key={c} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: i === coursesPicked.length - 1 ? 0 : '1px solid var(--border-subtle)',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2,
                background: ['var(--accent)', 'var(--confuse)', 'var(--good)', '#db2777', '#0ea5e9', '#7c3aed'][i % 6],
              }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c}</span>
              <button onClick={() => remove(c)} className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="x" size={12} /></button>
            </div>
          ))
        )}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-soft)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.02em' }}>Quick add</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {suggestions.filter(s => !coursesPicked.includes(s)).map(s => (
            <button key={s} className="chip" style={{ cursor: 'pointer' }} onClick={() => add(s)}>
              <Icon name="plus" size={10} /> {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="upload" size={14} style={{ color: 'var(--text-muted)' }} />
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>Or import from <strong style={{ color: 'var(--text)' }}>.ics calendar</strong> or <strong style={{ color: 'var(--text)' }}>schedule PDF</strong></span>
        <button className="btn" style={{ padding: '4px 10px' }}>Import</button>
      </div>
    </div>
  );
}

function StepDone({ name, plan }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 99,
        background: 'var(--good-soft)', color: 'var(--good)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="check" size={28} stroke={2.5} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
        Welcome aboard, {name.split(' ')[0]}.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, maxWidth: 380, lineHeight: 1.55 }}>
        {plan === 'pro'
          ? 'Your 7-day trial starts now. We\u2019ll email you 2 days before it ends — no surprises.'
          : 'Free forever. You can switch to Studio Pro anytime from Settings.'}
      </p>

      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
        <NextCard icon="mic" title="Record" sub="Start with a live lecture" />
        <NextCard icon="upload" title="Upload" sub="Bring an old audio file" />
        <NextCard icon="book" title="Tour" sub="See a demo lecture" />
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: '12px 0 0' }}>
        Tip: press <span className="kbd">⌘ K</span> anywhere to open the command palette.
      </p>
    </div>
  );
}

function NextCard({ icon, title, sub }) {
  return (
    <button className="card" style={{
      padding: 12, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <Icon name={icon} size={16} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</span>
    </button>
  );
}

/* ───── small primitives ───── */

function FormTitle({ title, sub }) {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{title}</h3>
      {sub && <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '4px 0 0', lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function FormRow({ label, children, stack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: stack ? 1 : 'initial' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

const S = {
  shell: {
    display: 'flex',
    height: '100vh', width: '100vw',
    background: 'var(--bg)',
  },
  aside: {
    width: 380, flexShrink: 0,
    background: 'var(--bg-sunken)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    padding: '24px 28px',
  },
  asideTop: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 40,
  },
  brandMark: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg-elev)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  asideMain: {
    flex: 1,
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  eyebrow: {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--accent)',
    margin: 0, fontFamily: 'var(--font-mono)',
  },
  headline: {
    fontFamily: 'var(--font-serif)', fontStyle: 'italic',
    fontSize: 60, fontWeight: 400, letterSpacing: '-0.03em',
    lineHeight: 0.95, margin: 0,
  },
  subhead: {
    fontSize: 14, color: 'var(--text-muted)',
    lineHeight: 1.55, margin: 0,
  },
  stepList: {
    margin: '24px 0 0', padding: 0, listStyle: 'none',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  stepListItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 8px',
    fontSize: 12.5,
    color: 'var(--text-soft)',
    borderRadius: 6,
  },
  stepListItemActive: {
    color: 'var(--text)', fontWeight: 600,
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
  },
  stepListItemDone: {
    color: 'var(--text-muted)',
  },
  asideFooter: {
    paddingTop: 18,
    borderTop: '1px solid var(--border)',
  },
  main: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  mainInner: {
    flex: 1, overflowY: 'auto',
    padding: '32px 48px',
    display: 'flex', flexDirection: 'column',
    gap: 14,
    maxWidth: 560, width: '100%',
    margin: '0 auto',
  },
  stepCard: {
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  footer: {
    flexShrink: 0,
    padding: '14px 48px',
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg)',
  },
  input: {
    width: '100%', padding: '8px 10px',
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 13, outline: 'none',
    color: 'var(--text)',
  },
};

window.Onboarding = Onboarding;
