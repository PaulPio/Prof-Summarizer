/* global React, Icon, PSData, TopBar */
const { useState } = React;

const SECTIONS = [
  { id: 'account',     label: 'Account',          icon: 'graduation', group: 'You' },
  { id: 'billing',     label: 'Plan & billing',   icon: 'bolt',       group: 'You' },
  { id: 'appearance',  label: 'Appearance',       icon: 'sun',        group: 'You' },
  { id: 'shortcuts',   label: 'Keyboard',         icon: 'command',    group: 'You' },

  { id: 'ai',          label: 'AI provider',      icon: 'sparkle',    group: 'Intelligence' },
  { id: 'agents',      label: 'Agents',           icon: 'bolt',       group: 'Intelligence' },
  { id: 'pipeline',    label: 'Post-capture pipeline', icon: 'layers', group: 'Intelligence' },

  { id: 'courses',     label: 'Courses & syllabi', icon: 'book',      group: 'Library' },
  { id: 'notion',      label: 'Notion',           icon: 'notion',     group: 'Library' },
  { id: 'export',      label: 'Export',           icon: 'download',   group: 'Library' },

  { id: 'audio',       label: 'Audio & capture',  icon: 'mic',        group: 'Capture' },
  { id: 'confusion',   label: 'Confusion flags',  icon: 'flag',       group: 'Capture' },

  { id: 'data',        label: 'Data & storage',   icon: 'inbox',      group: 'Advanced' },
  { id: 'danger',      label: 'Danger zone',      icon: 'alert',      group: 'Advanced' },
];

