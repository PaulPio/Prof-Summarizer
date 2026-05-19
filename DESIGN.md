# DESIGN.md — ProfSummarizer

Visual and interaction standards for **ProfSummarizer**. Agents and contributors should match these patterns before adding or changing UI.

**Design direction:** **Studio** — neutral academic workspace. Clean, focused, typographically expressive. Indigo accent on a near-white neutral ground. Feels like a well-lit library reading room, not a colorful SaaS dashboard.

**Implementation:** CSS custom properties token system inlined in `frontend/index.html` (see Step 1 below), plus Tailwind CDN for utility classes where needed. The token system is the source of truth for color, spacing, and shape — Tailwind classes should only be used for layout utilities not covered by tokens.

**Mockups:** `design-explorations/proffusmarizer-zip/ProfSummarizer Studio.html` is the primary reference. Open it in a browser — it is a self-contained live prototype with all screens.

**Reference components (Studio-aligned):** `TopBar`, `CourseRail`, `RecordPage` (dashboard + recording + review), `LectureDetailPage` (Document variant), `SettingsPage` (side-nav), `StudyPlannerView`, `StudyPlanDisplay`.

**Legacy (migrate when touched):** `OnboardingPage`, `Quiz.tsx`, `CourseManager` modal, `AuthForm` (still uses gray/blue or stone tokens).

---

## Brand & personality

ProfSummarizer should feel like a **focused academic workspace** — precise, readable, and calm.

| Trait | Expression |
|--------|------------|
| **Editorial** | Instrument Serif (italic) for display headlines, lecture titles, hero text |
| **Clean** | Near-white page (`#fafaf9`), white elevated cards, subtle borders — no loud gradients on shell |
| **Confident** | Indigo (`#5b5bd6`) primary CTAs, clear type hierarchy, measured whitespace |
| **Student-first** | Adequate tap targets, readable body copy, course-scoped navigation |

**Voice (UI copy):** Short, direct, encouraging. "Start recording" over "Initiate capture session." Sentence case for headings; `UPPERCASE tracking-wider` for micro-labels only (e.g., "COURSES", "CAPTURE").

---

## Token system

All values are CSS custom properties declared on `:root` in `frontend/index.html`. Use `var(--token)` — do not hardcode hex values.

### Color tokens

| Token | Light value | Purpose |
|-------|-------------|---------|
| `--bg` | `#fafaf9` | App shell, auth, page backgrounds |
| `--bg-elev` | `#ffffff` | Cards, panels, elevated surfaces |
| `--bg-sunken` | `#f4f4f3` | Course rail, input backgrounds, table headers |
| `--bg-hover` | `#f0f0ef` | Row hover state |
| `--bg-active` | `#e9e9e7` | Row active/pressed state |
| `--border` | `#e7e5e4` | Standard borders |
| `--border-strong` | `#d6d3d1` | Emphasized borders, dividers |
| `--border-subtle` | `#efeeec` | Table row separators |
| `--text` | `#0c0a09` | Primary text |
| `--text-muted` | `#57534e` | Descriptions, body copy |
| `--text-soft` | `#a8a29e` | Hints, metadata, labels |
| `--text-faint` | `#d6d3d1` | Placeholder text, empty states |

### Brand tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--accent` | `#5b5bd6` | Primary CTA, links, active indicators |
| `--accent-hover` | `#4d4dc4` | Hover state for accent elements |
| `--accent-soft` | `#eeeefb` | Accent tint backgrounds |
| `--accent-text` | `#4338ca` | Text on accent-soft backgrounds |

### Signal tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--rec` | `#d4f000` | Recording active indicator (lime) |
| `--rec-deep` | `#708500` | Dark lime for waveform accent bar |
| `--confuse` | `#f59e0b` | Confusion markers, attention (amber) |
| `--confuse-soft` | `#fef3c7` | Confusion flag backgrounds |
| `--good` | `#16a34a` | Success, quiz correct, high score |
| `--good-soft` | `#dcfce7` | Success backgrounds |
| `--bad` | `#dc2626` | Error, quiz wrong, low score |
| `--bad-soft` | `#fee2e2` | Error backgrounds |

### Dark mode

All tokens are re-declared under `[data-theme="dark"]`. Apply by setting `document.documentElement.setAttribute('data-theme', 'dark')`. The token API stays identical — no component code changes needed.

