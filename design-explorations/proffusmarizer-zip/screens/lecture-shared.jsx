/* global React, Icon, PSData, fmtTime */
// Shared lecture content blocks used across variants.

const { useState, useEffect, useRef, useMemo } = React;

/* ──────────────── CORNELL BLOCK ──────────────── */
function CornellBlock({ compact = false, syncedAt, onJumpTo }) {
  const { HERO_CORNELL } = window.PSData;
  // pair cues with notes by index
  const rows = HERO_CORNELL.cues.map((c, i) => ({ cue: c, note: HERO_CORNELL.notes[i] }));
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 16px', background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cornell notes</span>
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{rows.length} cue rows</span>
      </div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Summary</span>
        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          {HERO_CORNELL.summary}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '200px 1fr' : '240px 1fr' }}>
        <div style={{ borderRight: '1px solid var(--border)', padding: '4px 0' }}>
          {rows.map((r, i) => (
            <CornellCueRow key={i} cue={r.cue} active={syncedAt != null && syncedAt >= r.cue.at && (rows[i+1] ? syncedAt < rows[i+1].cue.at : true)} onClick={() => onJumpTo?.(r.cue.at)} />
          ))}
        </div>
        <div style={{ padding: '4px 0' }}>
          {rows.map((r, i) => (
            <CornellNoteRow key={i} note={r.note} active={syncedAt != null && syncedAt >= r.cue.at && (rows[i+1] ? syncedAt < rows[i+1].cue.at : true)} onClick={() => onJumpTo?.(r.note.at)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CornellCueRow({ cue, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        padding: '10px 14px', width: '100%', textAlign: 'left',
        background: active ? 'var(--accent-soft)' : 'transparent',
        border: 0, borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        cursor: 'pointer', color: 'var(--text)',
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}>{cue.cue}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)' }}>
        {fmtTime(cue.at)} · {cue.related}
      </span>
    </button>
  );
}

function CornellNoteRow({ note, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', textAlign: 'left',
        padding: '10px 16px', width: '100%',
        background: active ? 'var(--accent-soft)' : 'transparent',
        border: 0, cursor: 'pointer', color: 'var(--text)',
      }}
    >
      <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{note.text}</p>
    </button>
  );
}

/* ──────────────── KEY POINTS + ACTIONS + VOCAB ──────────────── */
function KeyPoints() {
  const { HERO_KEY_POINTS } = window.PSData;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Key takeaways</span>
      </div>
      <ol style={{ margin: 0, padding: '6px 0', listStyle: 'none' }}>
        {HERO_KEY_POINTS.map((p, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: i === HERO_KEY_POINTS.length - 1 ? 0 : '1px solid var(--border-subtle)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)', flexShrink: 0, width: 16, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 13, lineHeight: 1.55 }}>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ActionItems() {
  const { HERO_ACTIONS } = window.PSData;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Action items</span>
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{HERO_ACTIONS.length} tasks</span>
      </div>
      <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
        {HERO_ACTIONS.map((a, i) => <ActionItem key={i} text={a} />)}
      </ul>
    </div>
  );
}
function ActionItem({ text }) {
  const [done, setDone] = useState(false);
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setDone(d => !d)}
        style={{
          width: 16, height: 16, marginTop: 1,
          border: `1.5px solid ${done ? 'var(--good)' : 'var(--border-strong)'}`,
          borderRadius: 4,
          background: done ? 'var(--good)' : 'transparent',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
        }}
        aria-label="Toggle done"
      >
        {done && <Icon name="check" size={10} stroke={2.5} />}
      </button>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: done ? 'var(--text-soft)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
    </li>
  );
}