function Settings({ onBack, initialSection }) {
  const [section, setSection] = useState(initialSection || 'ai');
  const groups = ['You', 'Intelligence', 'Library', 'Capture', 'Advanced'];
  const current = SECTIONS.find(s => s.id === section);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onBack}>
              <Icon name="chevronLeft" size={13} /> Back
            </button>
            <Icon name="chevronRight" size={11} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Settings</span>
            <Icon name="chevronRight" size={11} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{current?.label}</span>
          </>
        }
      >
        <span className="chip" style={{ background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--good)' }} /> all changes saved
        </span>
      </TopBar>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
        {/* SECTION RAIL */}
        <nav style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '14px 8px', background: 'var(--bg)' }}>
          {groups.map(g => {
            const items = SECTIONS.filter(s => s.group === g);
            return (
              <div key={g} style={{ marginBottom: 12 }}>
                <div style={{ padding: '4px 10px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{g}</div>
                {items.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 10px',
                      background: section === s.id ? 'var(--bg-sunken)' : 'transparent',
                      border: '1px solid transparent',
                      borderColor: section === s.id ? 'var(--border)' : 'transparent',
                      borderRadius: 6, cursor: 'pointer',
                      color: section === s.id ? 'var(--text)' : 'var(--text-muted)',
                      fontSize: 12.5, fontWeight: section === s.id ? 600 : 500,
                      textAlign: 'left',
                    }}
                  >
                    <Icon name={s.icon} size={14} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {s.id === 'ai' && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--good)' }} />}
                    {s.id === 'notion' && <span className="chip" style={{ padding: '0 6px', fontSize: 9 }}>not connected</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* MAIN */}
        <main style={{ overflowY: 'auto' }}>
          <div style={{ maxWidth: 720, padding: '32px 36px 60px' }}>
            {section === 'account' && <AccountSection onJump={setSection} />}
            {section === 'billing' && <BillingSection />}
            {section === 'appearance' && <AppearanceSection />}
            {section === 'shortcuts' && <ShortcutsSection />}
            {section === 'ai' && <AISection />}
            {section === 'agents' && <AgentsSection />}
            {section === 'pipeline' && <PipelineSection />}
            {section === 'courses' && <CoursesSection />}
            {section === 'notion' && <NotionSection />}
            {section === 'export' && <ExportSection />}
            {section === 'audio' && <AudioSection />}
            {section === 'confusion' && <ConfusionSection />}
            {section === 'data' && <DataSection />}
            {section === 'danger' && <DangerSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────── building blocks ───────── */
function SectionHeader({ title, sub }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>{sub}</p>}
    </header>
  );
}

function Group({ title, sub, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      {title && (
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>{title}</h3>
          {sub && <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '2px 0 0' }}>{sub}</p>}
        </div>
      )}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)', overflow: 'hidden' }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, hint, children, last, vertical }) {
  return (
    <div style={{
      display: 'flex', flexDirection: vertical ? 'column' : 'row',
      alignItems: vertical ? 'stretch' : 'center',
      gap: vertical ? 8 : 16,
      padding: '14px 18px',
      borderBottom: last ? 0 : '1px solid var(--border-subtle)',
    }}>
      {(label || hint) && (
        <div style={{ flex: vertical ? 'initial' : '1 1 0', minWidth: 0 }}>
          {label && <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>}
          {hint && <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2, lineHeight: 1.45 }}>{hint}</div>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Switch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 30, height: 18, borderRadius: 99,
      background: on ? 'var(--text)' : 'var(--border-strong)',
      position: 'relative', border: 0, cursor: 'pointer', padding: 0,
      transition: 'background 100ms',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 14 : 2,
        width: 14, height: 14, borderRadius: 99,
        background: 'var(--bg)', transition: 'left 120ms',
      }} />
    </button>
  );
}

function Field({ value, placeholder, type = 'text', mono, onChange, width = 240 }) {
  return (
    <input
      type={type} value={value || ''} placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      style={{
        width, padding: '6px 10px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        fontSize: 12.5,
        outline: 'none',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      }}
    />
  );
}

function Select({ value, onChange, options, width = 240 }) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)} style={{
      width, padding: '6px 10px',
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 6, fontSize: 12.5, outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ───────── ACCOUNT ───────── */
function AccountSection({ onJump }) {
  const [name, setName] = useState('Ari Salgado');
  const [email] = useState('ari.salgado@university.edu');
  return (
    <>
      <SectionHeader title="Account" sub="Your profile and how it appears across ProfSummarizer." />
      <Group title="Profile">
        <Row label="Avatar" hint="Initial used in the rail and header.">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #c084fc)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>AS</div>
          <button className="btn">Upload</button>
        </Row>
        <Row label="Display name"><Field value={name} onChange={setName} /></Row>
        <Row label="Email" hint="University email · verified">
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{email}</span>
          <Icon name="check" size={13} style={{ color: 'var(--good)' }} />
        </Row>
        <Row label="Program" last><Field value="Cognitive Science · 2nd year" width={300} /></Row>
      </Group>
      <Group title="Plan">
        <Row label="Current plan" hint="You're on the Free plan — using your own API key.">
          <span className="chip">Free</span>
          <button className="btn btn-accent" onClick={() => onJump?.('billing')}>
            <Icon name="bolt" size={12} /> Upgrade to Pro
          </button>
        </Row>
        <Row label="Manage billing" hint="Invoices, payment method, cancel — all in one place." last>
          <button className="btn" onClick={() => onJump?.('billing')}>Open Plan & billing →</button>
        </Row>
      </Group>
      <Group title="Session">
        <Row label="Active devices" hint="2 devices · MacBook (this) · iPhone">
          <button className="btn">Sign out others</button>
        </Row>
        <Row label="Sign out" hint="End the session on this device." last>
          <button className="btn">Sign out</button>
        </Row>
      </Group>
    </>
  );
}

/* ───────── PLAN & BILLING ───────── */
function BillingSection() {
  const [plan, setPlan] = useState('free'); // toggle to see Pro view
  return (
    <>
      <SectionHeader title="Plan & billing" sub={plan === 'free'
        ? "You're using the Free plan with your own API key. Upgrade for managed AI, agents, and cloud sync."
        : "You're on Studio Pro. Manage your payment method, invoices, or cancel anytime."} />

      {/* dev toggle so user can preview both states */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '6px 10px', background: 'var(--bg-sunken)', borderRadius: 6, border: '1px dashed var(--border)' }}>
        <Icon name="sparkle" size={11} style={{ color: 'var(--text-soft)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Preview:</span>
        <button onClick={() => setPlan('free')} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          background: plan === 'free' ? 'var(--text)' : 'transparent',
          color: plan === 'free' ? 'var(--bg)' : 'var(--text-muted)',
          border: 0, cursor: 'pointer',
        }}>Free user</button>
        <button onClick={() => setPlan('pro')} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          background: plan === 'pro' ? 'var(--text)' : 'transparent',
          color: plan === 'pro' ? 'var(--bg)' : 'var(--text-muted)',
          border: 0, cursor: 'pointer',
        }}>Pro user</button>
      </div>

      {plan === 'free' ? <FreeBilling /> : <ProBilling />}
    </>
  );
}