Dark accent: `--accent: #818cf8` (lighter indigo for contrast on dark bg).

### Density

Two density modes are supported via `[data-density="cozy"]` on `<html>`:

- **Compact** (default): `--row-h: 28px`, `--pad-card: 16px`, `--text-base: 13px`, `--text-display: 44px`
- **Cozy**: `--row-h: 36px`, `--pad-card: 22px`, `--text-base: 14px`, `--text-display: 56px`

All spacing uses `--space-1` through `--space-8` tokens that scale with density.

---

## Typography

**Fonts** (loaded via Google Fonts in `frontend/index.html`):

| Family | CSS var | Use |
|--------|---------|-----|
| **Geist** | `var(--font-ui)` | All UI text, buttons, labels, body |
| **Geist Mono** | `var(--font-mono)` | Timestamps, durations, code, mono values |
| **Instrument Serif** | `var(--font-serif)` | Display headlines, lecture titles, hero h1 |

| Element | Style | Notes |
|---------|-------|-------|
| Brand mark | `font-family: var(--font-ui); font-size: 14px; font-weight: 600` | CourseRail top |
| Hero / page title | `font-family: var(--font-serif); font-size: var(--text-display); font-style: italic; font-weight: 400` | Dashboard "Welcome back", lecture h1 |
| Section label (micro) | `font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-soft)` | "COURSES", "CAPTURE" |
| Section heading | `font-size: 13px; font-weight: 600` | Card/section titles |
| Body | `font-size: var(--text-base); color: var(--text-muted); line-height: 1.6` | Descriptions, notes |
| Mono value | `font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted)` | Durations, timestamps |
| Timer | `font-family: var(--font-mono); font-size: 96px; font-weight: 300` | Live recording timer |

---

## Layout & shell

### App shell — Studio (2-column)

```
┌──────────┬──────────────────────────────────────────────────┐
│ Course   │  TopBar (48px, per-page)                         │
│ rail     ├──────────────────────────────────────────────────┤
│ 248px    │  Main content (flex: 1, overflow: auto)          │
│ fixed    │  Dashboard / Record / Lecture / Planner /        │
│          │  Settings                                        │
└──────────┴──────────────────────────────────────────────────┘
```

- Root: `display: flex; height: 100vh; width: 100vw; overflow: hidden; background: var(--bg); color: var(--text)`
- **CourseRail:** `width: 248px; flex-shrink: 0; background: var(--bg-sunken); border-right: 1px solid var(--border)`
- **No standalone header or footer** — each page owns its own `TopBar`
- **TopBar:** `height: 48px; border-bottom: 1px solid var(--border); background: var(--bg); padding: 0 16px`; breadcrumb on left, actions on right
- Main content: `flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden`

### Shape tokens

| Token | Value | Use |
|-------|-------|-----|
| `--r-sm` | `6px` | Buttons, small controls |
| `--r` | `10px` | Input fields, chips |
| `--r-lg` | `14px` | Cards, panels |
| `--r-xl` | `20px` | Large modals, overlays |

### Shadows

| Token | Use |
|-------|-----|
| `var(--shadow-sm)` | Active nav items, tight surfaces |
| `var(--shadow)` | Cards, dropdowns |
| `var(--shadow-lg)` | Modals, popovers |
| `var(--shadow-pop)` | Full-screen overlays |

---

## Primitive CSS classes

The following classes are declared in `frontend/index.html` and should be used instead of one-off inline styles for common patterns:

### Buttons

```html
<!-- Default button -->
<button class="btn">Label</button>

<!-- Dark/filled primary -->
<button class="btn btn-primary">Label</button>

<!-- Indigo accent -->
<button class="btn btn-accent">Label</button>

<!-- Ghost (no background/border) -->
<button class="btn btn-ghost">Label</button>

<!-- Square icon button -->
<button class="icon-btn"><svg /></button>
```

`btn` base: `display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--r-sm); border: 1px solid var(--border); font-size: var(--text-sm); font-weight: 500; cursor: pointer`

### Cards

```html
<div class="card">…</div>
```

`card`: `background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--r-lg); padding: var(--pad-card)`

### Chips

```html
<span class="chip">Label</span>
```