function Vocab({ wrap = true }) {
  const { HERO_VOCAB } = window.PSData;
  const [active, setActive] = useState(null);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vocabulary</span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 6, overflowX: wrap ? 'visible' : 'auto' }}>
        {HERO_VOCAB.map((v, i) => (
          <button key={i}
            onClick={() => setActive(active === i ? null : i)}
            className="chip"
            style={{
              background: active === i ? 'var(--text)' : 'var(--bg-sunken)',
              color: active === i ? 'var(--bg)' : 'var(--text)',
              borderColor: active === i ? 'var(--text)' : 'var(--border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
            }}
          >
            {v.term}
          </button>
        ))}
      </div>
      {active != null && (
        <div className="fade-in" style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{HERO_VOCAB[active].term}</span> — {HERO_VOCAB[active].def}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────── FLASHCARDS ──────────────── */
function Flashcards({ mode = 'study' }) {
  const { HERO_FLASHCARDS } = window.PSData;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [memory, setMemory] = useState({}); // id -> 'easy' | 'medium' | 'hard'
  const card = HERO_FLASHCARDS[idx];
  const next = () => { setIdx(i => Math.min(i + 1, HERO_FLASHCARDS.length - 1)); setFlipped(false); };
  const prev = () => { setIdx(i => Math.max(i - 1, 0)); setFlipped(false); };
  const rate = (r) => { setMemory(m => ({ ...m, [idx]: r })); next(); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)' }}>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{String(idx + 1).padStart(2, '0')} / {String(HERO_FLASHCARDS.length).padStart(2, '0')}</span>
        <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
          <div style={{ width: `${((idx + 1) / HERO_FLASHCARDS.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{Object.keys(memory).length} reviewed</span>
      </div>

      <button
        onClick={() => setFlipped(f => !f)}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '36px 28px',
          minHeight: 200,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', cursor: 'pointer', position: 'relative',
          color: 'var(--text)',
        }}
      >
        <span style={{
          position: 'absolute', top: 12, left: 14,
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: flipped ? 'var(--accent)' : 'var(--text-soft)',
        }}>
          {flipped ? 'Definition' : 'Term'}
        </span>
        <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 10, color: 'var(--text-soft)' }}>
          <span className="kbd">Space</span> to flip
        </span>
        {flipped ? (
          <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0, maxWidth: 540 }}>{card.def}</p>
        ) : (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 26, lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em', maxWidth: 540 }}>{card.term}</p>
        )}
      </button>

      {flipped ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button className="btn" onClick={() => rate('hard')} style={{ justifyContent: 'center', borderColor: 'var(--bad)', color: 'var(--bad)' }}>
            Again
            <span className="kbd" style={{ marginLeft: 4 }}>1</span>
          </button>
          <button className="btn" onClick={() => rate('medium')} style={{ justifyContent: 'center', borderColor: 'var(--confuse)', color: 'var(--confuse)' }}>
            Hard
            <span className="kbd" style={{ marginLeft: 4 }}>2</span>
          </button>
          <button className="btn" onClick={() => rate('easy')} style={{ justifyContent: 'center', borderColor: 'var(--good)', color: 'var(--good)' }}>
            Good
            <span className="kbd" style={{ marginLeft: 4 }}>3</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={prev} disabled={idx === 0}><Icon name="chevronLeft" size={13} /> Prev</button>
          <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setFlipped(true)}>Reveal answer</button>
          <button className="btn" onClick={next} disabled={idx === HERO_FLASHCARDS.length - 1}>Next <Icon name="chevronRight" size={13} /></button>
        </div>
      )}
    </div>
  );
}

/* ──────────────── QUIZ ──────────────── */
function Quiz() {
  const { HERO_QUIZ } = window.PSData;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const q = HERO_QUIZ[idx];
  const done = idx === HERO_QUIZ.length;
  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24, gap: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--good)' }}>
          {Math.round((score / HERO_QUIZ.length) * 100)}%
        </span>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, margin: 0 }}>
          {score} of {HERO_QUIZ.length} correct.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
          Strong on hubs and pharmacology. Revisit BOLD signal and anti-correlation before next class.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">Review answers</button>
          <button className="btn btn-accent" onClick={() => { setIdx(0); setPicked(null); setRevealed(false); setScore(0); }}>Try again</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-soft)' }}>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{String(idx + 1).padStart(2, '0')} / {String(HERO_QUIZ.length).padStart(2, '0')}</span>
        <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
          <div style={{ width: `${((idx + (revealed ? 1 : 0.4)) / HERO_QUIZ.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)' }}>Score {score}</span>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 500, margin: 0 }}>{q.q}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = picked === i;
          let bg = 'var(--bg-elev)', border = 'var(--border)', color = 'var(--text)';
          if (revealed) {
            if (isAnswer) { bg = 'var(--good-soft)'; border = 'var(--good)'; }
            else if (isPicked) { bg = 'var(--bad-soft)'; border = 'var(--bad)'; }
          } else if (isPicked) {
            border = 'var(--accent)'; bg = 'var(--accent-soft)';
          }
          return (
            <button
              key={i}
              onClick={() => !revealed && setPicked(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: bg, border: `1px solid ${border}`,
                borderRadius: 8, cursor: revealed ? 'default' : 'pointer',
                color, textAlign: 'left',
              }}
            >
              <span className="mono" style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>{opt}</span>
              {revealed && isAnswer && <Icon name="check" size={14} style={{ color: 'var(--good)' }} stroke={2.5} />}
              {revealed && isPicked && !isAnswer && <Icon name="x" size={14} style={{ color: 'var(--bad)' }} stroke={2.5} />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ padding: 12, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent-text)' }}>
          <strong style={{ fontWeight: 600 }}>Why:</strong> {q.explanation}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!revealed
          ? <button className="btn btn-accent" disabled={picked == null} onClick={() => { setRevealed(true); if (picked === q.answer) setScore(s => s + 1); }}>Check</button>
          : <button className="btn btn-accent" onClick={() => { setIdx(i => i + 1); setPicked(null); setRevealed(false); }}>
              {idx === HERO_QUIZ.length - 1 ? 'See results' : 'Next question'}
            </button>}
      </div>
    </div>
  );
}

/* ──────────────── CHAT (Ask Professor) ──────────────── */
function Chat({ inline = false }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'I have your transcript and your Cornell notes loaded. Ask me about today\u2019s lecture — I can quote the professor, expand on points, or quiz you back.' },
  ]);
  const [input, setInput] = useState('');
  const send = (t) => {
    const text = (t ?? input).trim();
    if (!text) return;
    setMessages(m => [...m, { role: 'me', text }]);
    setInput('');
    setTimeout(() => {
      setMessages(m => [...m, { role: 'ai', text: 'The anti-correlation between DMN and TPN is computed from the temporal correlation of their average BOLD time-series. Most papers use Pearson on band-passed (0.01–0.1 Hz) signals; some use partial correlation to control for global signal. You flagged this at 11:52 — want me to jump there?' }]);
    }, 700);
  };
  const suggestions = ['Explain anti-correlation simply', 'What\u2019s likely on the midterm?', 'Quiz me on hubs'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-elev)', border: inline ? '1px solid var(--border)' : 'none', borderRadius: inline ? 'var(--r-lg)' : 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="graduation" size={12} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Ask Professor</span>
          <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>Grounded in this lecture</span>
        </div>
        <span style={{ flex: 1 }} />
        <span className="chip" style={{ background: 'var(--good-soft)', color: 'var(--good)', borderColor: 'transparent' }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--good)' }} /> ready
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              padding: '8px 12px',
              fontSize: 12.5,
              lineHeight: 1.5,
              borderRadius: 12,
              background: m.role === 'me' ? 'var(--text)' : 'var(--bg-sunken)',
              color: m.role === 'me' ? 'var(--bg)' : 'var(--text)',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {suggestions.map(s => (
              <button key={s} className="chip" style={{ cursor: 'pointer' }} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
      <form style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }} onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything from the lecture…" style={{
          flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', outline: 'none',
        }} />
        <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px' }}><Icon name="send" size={13} stroke={2} /></button>
      </form>
    </div>
  );
}

window.CornellBlock = CornellBlock;
window.KeyPoints = KeyPoints;
window.ActionItems = ActionItems;
window.Vocab = Vocab;
window.Flashcards = Flashcards;
window.Quiz = Quiz;
window.Chat = Chat;