function FreeBilling() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      {/* current plan card */}
      <Group title="Current plan">
        <Row label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="chip">Free</span>
          <span>$0 / forever</span>
        </span>}
          hint="Bring your own API key — pay your provider directly."
        >
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>since May 12, 2026</span>
        </Row>
        <Row label="API quota this month" hint="Spend tracked on your Anthropic account." last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>$3.42</span>
            <a href="#" style={{ fontSize: 11, color: 'var(--accent)' }}>View on Anthropic →</a>
          </div>
        </Row>
      </Group>

      {/* upgrade card */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(180deg, var(--accent-soft), var(--bg-elev) 60%)',
          padding: 22,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* corner badge */}
          <span style={{
            position: 'absolute', top: 14, right: 14,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: 'var(--accent)', color: 'white',
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <Icon name="sparkle" size={10} /> 7-day free trial
          </span>

          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
            Studio Pro
          </span>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em',
            margin: '6px 0 4px', lineHeight: 1.1,
          }}>Stop juggling API keys.</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.55, maxWidth: 480 }}>
            Managed AI, background agents, and cloud sync — for less than a coffee.
            Try it free for 7 days. No charge if you cancel before the trial ends.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16 }}>
            {[
              'Managed Claude Sonnet · no keys, no limits',
              'Background agents: Auto-Organizer + Research',
              'Cloud sync across devices · encrypted',
              'Priority transcription · live captions',
              'Weekly email digest of your study progress',
              'Unlimited Notion exports · auto-push on pipeline',
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'center', color: 'var(--text)' }}>
                <Icon name="check" size={12} stroke={2.5} style={{ color: 'var(--good)' }} />
                {b}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setShowCheckout(true)} className="btn btn-accent" style={{ padding: '10px 18px', fontSize: 13 }}>
              <Icon name="bolt" size={14} /> Start 7-day trial
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Then <strong style={{ color: 'var(--text)' }}>$9.99/mo</strong> · cancel anytime
            </span>
            <span style={{ flex: 1 }} />
            <a href="#" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline' }}>Compare plans</a>
          </div>
        </div>
      </section>

      {showCheckout && <InlineCheckout onClose={() => setShowCheckout(false)} />}
    </>
  );
}

function ProBilling() {
  const [showChange, setShowChange] = useState(false);
  return (
    <>
      <Group title="Current plan">
        <Row label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>Studio Pro</span>
          <span>$9.99 / month</span>
        </span>}
          hint="Renews automatically · next charge May 26, 2026"
        >
          <button className="btn" onClick={() => setShowChange(true)}>Change plan</button>
        </Row>
        <Row label="Trial status" hint="Day 4 of 7 · won't be charged if you cancel by May 26">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 4, background: 'var(--bg-sunken)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: '57%', height: '100%', background: 'var(--accent)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>3 days left</span>
          </div>
        </Row>
        <Row label="Cancel subscription" hint="Keep using Pro until the end of the current period." last>
          <button className="btn" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>Cancel plan</button>
        </Row>
      </Group>

      <Group title="Payment method">
        <Row label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '3px 7px', background: '#1a1f71', color: 'white',
            fontSize: 9, fontWeight: 800, borderRadius: 3,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
          }}>VISA</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>•••• •••• •••• 4242</span>
        </span>}
          hint="Expires 09 / 2028 · Ari Salgado"
          last
        >
          <button className="btn">Update card</button>
        </Row>
      </Group>

      <Group title="Invoices" sub="Last 6 charges. Click any row to download PDF.">
        {[
          { date: 'May 26, 2026', desc: 'Studio Pro · monthly', amount: '$9.99', status: 'upcoming' },
          { date: 'May 19, 2026', desc: 'Trial started', amount: '$0.00', status: 'paid' },
        ].map((inv, i, arr) => (
          <Row key={i} last={i === arr.length - 1}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99,
                background: inv.status === 'paid' ? 'var(--good)' : 'var(--text-soft)',
              }} />
              {inv.date}
            </span>}
            hint={inv.desc}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500 }}>{inv.amount}</span>
            <span className="chip" style={{
              background: inv.status === 'paid' ? 'var(--good-soft)' : 'var(--bg-sunken)',
              color: inv.status === 'paid' ? 'var(--good)' : 'var(--text-muted)',
              borderColor: 'transparent', fontSize: 10,
            }}>{inv.status}</span>
            <button className="icon-btn"><Icon name="download" size={12} /></button>
          </Row>
        ))}
      </Group>

      {showChange && <ChangePlanModal onClose={() => setShowChange(false)} />}
    </>
  );
}

