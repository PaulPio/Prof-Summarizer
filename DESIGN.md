# DESIGN.md — ProfSummarizer

Visual and interaction standards for **ProfSummarizer**. Agents and contributors should match these patterns before adding or changing UI.

**Design direction:** **Warm Campus** — editorial serif headlines, cream paper backgrounds, stone neutrals, and amber accents. Feels like a calm study library, not a generic SaaS dashboard.

**Implementation:** Tailwind CSS via CDN (`frontend/index.html`). No separate design-token build — use Tailwind utility classes consistently.

**Mockups:** `design-explorations/` — **Landing C** (`landing-c-campus.html`) and **Interior C** (`interior-campus-c-split.html`) are the accepted references.

**Reference components (campus-aligned):** `AuthForm`, `App.tsx`, `CourseRail`, `LectureListPanel`, `CourseFolderLabel`, `StudyDeskDashboard`, `RecordPage`, `LectureDetailPage`, `StudyModePanel`, `CornellNotesDisplay`, `FlashcardDeck`, `ChatWindow`, `StudyPlannerView`.

**Legacy (still gray/blue — migrate when touched):** `SettingsPage`, `OnboardingPage`, `Quiz.tsx`, `CourseManager` modal, `HistorySidebar` (unused in shell).

---

## Brand & personality

ProfSummarizer should feel like a **focused academic workspace** — warm, readable, and unhurried.

| Trait | Expression |
|--------|------------|
| **Editorial** | DM Serif Display for brand, course names, and hero headlines (`font-serif`, often `italic`) |
| **Calm** | Cream page (`#faf8f5`), white cards, stone borders — avoid loud gradients on shell surfaces |
| **Confident** | Amber-800 primary CTAs, clear hierarchy, generous whitespace |
| **Student-first** | Large tap targets, readable body copy, course-scoped navigation |

**Voice (UI copy):** Short, direct, encouraging. Prefer “New capture” over “Initiate capture session.” Use sentence case for headings; reserve `uppercase tracking-wider` for small labels (e.g. “Courses”, “Dashboard”).

---

## Color system

### Core palette (Warm Campus)

| Role | Tailwind / value | Hex (approx.) | Usage |
|------|------------------|---------------|--------|
| Page background | `bg-[#faf8f5]` | `#faf8f5` | App shell, auth, loading |
| Surface | `bg-white` | `#ffffff` | Cards, lecture panel, header |
| Surface muted | `bg-stone-50`, `bg-stone-100/60` | — | Course rail, inputs, cues column |
| Text primary | `text-stone-900` | `#1c1917` | Headings, lecture titles |
| Text secondary | `text-stone-600` / `text-stone-700` | — | Descriptions, body |
| Text muted | `text-stone-400` / `text-stone-500` | — | Hints, metadata, footer |
| Primary action | `bg-amber-800` → `hover:bg-amber-900` | `#92400e` | Main CTAs, “New capture”, generate buttons |
| Primary on-dark | `text-amber-50`, `text-amber-200/90` | — | Text on amber gradient headers |
| Primary tint | `bg-amber-50`, `border-amber-100` / `border-amber-200` | — | Active lecture row, info panels |
| Accent label | `text-amber-800` | — | Section kicker (“Dashboard · COP 3520”) |
| Destructive | `text-red-500` / `bg-red-50` / `border-red-200` | — | Errors, delete |
| Success | `bg-green-50` / `text-green-700` | — | Saved settings, quiz correct |
| Strong neutral CTA | `bg-stone-900` → `hover:bg-stone-800` | — | Print, export, stop recording |

**Do not** use `bg-blue-600` or purple/indigo gradients on new campus surfaces. Legacy pages may still use blue until migrated.

### Feature headers (in-context only)

Use the **amber gradient bar** for feature cards — not purple/indigo:

```html
class="bg-gradient-to-r from-amber-900 to-amber-800 text-amber-50"
```