`chip`: `display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px; background: var(--bg-sunken); border: 1px solid var(--border); font-size: var(--text-xs); font-weight: 500`

### Keyboard keys

```html
<kbd class="kbd">⌘K</kbd>
```

### Utility classes

- `.mono` — applies `font-family: var(--font-mono)` + `font-feature-settings: 'tnum'`
- `.serif` — applies `font-family: var(--font-serif)`

---

## Course colors

Defined in `frontend/src/constants/courseColors.ts`:

```
#92400e  #78716c  #a16207  #9a3412
#166534  #1e3a5f  #6b21a8  #9f1239
```

- Use via **`displayCourseColor(stored)`** when rendering color dots, badges, and borders.
- **Course rail:** 8×8px colored square dot (`border-radius: 2px`) + course name
- **Lecture table:** course chip = color dot + code text
- Do **not** use raw course colors for global primary buttons.

---

## Components

### TopBar

```tsx
<TopBar breadcrumb={<>…</>}>
  <button className="btn">Action</button>
  <button className="btn btn-accent">Primary</button>
</TopBar>
```

Breadcrumb renders as a row of text nodes + chevron icons. Use `var(--text-soft)` for parent segments, `var(--text)` for current page segment.

### CourseRail sections

1. **Brand row**: logo mark + "ProfSummarizer" (`font-weight: 600`) + "Studio · v3" (`font-size: 10px; color: var(--text-faint)`)
2. **Search**: static box with ⌘K badge (visual only until command palette is wired)
3. **Nav items**: icon + label, 32px height, `border-radius: var(--r-sm)`. Active state: `background: var(--bg-elev); border: 1px solid var(--border); box-shadow: var(--shadow-sm)`
4. **Courses section**: "COURSES" micro-label + `+` icon-button. Course rows: color dot + name + code (mono 10px) + lecture count
5. **User footer**: initials avatar (gradient circle) + name + plan + settings gear → `/settings`

### Lecture table rows

- Columns: Lecture (40%) | Course (15%) | Captured (11%) | Duration (10%) | Cards (10%) | Quiz (14%)
- Row hover: `background: var(--bg-hover)`
- Quiz pill: green (`var(--good)`) ≥80%, amber (`var(--confuse)`) ≥60%, red (`var(--bad)`) <60%
- Confusion chip: `background: var(--confuse-soft); color: var(--confuse)`

### Stat cards

```
label (11px, --text-soft)
large number (28px, font-weight: 500, color: accent or signal)
sub text (11px, --text-soft)
optional progress bar (3px, --bg-sunken track, accent fill)
```

### Forms

```html
<input style="border: 1px solid var(--border); border-radius: var(--r-sm); padding: 6px 10px;
              background: var(--bg); color: var(--text); font-size: var(--text-sm)" />
```

Focus: `outline: 2px solid var(--accent); outline-offset: 2px`

### Alerts

| Type | Pattern |
|------|---------|
| Error | `background: var(--bad-soft); border: 1px solid var(--bad); color: var(--bad)` |
| Success | `background: var(--good-soft); border: 1px solid var(--good); color: var(--good)` |
| Warning | `background: var(--confuse-soft); border: 1px solid var(--confuse); color: var(--confuse)` |
| Info | `background: var(--accent-soft); border: 1px solid var(--accent); color: var(--accent-text)` |

### Loading

```html
<div style="width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent);
            border-radius: 50%; animation: spin 700ms linear infinite" />
```

### Empty states

Centered stack: icon in `background: var(--bg-sunken); border-radius: var(--r-lg)` circle → `font-weight: 600` title → `color: var(--text-muted)` description → accent CTA button.

---

## Motion & animation

| Animation | Keyframe name | Use |
|-----------|--------------|-----|
| Fade in | `fade-in` | Page sections, panels appearing |
| Recording pulse | `rec-pulse` | Live recording dot |
| Spin | `spin` | Loading spinners |
| Waveform | `wave` | Audio waveform bars |

All declared in `frontend/index.html`. Use `animation: fade-in 200ms ease-out both` on new panels.
Prefer CSS transitions (`transition: background 80ms ease`) over JS-driven animation for hover/active states.

---

## Page-specific guidance

### Record flow

