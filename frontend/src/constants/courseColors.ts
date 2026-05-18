/** Campus-aligned course folder colors (muted, work on cream backgrounds). */
export const COURSE_COLORS = [
  '#92400e', // amber-800
  '#78716c', // stone-500
  '#a16207', // yellow-700
  '#9a3412', // orange-800
  '#166534', // green-800
  '#1e3a5f', // slate-navy
  '#6b21a8', // purple-800
  '#9f1239', // rose-800
];

/** Pre-campus bright accents stored on older courses — map to muted palette for display. */
const LEGACY_COURSE_COLORS: Record<string, string> = {
  '#6366f1': '#92400e',
  '#4f46e5': '#1e3a5f',
  '#3b82f6': '#1e3a5f',
  '#8b5cf6': '#6b21a8',
  '#a855f7': '#6b21a8',
  '#ec4899': '#9f1239',
  '#10b981': '#166534',
  '#22c55e': '#166534',
  '#f59e0b': '#a16207',
  '#ef4444': '#9a3412',
};

/** Use when rendering course color bars, borders, and badges (does not change DB). */
export function displayCourseColor(stored: string): string {
  const key = stored.trim().toLowerCase();
  return LEGACY_COURSE_COLORS[key] ?? stored;
}