| Feature | Pattern | Components |
|---------|---------|------------|
| **Study Mode** | Amber gradient header; tabs `border-amber-800` / `bg-amber-50/50` | `StudyModePanel` |
| **Cornell Notes** | Same amber header; cues `bg-stone-50`, cue borders `border-amber-200` | `CornellNotesDisplay` |
| **Flashcards** | White cards, `border-amber-200`, progress `bg-amber-700` | `FlashcardDeck` |
| **Ask Professor** | Amber gradient modal header; user bubbles `bg-amber-800` | `ChatWindow` |
| **Recording** | `red-50`, `red-600`, `ring-red-100` | Active recorder UI (unchanged) |
| **Confusion marker** | `amber-500` FAB | `ConfusionButton` only |

### Course colors

Defined in `frontend/src/constants/courseColors.ts`:

```
#92400e  #78716c  #a16207  #9a3412
#166534  #1e3a5f  #6b21a8  #9f1239
```

- Use via **`displayCourseColor(stored)`** when rendering bars, borders, and badges (maps legacy bright indigo `#6366f1` → campus amber without changing the DB).
- **Course rail:** full-width color bar (`h-1 rounded-full`) + `border-l-4` when active.
- **Course folder label:** `CourseFolderLabel` — serif name + color bar + optional subtitle.
- **Lecture list:** active row `bg-amber-50/80` with left border = `displayCourseColor(course.color)`.
- Do **not** use course colors for global primary buttons.

### Status indicators (footer / shell)

| State | Dot color |
|-------|-----------|
| Guest | `bg-amber-500` |
| Signed in | `bg-green-500` |

---

## Typography

**Fonts** (loaded in `frontend/index.html`):

| Family | CSS | Use |
|--------|-----|-----|
| **DM Serif Display** | `.font-serif` / `font-serif` | Brand (“ProfSummarizer”), course names, hero headlines, flashcard terms |
| **Inter** | `body` default | UI, buttons, forms, metadata |

| Element | Classes | Notes |
|---------|---------|-------|
| Brand mark | `font-serif text-xl italic text-stone-800` | Header logo |
| Hero / page title | `font-serif text-4xl`–`text-6xl` `text-stone-900` | Auth, study desk |
| Course title | `font-serif text-lg` / `text-base` `leading-tight truncate` | Rail, `CourseFolderLabel` |
| Section kicker | `text-xs font-semibold uppercase tracking-wide text-amber-800` | “Dashboard · …” |
| Section title | `text-lg`–`text-2xl` `font-bold` `text-stone-900` | Cards, panels |
| Small label | `text-[10px]`–`text-xs` `font-bold` `uppercase` `tracking-wider` `text-stone-400` | “Courses”, form sections |
| Body | `text-sm`–`text-base` `leading-relaxed` `text-stone-600` | Descriptions, notes |
| Timer / mono | `font-mono` `font-bold` | Recording duration |

**Weight hierarchy:** `font-bold` / `font-semibold` for UI emphasis; serif carries display weight without `font-black` on marketing blocks.

---

## Layout & spacing

### App shell — Interior C (split workspace)

```
┌──────────┬────────────┬─────────────────────────────────────┐
│ Course   │  Lecture   │  Header (sticky, h-16)               │
│ rail     │  list      ├─────────────────────────────────────┤
│ w-56     │  w-64–72   │  Main content (scroll)               │
│ (lg+)    │  (+mobile  │  Record / Study desk / Lecture detail │
│          │   drawer)  │                                      │
└──────────┴────────────┴─────────────────────────────────────┘
```

- Root: `flex h-screen bg-[#faf8f5] text-stone-900 overflow-hidden`
- **CourseRail:** `w-56`, `bg-stone-100/60`, `border-r`, hidden below `lg`
- **LectureListPanel:** `w-64 md:w-72`, white, `border-r`; mobile overlay via `isSidebarOpen`
- **Header:** `bg-white/90 backdrop-blur border-b border-stone-200`; brand + active course dot/name; “New capture” amber CTA
- Main padding: `p-4 sm:p-6 md:p-12` on content pages
- Max content width: `max-w-2xl` (study desk) or `max-w-4xl` (lecture detail)

### Border radius scale