/* Inline Stripe-style checkout (opens within Plan & Billing) */
function InlineCheckout({ onClose }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Confirm subscription</h3>
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Step 2 of 2 · You won&apos;t be charged today</span>
        <span style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '3px 8px' }}>Cancel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* SUMMARY */}
        <div className="card" style={{ padding: 0, alignSelf: 'start' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Order</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>Studio Pro · monthly</div>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>Renews May 26 if you don't cancel</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>$9.99</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>7-day free trial</div>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>Today through May 26, 2026</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--good)' }}>−$9.99</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-sunken)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Due today</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600 }}>$0.00</span>
          </div>
        </div>

        {/* PAYMENT */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Card</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 4,
              background: '#635bff', color: 'white',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              <Icon name="check" size={9} stroke={3} />
              SECURE · STRIPE
            </span>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Card number</label>
            <div style={{ position: 'relative' }}>
              <input
                value={card.number}
                onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim() }))}
                placeholder="1234 5678 9012 3456"
                style={{ ...{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--text)' }, paddingRight: 80, fontFamily: 'var(--font-mono)' }}
              />
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                <span style={{ padding: '2px 5px', borderRadius: 3, background: '#1a1f71', color: 'white', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.02em', fontFamily: 'var(--font-mono)' }}>VISA</span>
                <span style={{ padding: '2px 5px', borderRadius: 3, background: '#fff', color: '#eb001b', fontSize: 8.5, fontWeight: 800, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>MC</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Expiry</label>
              <input value={card.expiry} onChange={e => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCard(c => ({ ...c, expiry: d.length < 3 ? d : `${d.slice(0, 2)} / ${d.slice(2)}` }));
              }} placeholder="MM / YY" style={{ ...{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--text)' }, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>CVC</label>
              <input value={card.cvc} onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" style={{ ...{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--text)' }, fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Cardholder</label>
            <input value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} placeholder="Name on card" style={{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--text)' }} />
          </div>
          <button className="btn btn-accent" style={{ justifyContent: 'center', padding: '10px 12px', marginTop: 4 }}>
            <Icon name="check" size={13} stroke={2.5} /> Start 7-day trial
          </button>
          <p style={{ fontSize: 10.5, color: 'var(--text-soft)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            By starting your trial you agree to our <a href="#" style={{ color: 'var(--text-muted)' }}>Terms</a>. We'll email you 2 days before your trial ends.
          </p>
        </div>
      </div>
    </section>
  );
}

function ChangePlanModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: '100%',
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: 'var(--shadow-pop)', overflow: 'hidden',
      }} className="fade-in">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Change plan</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            You'll keep Pro features until your current period ends on <strong style={{ color: 'var(--text)' }}>May 26, 2026</strong>, then drop to Free.
          </p>
          <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, fontSize: 12, lineHeight: 1.55 }}>
            On Free, you'll lose: managed AI · background agents · cloud sync · priority transcription. Your lectures, notes, and cards stay.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Keep Pro</button>
            <button className="btn" style={{ flex: 1, justifyContent: 'center', color: 'var(--bad)', borderColor: 'var(--bad)' }}>Downgrade</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── APPEARANCE ───────── */
function AppearanceSection() {
  return (
    <>
      <SectionHeader title="Appearance" sub="Theme, density, and accent — synced with the Tweaks panel." />
      <Group title="Theme">
        <Row label="Color mode" hint="Light follows your sun. Dark is friendlier at 2am.">
          <div style={{ display: 'flex', gap: 6 }}>
            {['light', 'dark', 'system'].map(m => (
              <button key={m} className="btn" style={{ padding: '4px 10px', textTransform: 'capitalize' }}>{m}</button>
            ))}
          </div>
        </Row>
        <Row label="Accent">
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { name: 'Indigo', c: '#5b5bd6' },
              { name: 'Emerald', c: '#059669' },
              { name: 'Graphite', c: '#1f2937' },
              { name: 'Amber', c: '#d97706' },
            ].map(a => (
              <button key={a.name} title={a.name} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: a.c, cursor: 'pointer' }} />
            ))}
          </div>
        </Row>
        <Row label="Density" hint="Compact is denser; cozy is more whitespace." last>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn">Compact</button>
            <button className="btn">Cozy</button>
          </div>
        </Row>
      </Group>
      <Group title="Reading">
        <Row label="Body font">
          <Select value="geist" onChange={() => {}} options={[
            { value: 'geist', label: 'Geist (default)' },
            { value: 'inter', label: 'Inter' },
            { value: 'system', label: 'System UI' },
          ]} />
        </Row>
        <Row label="Display font" hint="Used for lecture titles and section dividers." last>
          <Select value="instrument" onChange={() => {}} options={[
            { value: 'instrument', label: 'Instrument Serif (default)' },
            { value: 'dmserif', label: 'DM Serif Display' },
            { value: 'fraunces', label: 'Fraunces' },
            { value: 'none', label: 'No display font — use body font' },
          ]} />
        </Row>
      </Group>
      <Group title="Default lecture view">
        <Row label="When I open a lecture, show…" hint="The variant explored in the Tweaks panel." last>
          <Select value="document" onChange={() => {}} options={[
            { value: 'document', label: 'Document' },
            { value: 'workbench', label: 'Workbench' },
            { value: 'tabs', label: 'Tabs' },
            { value: 'command', label: 'Command' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'canvas', label: 'Canvas' },
          ]} />
        </Row>
      </Group>
    </>
  );
}

