import { describe, expect, it } from 'vitest';

import {
  dedupePreservingOrder,
  MAX_SCHEDULE_IMPORT_BYTES,
  MIN_SCHEDULE_TEXT_CHARS,
  normalizeComparisonKey,
  parseIcsEventSummaries,
  suggestClassNamesFromPdfText,
} from './scheduleImport';

describe('normalizeComparisonKey', () => {
  it('trims, lowercases, and collapses internal whitespace', () => {
    expect(normalizeComparisonKey('  CS   101  ')).toBe('cs 101');
  });
});

describe('dedupePreservingOrder', () => {
  it('keeps first spelling and drops case-insensitive duplicates', () => {
    expect(dedupePreservingOrder(['CS 101', 'cs 101', ' Cs 101 '])).toEqual(['CS 101']);
  });

  it('skips empty and whitespace-only entries', () => {
    expect(dedupePreservingOrder(['a', '  ', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('parseIcsEventSummaries', () => {
  it('reads SUMMARY lines from VEVENT blocks', () => {
    const ics = `
BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:MATH 301 Calculus I
END:VEVENT
BEGIN:VEVENT
SUMMARY:PHY 202
END:VEVENT
END:VCALENDAR`;
    expect(parseIcsEventSummaries(ics)).toEqual(['MATH 301 Calculus I', 'PHY 202']);
  });

  it('unfolds iCalendar folded continuations before matching SUMMARY', () => {
    const ics = 'BEGIN:VEVENT\nSUMMARY:Long course\n title here\nEND:VEVENT';
    expect(parseIcsEventSummaries(ics)).toEqual(['Long coursetitle here']);
  });

  it('unescapes common iCalendar text escapes in SUMMARY values', () => {
    const ics = 'BEGIN:VEVENT\nSUMMARY:Dept\\, meeting and room\\; A\\\\ path\nEND:VEVENT';
    expect(parseIcsEventSummaries(ics)).toEqual(['Dept, meeting and room; A\\ path']);
  });

  it('dedupes identical summaries across events', () => {
    const ics = `
BEGIN:VEVENT
SUMMARY:Same
END:VEVENT
BEGIN:VEVENT
SUMMARY:same
END:VEVENT`;
    expect(parseIcsEventSummaries(ics)).toEqual(['Same']);
  });
});

describe('suggestClassNamesFromPdfText', () => {
  it('collects lines with spaced course codes', () => {
    const text = 'CSE 3310 Algorithms\nother line is ignored (no leading cap)';
    expect(suggestClassNamesFromPdfText(text)).toEqual(['CSE 3310 Algorithms']);
  });

  it('collects tight codes like CS3310', () => {
    expect(suggestClassNamesFromPdfText('Enroll in CS3310 next term')).toEqual(['Enroll in CS3310 next term']);
  });

  it('skips weekday-only short lines', () => {
    expect(suggestClassNamesFromPdfText('Monday')).toEqual([]);
    expect(suggestClassNamesFromPdfText('Friday 9am')).toEqual([]);
  });

  it('truncates very long lines with spaced codes to dept and number', () => {
    const filler = 'x'.repeat(200);
    expect(suggestClassNamesFromPdfText(`${filler} MATH 405 ${filler}`)).toEqual(['MATH 405']);
  });

  it('skips lines that are only a time range', () => {
    expect(suggestClassNamesFromPdfText('9:00 – 10:30')).toEqual([]);
  });

  it('accepts short title-like lines without course codes', () => {
    expect(suggestClassNamesFromPdfText('Intro to Statistics')).toEqual(['Intro to Statistics']);
  });

  it('respects dedupe and caps at 120 unique candidates', () => {
    const lines = Array.from({ length: 150 }, (_, i) => `DEPT ${1000 + i}`);
    const text = lines.join('\n');
    expect(suggestClassNamesFromPdfText(text)).toHaveLength(120);
  });
});

describe('import size constants', () => {
  it('exports expected schedule import limits', () => {
    expect(MAX_SCHEDULE_IMPORT_BYTES).toBe(5 * 1024 * 1024);
    expect(MIN_SCHEDULE_TEXT_CHARS).toBe(40);
  });
});