| Token | Class | Use |
|-------|-------|-----|
| Control | `rounded-lg` / `rounded-xl` | Inputs, list items, tabs |
| Button | `rounded-xl` | CTAs |
| Card | `rounded-2xl` | Standard panels |
| Pill | `rounded-full` | Course badge, toggles, confusion FAB |

### Shadows

| Class | Use |
|-------|-----|
| `shadow-sm` | Cards, lecture panel |
| `shadow-md` | Flashcard flip |
| `shadow-2xl` | Chat modal |

---

## Components

### Buttons

**Primary (campus)**

```html
class="px-4 py-2 bg-amber-800 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-900 transition-colors"
```

**Primary (large CTA)**

```html
class="px-7 py-3.5 bg-amber-800 text-amber-50 rounded-xl font-semibold shadow-md hover:bg-amber-900"
```

**Secondary (outline)**

```html
class="px-7 py-3.5 border border-stone-300 rounded-xl font-semibold text-stone-700 bg-white hover:bg-stone-50"
```

**Strong neutral**

```html
class="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-semibold hover:bg-stone-800"
```

**Ghost / text**

```html
class="text-sm font-semibold text-stone-500 hover:text-stone-700"
```

**Icon button (header)**

```html
class="p-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
```

### Cards

**Standard panel**

```html
class="bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
```

**Feature card (with header)**

```html
class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
<!-- header --> class="bg-gradient-to-r from-amber-900 to-amber-800 px-6 py-4"
```

### Tabs

**Campus underline (study mode)**

```html
class="text-amber-900 border-b-2 border-amber-800 bg-amber-50/50"   <!-- active -->
class="text-stone-500 hover:text-stone-700 hover:bg-stone-50"       <!-- inactive -->
```

**Notes toggle (lecture detail)**

```html
class="flex gap-2 bg-stone-100 rounded-full p-1 border border-stone-200"
<!-- active segment --> class="bg-white shadow-sm text-stone-900"
```

### Form controls

```html
class="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-800/25 focus:border-amber-300"
```

### Alerts

| Type | Pattern |
|------|---------|
| Error | `bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm` |
| Success | `bg-green-50 border border-green-200 rounded-xl text-green-700` |
| Warning / busy | `bg-amber-50 border border-amber-100 rounded-xl text-amber-900` |
| Info | `bg-amber-50 border border-amber-200 rounded-xl text-amber-900` |

### Loading

**Spinner (campus)**

```html
class="w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full animate-spin"
```

### Empty states

Centered stack: icon circle (`bg-amber-50` or `bg-stone-100 rounded-full`) → `font-bold text-stone-900` title → `text-stone-600 text-sm` description → amber primary CTA.

### Course folder label

Use `CourseFolderLabel` for consistent course titles:

- Color bar: `h-1 rounded-full` with `displayCourseColor(color)`
- Name: `font-serif text-stone-900 truncate`
- Subtitle: `text-xs text-stone-500` (lecture count)

### Lecture list row

- Default: `rounded-xl hover:bg-stone-50 border-l-4 border-transparent`
- Active: `bg-amber-50/80` + `borderLeftColor: displayCourseColor(course.color)`
- Delete: `hidden group-hover:block` → `hover:text-red-500`

---

## Motion & animation

| Pattern | Class | Use |
|---------|-------|-----|
| Recording pulse | `animate-pulse` | Live recorder |
| Button | `transition-colors` | Most interactives |
| Progress | `transition-all duration-300` | Flashcard bar |
| Chat typing | `animate-bounce` on amber dots | `ChatWindow` |

Prefer **CSS transitions** over heavy JS animation. Respect `prefers-reduced-motion` when adding large motion.

---

## Icons & emoji

- **Study / feature:** Emoji in headers (🎓 🎙️ 🎴 📝) at modest sizes
- **UI icons:** Heroicons-style SVG, `stroke="currentColor"`, `w-5 h-5`
- Avoid icon-only buttons without `aria-label` on mobile

---

## Responsive behavior