/* ───────── SHORTCUTS ───────── */
function ShortcutsSection() {
  const shortcuts = [
    { sec: 'Global', items: [
      ['Open command palette', ['⌘', 'K']],
      ['Search everything', ['⌘', '/']],
      ['New capture', ['⌘', 'N']],
      ['Toggle sidebar', ['⌘', '\\']],
      ['Toggle dark mode', ['⌘', 'D']],
    ]},
    { sec: 'In lecture', items: [
      ['Play / pause audio', ['Space']],
      ['Jump back 5s', ['J']],
      ['Jump forward 5s', ['L']],
      ['Mark confusion', ['F']],
      ['Open Ask Professor', ['A']],
      ['Switch variant', ['V']],
    ]},
    { sec: 'Flashcards', items: [
      ['Flip card', ['Space']],
      ['Rate Again', ['1']],
      ['Rate Hard', ['2']],
      ['Rate Good', ['3']],
      ['Next card', ['→']],
    ]},
  ];
  return (
    <>
      <SectionHeader title="Keyboard shortcuts" sub="The faster way to do everything." />
      {shortcuts.map(g => (
        <Group key={g.sec} title={g.sec}>
          {g.items.map(([label, keys], i) => (
            <Row key={label} label={label} last={i === g.items.length - 1}>
              <div style={{ display: 'flex', gap: 3 }}>
                {keys.map((k, j) => <span key={j} className="kbd">{k}</span>)}
              </div>
            </Row>
          ))}
        </Group>
      ))}
    </>
  );
}