| State | Visual |
|-------|--------|
| IDLE / COMPLETED | Studio Dashboard — stats strip + continue card + lecture table |
| SETUP | Centered card with RecordRows (Course/Source/OnStop/Confusion) + dark "Start recording" btn |
| RECORDING | TopBar rec dot + timer chip; left=mono timer + waveform; right=transcript ribbon; confusion ring (lime, bottom-right) |
| REVIEWING | TopBar Discard/Save/Process; pipeline chips; 2×2 toggle grid; confusion timeline |
| ERROR | `.card` with `color: var(--bad)` message + back button |

### Lecture detail (Document variant)

- Two-column: article (1fr) + right rail (220px sticky)
- Article: eyebrow in `var(--accent)`, h1 in `var(--font-serif)` italic 56px, sections with `font-weight: 600` heading
- Right rail: "On this page" outline with active `border-left: 2px solid var(--accent)`, "Your flags" with `var(--confuse-soft)` background
- Floating "Ask Professor" pill: `background: var(--text); color: var(--bg)`, `bottom: 22px; right: 22px`

### Settings (side-nav)

- Left nav: 220px, `border-right: 1px solid var(--border)`, groups in `font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-soft)`
- Active section: `background: var(--bg-sunken); border-radius: var(--r-sm); color: var(--text); font-weight: 500`
- Content area: `max-width: 720px; padding: 32px 36px`

### Study planner

- Setup wizard: 4 steps in shared card — progress via step counter
- Course step: 2×2 grid of course cards with color dot + name + code + count
- Output: emphasis stacked bar + sessions column grid

---

## Do / Don't

### Do

- Use `var(--accent)` for primary CTAs and active indicators.
- Use `var(--font-serif)` + `font-style: italic` for display headlines and lecture titles.
- Use `.card`, `.btn`, `.chip` primitive classes for consistent surfaces.
- Use `displayCourseColor()` for all course color rendering.
- Apply `var(--bg-sunken)` for rail/sidebar/sunken backgrounds; `var(--bg-elev)` for elevated cards.
- Keep one obvious primary CTA per view (usually `.btn-accent`).
- Test dark mode by temporarily adding `data-theme="dark"` to `<html>`.

### Don't

- Hardcode hex colors — always use CSS custom property tokens.
- Use `amber-800`, `bg-[#faf8f5]`, DM Serif Display, or `stone-*` on new Studio surfaces.
- Add purple/indigo gradients (the flat `--accent` token is sufficient).
- Use bright raw course colors (`#6366f1`) without `displayCourseColor()`.
- Introduce a second CSS framework without a project-wide migration.

---

## Migration notes

| Area | Status |
|------|--------|
| App shell, CourseRail | Studio ✅ |
| RecordPage (dashboard + recording + review) | Studio ✅ |
| LectureDetailPage (Document variant) | Studio ✅ |
| SettingsPage (side-nav) | Studio ✅ |
| StudyPlannerView + StudyPlanDisplay | Studio ✅ |
| TopBar component | Studio ✅ |
| OnboardingPage, AuthForm | Legacy — migrate when touched |
| Quiz.tsx, CourseManager modal | Legacy — migrate when touched |
| `HistorySidebar` | Unused; do not extend |

---

## Checklist for new UI

Before marking UI work complete:

- [ ] Uses `var(--bg)` / `var(--bg-elev)` / `var(--bg-sunken)` for backgrounds — no hardcoded hex
- [ ] Primary action uses `.btn-accent` (indigo) or `.btn-primary` (dark)
- [ ] Display text uses `var(--font-serif)` italic where appropriate
- [ ] Course colors rendered via `displayCourseColor()`
- [ ] Loading, error, and empty states defined using signal tokens
- [ ] Dark mode compatible (use tokens, not hardcoded values)
- [ ] `npm run build` passes from `frontend/`

---

## Related docs

| File | Purpose |
|------|---------|
| `AGENTS.md` | Architecture, commands, agent rules |
| `CLAUDE.md` | Developer commands, architecture overview |
| `PROMPT.md` | Session system prompt |
| `design-explorations/proffusmarizer-zip/ProfSummarizer Studio.html` | Live design prototype (primary reference) |
| `design-explorations/proffusmarizer-zip/tokens.css` | Token source definitions |
| `frontend/index.html` | Fonts, token system, primitive classes |
| `frontend/src/constants/courseColors.ts` | Course palette + `displayCourseColor()` |