Breakpoints: Tailwind defaults (`sm` 640px, `md` 768px, `lg` 1024px).

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Course rail | Hidden | Fixed `lg:flex` column |
| Lecture list | Drawer overlay + backdrop | Fixed column |
| Course filter | `<select>` in lecture panel | `CourseFolderLabel` block |
| Header CTA | “New capture” visible | Same |
| Study tab labels | Icon optional | Icon + label |

Touch targets: minimum **44px** on primary buttons.

---

## Accessibility

- Semantic HTML (`button`, `nav`, `main`, headings in order).
- Visible labels or `aria-label` on icon-only controls.
- Focus: `focus:ring-2 focus:ring-amber-800/25` on inputs.
- Status: pair dots with text (“Guest Mode”).
- Contrast: `text-stone-500` for metadata only, not critical small text on cream.

---

## Page-specific guidance

### Auth (Landing C)

- Full-page cream; serif hero; amber primary + white outline secondary.
- Feature grid `01` / `02` / `03` with faded serif numerals (`text-amber-800/30`).
- Footer: `bg-stone-900 text-stone-300`.

### Record flow

| State | Visual |
|-------|--------|
| IDLE | `StudyDeskDashboard` — serif “Your study desk”, amber Record/Upload |
| RECORDING | Red accent, stone-900 stop, amber confusion FAB |
| REVIEWING / pipeline | Campus spinners (`border-amber-800`) |
| ERROR | White card, red message, stone-900 back |

### Lecture detail

- Course badge: white pill + color dot + name (`displayCourseColor`).
- Cornell / summary toggle: stone pill segment control.
- Study Mode, Cornell, Chat: amber gradient headers — **no** purple duplication on the same view.

### Study planner

- Campus cards and amber CTAs; course folder step + lecture checkboxes scoped to `course_id`.

### Settings & onboarding (legacy)

- Still uses `gray-*` and `blue-600` in places — **new work in these files should use campus tokens** when editing.

---

## Do / Don't

### Do

- Use cream `#faf8f5`, stone neutrals, and `amber-800` for primary actions on campus surfaces.
- Use `font-serif` for brand, courses, and display headlines.
- Use `CourseFolderLabel` and `displayCourseColor()` for course UI.
- Keep one obvious primary CTA per view (usually amber).
- Match `design-explorations/landing-c-campus.html` and `interior-campus-c-split.html` for new layout work.
- Test at `sm`, `md`, and `lg` for any shell change.

### Don't

- Add `bg-blue-600`, `indigo-*`, or purple gradients to shell, auth, rail, lecture list, study mode, Cornell, flashcards, or chat.
- Use `font-black` + blue shadows on marketing blocks (old Classic theme).
- Use bright course colors (`#6366f1`) without `displayCourseColor()` in UI.
- Introduce a second CSS framework without a project-wide migration.
- Add dark mode without a coordinated pass (app is warm-light first).

---

## Migration notes

| Area | Status |
|------|--------|
| Auth, shell, course rail, lecture list, study desk | Campus ✅ |
| Lecture detail, Cornell, study mode, flashcards, chat, planner | Campus ✅ |
| Settings, onboarding, quiz UI, course create modal | Legacy blue/gray — migrate when touched |
| `HistorySidebar` | Unused; do not extend |

---

## Checklist for new UI

Before marking UI work complete:

- [ ] Matches Interior C shell (course rail + lecture list + main) when inside the app
- [ ] Uses Inter + DM Serif + cream/stone/amber palette
- [ ] Primary action is amber-800 (or stone-900 for neutral destructive/print)
- [ ] Course colors via `displayCourseColor()` and `CourseFolderLabel` where applicable
- [ ] Loading, error, and empty states defined
- [ ] Responsive at mobile, tablet, and desktop
- [ ] No new blue/purple on campus surfaces
- [ ] `npm run build` passes from `frontend/`

---

## Related docs

| File | Purpose |
|------|---------|
| `AGENTS.md` | Architecture, commands, agent rules |
| `PROMPT.md` | Session system prompt |
| `design-explorations/index.html` | Mockup index (Landing C + Interior options) |
| `frontend/index.html` | Fonts, cream body, scrollbar, Tailwind CDN |
| `frontend/src/constants/courseColors.ts` | Course palette + `displayCourseColor()` |