/* ───────── AI ───────── */
function AISection() {
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [reveal, setReveal] = useState(false);
  return (
    <>
      <SectionHeader title="AI provider" sub="Choose who powers transcription, summarization, and Ask Professor. Your keys are encrypted at rest." />
      <Group title="Provider">
        <Row label="Active provider" hint="Used for all AI features unless overridden." last vertical>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { id: 'gemini',     name: 'Google Gemini',    sub: '3.0 Flash · multimodal',    free: true,  saved: true },
              { id: 'openai',     name: 'OpenAI',           sub: 'gpt-4o-mini · fastest',     free: false, saved: false },
              { id: 'anthropic',  name: 'Anthropic Claude', sub: 'Sonnet 4.6 · best for prose', free: false, saved: true },
              { id: 'openrouter', name: 'OpenRouter',       sub: 'one key, many models',      free: false, saved: false },
            ].map(p => (
              <button key={p.id} onClick={() => setProvider(p.id)} style={{
                padding: 12, textAlign: 'left',
                background: provider === p.id ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                border: `1px solid ${provider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 99,
                    border: `1.5px solid ${provider === p.id ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: provider === p.id ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  {p.saved && <span className="chip" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}>key saved</span>}
                  {p.free && <span className="chip" style={{ fontSize: 9, padding: '1px 6px' }}>free tier</span>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{p.sub}</span>
              </button>
            ))}
          </div>
        </Row>
      </Group>
      <Group title="Model">
        <Row label="Default model" hint="Live catalog refreshed every 24h.">
          <Select value={model} onChange={setModel} width={300} options={[
            { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6 — Sonnet 4.6 (recommended)' },
            { value: 'claude-haiku-4-5',  label: 'claude-haiku-4-5 — Haiku 4.5 (faster)' },
            { value: 'claude-opus-4-1',   label: 'claude-opus-4-1 — Opus (highest quality)' },
          ]} />
        </Row>
        <Row label="API key" hint="Encrypted. Used for transcribe + summarize calls." last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Field type={reveal ? 'text' : 'password'} value={reveal ? 'sk-ant-api03-aBc1…vXyZ' : '••••••••••••aBcD'} mono width={280} />
            <button className="icon-btn" onClick={() => setReveal(r => !r)} title="Reveal">
              <Icon name={reveal ? 'x' : 'search'} size={13} />
            </button>
          </div>
        </Row>
      </Group>
      <Group title="Advanced">
        <Row label="Custom model ID" hint="Useful for OpenRouter routing or self-hosted endpoints.">
          <Switch on={false} onChange={() => {}} />
        </Row>
        <Row label="Stream responses" hint="Show tokens as they arrive in chat."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Temperature" hint="Lower = focused, higher = more creative." last>
          <Field value="0.4" mono width={70} />
        </Row>
      </Group>
    </>
  );
}

/* ───────── AGENTS ───────── */
function AgentsSection() {
  return (
    <>
      <SectionHeader title="Agents" sub="Background agents work on your library when you're not looking." />
      <Group>
        <AgentRow icon="layers" name="Auto-Organizer"
          desc="Suggests a course folder for new lectures based on syllabi and previous tags."
          on tag="Active" />
        <AgentRow icon="calendar" name="Study Planner"
          desc="Builds a prioritized review plan for a course folder — picks lectures, materials, and times."
          on={false} />
        <AgentRow icon="search" name="Research Assistant"
          desc="Looks up confusion-flagged moments in background — finds papers, videos, and explanations."
          on tag="6 results this week" />
        <AgentRow icon="bolt" name="Multi-Step Pipeline" last
          desc="Run a configurable sequence (summarize → cards → quiz → export) after every capture."
          on />
      </Group>
      <Group title="Agent job history" sub="Last 10 runs across all agents.">
        {[
          { agent: 'Auto-Organizer', lecture: 'The Default Mode Network', when: '4m ago', ok: true },
          { agent: 'Multi-Step Pipeline', lecture: 'The Default Mode Network', when: '4m ago', ok: true },
          { agent: 'Research Assistant', lecture: 'Consensus under Partial Failure', when: '2h ago', ok: true },
          { agent: 'Multi-Step Pipeline', lecture: 'Fiscal Multipliers', when: '1d ago', ok: false },
        ].map((j, i, arr) => (
          <Row key={i} last={i === arr.length - 1}
            label={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: j.ok ? 'var(--good)' : 'var(--bad)' }} />
              {j.agent}
            </span>}
            hint={`${j.lecture} · ${j.when}`}
          >
            <button className="btn btn-ghost"><Icon name="refresh" size={12} /></button>
            <button className="btn btn-ghost"><Icon name="chevronRight" size={13} /></button>
          </Row>
        ))}
      </Group>
    </>
  );
}

function AgentRow({ icon, name, desc, on, tag, last }) {
  const [active, setActive] = useState(on);
  return (
    <Row last={last}
      label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Icon name={icon} size={14} />
        </span>
        <span>
          {name}
          {tag && <span className="chip" style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', background: 'var(--accent-soft)', color: 'var(--accent-text)', borderColor: 'transparent' }}>{tag}</span>}
        </span>
      </span>}
      hint={desc}
    >
      <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>Configure</button>
      <Switch on={active} onChange={setActive} />
    </Row>
  );
}

