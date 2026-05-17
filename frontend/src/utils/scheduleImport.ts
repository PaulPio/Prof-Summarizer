/** Client-side helpers for ICS / PDF schedule import (preview only until user confirms). */

export const MAX_SCHEDULE_IMPORT_BYTES = 5 * 1024 * 1024;
/** If extracted PDF text is shorter than this, treat as unreadable / likely scanned image PDF. */
export const MIN_SCHEDULE_TEXT_CHARS = 40;

/** Case/whitespace-stable key for deduping titles against existing courses. */
export function normalizeComparisonKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Unfold iCalendar line continuations, normalize newlines */
function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\n[\t ]/g, '');
}

/** Pull SUMMARY titles from ICS / iCal text */
export function parseIcsEventSummaries(contents: string): string[] {
  const text = unfoldIcs(contents);
  const summaries: string[] = [];
  const re = /^SUMMARY[^:]*:(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let v = m[1]?.trim();
    if (!v) continue;
    v = v.replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
    if (v) summaries.push(v);
  }
  return dedupePreservingOrder(summaries);
}

export function dedupePreservingOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = normalizeComparisonKey(n);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

const WEEKDAY_WORDS = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
]);

/** Heuristic class-name candidates from raw schedule text (tabular PDF dumps, etc.). */
export function suggestClassNamesFromPdfText(raw: string): string[] {
  const text = raw.replace(/\u00a0/g, ' ');
  const lines = text
    .split(/[\r\n]+/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const codeLine = /\b([A-Z]{2,8})\s+([0-9]{3,4}[A-Za-z]?)\b/;
  const codeTight = /\b([A-Z]{2,5})([0-9]{3,4}[A-Za-z]?)\b/;

  const candidates: string[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    const words = low.split(/\s+/);
    if (words.length <= 2 && WEEKDAY_WORDS.has(words[0] || '')) continue;
    if (/^(am|pm|time|location|room|instructor|professor)$/i.test(line)) continue;
    // Skip obvious time ranges at line start only
    if (/^\d{1,2}:\d{2}\s*[–\-]\s*\d{1,2}:\d{2}$/.test(line)) continue;

    if (codeLine.test(line)) {
      if (line.length <= 140) candidates.push(line);
      else {
        const m = line.match(codeLine);
        if (m) candidates.push(`${m[1]} ${m[2]}`);
      }
      continue;
    }
    if (codeTight.test(line)) {
      const m = line.match(codeTight)!;
      if (line.length <= 120) candidates.push(line);
      else candidates.push(`${m[1]} ${m[2]}`);
      continue;
    }
    // Longer prose lines occasionally include course titles only (no codes)
    if (line.length >= 8 && line.length <= 80 && /^[A-Z]/.test(line) && !/^\d+$/.test(line)) {
      if (!/[@:]/.test(line)) candidates.push(line);
    }
  }

  return dedupePreservingOrder(candidates).slice(0, 120);
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = worker.default as string;

  const data = await file.arrayBuffer();
  const doc = await getDocument({ data }).promise;
  let out = '';
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if (item && typeof item === 'object' && 'str' in item && typeof (item as { str?: string }).str === 'string') {
        out += (item as { str: string }).str + ' ';
      }
    }
    out += '\n';
  }
  return out.replace(/\s+\n/g, '\n').trim();
}