/* ───────── PIPELINE ───────── */
function PipelineSection() {
  const steps = [
    { id: 'transcribe', label: 'Transcribe', desc: 'Whisper-grade transcription', locked: true },
    { id: 'cornell',    label: 'Cornell notes', desc: 'Cue rows + summary', locked: false, on: true },
    { id: 'flashcards', label: 'Flashcards', desc: '8–12 cards by default', on: true },
    { id: 'quiz',       label: 'Quiz',     desc: '5 MCQ + explanations', on: true },
    { id: 'research',   label: 'Research', desc: 'Look up confusion flags', on: true },
    { id: 'organize',   label: 'Auto-organize', desc: 'Suggest a course folder', on: false },
    { id: 'notion',     label: 'Push to Notion', desc: 'Connect Notion first', on: false, locked: true },
  ];
  return (
    <>
      <SectionHeader title="Post-capture pipeline" sub="What happens automatically when you stop a recording. Drag to reorder." />
      <Group title="Pipeline">
        {steps.map((s, i) => (
          <Row key={s.id} last={i === steps.length - 1}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)', width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)', cursor: 'grab' }}>
                <Icon name="more" size={13} />
              </span>
              {s.label}
              {s.locked && <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>locked</span>}
            </span>}
            hint={s.desc}
          >
            <Switch on={s.on || s.locked} onChange={() => {}} />
          </Row>
        ))}
      </Group>
      <Group title="Triggers">
        <Row label="Run on stop" hint="Default for new captures."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Run on upload" hint="Apply pipeline to audio you upload."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Run nightly review" hint="Sweep recent lectures missing study materials." last><Switch on={false} onChange={() => {}} /></Row>
      </Group>
    </>
  );
}

/* ───────── COURSES ───────── */
function CoursesSection() {
  return (
    <>
      <SectionHeader title="Courses & syllabi" sub="Folders for your work. Upload a syllabus and the AI will weight content accordingly." />
      <Group title={`${window.PSData.COURSES.length} courses`}>
        {window.PSData.COURSES.map((c, i, arr) => (
          <Row key={c.id} last={i === arr.length - 1}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
              {c.name}
              <span className="chip">{c.lecturesCount} lectures</span>
            </span>}
            hint={`${c.code} · ${c.instructor}`}
          >
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }}>
              <Icon name="upload" size={12} /> Syllabus
            </button>
            <button className="btn btn-ghost"><Icon name="more" size={13} /></button>
          </Row>
        ))}
      </Group>
      <button className="btn btn-primary" style={{ marginTop: -12 }}><Icon name="plus" size={13} /> Add course</button>
    </>
  );
}

/* ───────── NOTION ───────── */
function NotionSection() {
  return (
    <>
      <SectionHeader title="Notion" sub="Push lecture summaries, Cornell notes, and flashcards to a Notion page." />
      <Group>
        <Row label="Connection" hint="Connect to a workspace to enable export." vertical last>
          <div style={{ padding: 18, background: 'var(--bg-sunken)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="notion" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Not connected</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', margin: '2px 0 0' }}>OAuth via Notion · we&apos;ll create a "ProfSummarizer" page in your workspace.</p>
            </div>
            <button className="btn btn-primary"><Icon name="link" size={13} /> Connect Notion</button>
          </div>
        </Row>
      </Group>
      <Group title="Defaults">
        <Row label="What to push" hint="Cornell notes · Flashcards · Vocab">
          <button className="btn">Edit template</button>
        </Row>
        <Row label="Push automatically" hint="Add to pipeline (requires connection)." last>
          <Switch on={false} onChange={() => {}} />
        </Row>
      </Group>
    </>
  );
}

/* ───────── EXPORT ───────── */
function ExportSection() {
  return (
    <>
      <SectionHeader title="Export" sub="Get your notes out in any format." />
      <Group title="Per-lecture defaults">
        <Row label="Markdown (.md)" hint="Cornell + summary + cards in one file."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="PDF" hint="Print-ready, paginated."><Switch on={false} onChange={() => {}} /></Row>
        <Row label="Anki deck (.apkg)" hint="Drop into Anki Desktop." last><Switch on={false} onChange={() => {}} /></Row>
      </Group>
      <Group title="Bulk export">
        <Row label="Export entire library" hint="As a zip · markdown + audio + JSON" last>
          <button className="btn">Request export</button>
        </Row>
      </Group>
    </>
  );
}

/* ───────── AUDIO ───────── */
function AudioSection() {
  return (
    <>
      <SectionHeader title="Audio & capture" sub="The mic, the bitrate, the gates." />
      <Group title="Input">
        <Row label="Microphone" hint="Used for recording in-browser.">
          <Select value="builtin" onChange={() => {}} options={[
            { value: 'builtin', label: 'Built-in microphone' },
            { value: 'air', label: 'AirPods Pro' },
            { value: 'shure', label: 'Shure MV7' },
          ]} />
        </Row>
        <Row label="Encoding" hint="Mono is fine for speech and saves space.">
          <Select value="opus" onChange={() => {}} options={[
            { value: 'opus', label: 'Opus · 16kbps · mono (default)' },
            { value: 'aac',  label: 'AAC · 32kbps · mono' },
            { value: 'wav',  label: 'WAV · uncompressed (large)' },
          ]} />
        </Row>
        <Row label="Noise suppression" hint="Browser-level filter for HVAC and chair scrapes." last>
          <Switch on={true} onChange={() => {}} />
        </Row>
      </Group>
      <Group title="Recording behavior">
        <Row label="Auto-resume on disconnect" hint="If the mic drops, try to reconnect within 5s."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Confirm before discard" hint="Always ask before throwing away a capture." last><Switch on={true} onChange={() => {}} /></Row>
      </Group>
    </>
  );
}

/* ───────── CONFUSION ───────── */
function ConfusionSection() {
  return (
    <>
      <SectionHeader title="Confusion flags" sub="How you mark moments that didn't make sense — and what happens next." />
      <Group>
        <Row label="Flag shortcut" hint="Press this while recording.">
          <span className="kbd">Space</span>
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>or tap the ring</span>
        </Row>
        <Row label="Look-back window" hint="When you flag, also bookmark this many seconds before.">
          <Field value="10" mono width={50} />
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>seconds</span>
        </Row>
        <Row label="Haptic confirmation" hint="Tactile pulse on supported devices."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Color" hint="Used on the timeline and confusion flags throughout the app." last>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--confuse)', border: '1px solid var(--border)' }} />
        </Row>
      </Group>
      <Group title="After recording">
        <Row label="Generate research questions" hint="Use AI to phrase each flag as a question to ask Professor."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Show in lecture rail" hint="Pin flags to the right rail of the Document variant." last><Switch on={true} onChange={() => {}} /></Row>
      </Group>
    </>
  );
}

/* ───────── DATA ───────── */
function DataSection() {
  return (
    <>
      <SectionHeader title="Data & storage" sub="Where your lectures live and how much space they take." />
      <Group title="Usage">
        <Row label="Total storage" hint="34 lectures · audio + transcripts + media">
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>1.84 GB</span>
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>of 10 GB</span>
        </Row>
        <Row label="Breakdown" hint="Most of it is audio." vertical>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-sunken)', overflow: 'hidden', display: 'flex', marginTop: 4 }}>
            <span style={{ width: '72%', background: 'var(--accent)' }} />
            <span style={{ width: '18%', background: 'var(--good)' }} />
            <span style={{ width: '7%',  background: 'var(--confuse)' }} />
            <span style={{ width: '3%',  background: 'var(--text-faint)' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', marginTop: 6, flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', marginRight: 4 }} />Audio · 1.32 GB</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--good)', marginRight: 4 }} />Transcripts · 340 MB</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--confuse)', marginRight: 4 }} />Media · 130 MB</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--text-faint)', marginRight: 4 }} />Other · 50 MB</span>
          </div>
        </Row>
        <Row label="Delete audio after processing" hint="Keep only transcripts and notes — frees ~70% of space." last>
          <Switch on={false} onChange={() => {}} />
        </Row>
      </Group>
      <Group title="Backups">
        <Row label="Automatic backups" hint="Snapshot every 24h to encrypted storage."><Switch on={true} onChange={() => {}} /></Row>
        <Row label="Last backup" hint="Tuesday, May 18 · 03:12 UTC" last>
          <button className="btn">Restore</button>
        </Row>
      </Group>
    </>
  );
}

/* ───────── DANGER ───────── */
function DangerSection() {
  return (
    <>
      <SectionHeader title="Danger zone" sub="Irreversible operations. Tread carefully." />
      <Group>
        <Row label="Re-run pipeline on all lectures" hint="Regenerate Cornell notes, flashcards, and quizzes from existing transcripts.">
          <button className="btn"><Icon name="refresh" size={12} /> Re-run</button>
        </Row>
        <Row label="Wipe all flashcard progress" hint="Resets spaced-repetition memory for every card." >
          <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>Reset progress</button>
        </Row>
        <Row label="Export then delete library" hint="Email a zip of everything, then permanently delete from servers.">
          <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}><Icon name="trash" size={12} /> Schedule deletion</button>
        </Row>
        <Row label="Delete account" hint="Cancels subscription and removes everything within 30 days." last>
          <button className="btn" style={{ background: 'var(--bad)', color: 'white', borderColor: 'var(--bad)' }}>
            <Icon name="trash" size={12} stroke={2} /> Delete account
          </button>
        </Row>
      </Group>
    </>
  );
}

window.Settings = Settings;
