import { supabase } from './supabase';
import { CornellNotes, LectureSummary, Flashcard } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface NotionExportResult { pageUrl: string; pageId: string; }

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY };
}

async function notionRequest(notionPath: string, method: string, payload?: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/notion-proxy`, {
    method,
    headers,
    body: JSON.stringify({ notionPath, payload }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Notion request failed');
  }
  return response.json();
}

// Chunk array into batches of n
function chunk<T>(arr: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
}

async function appendChildren(pageId: string, blocks: any[]): Promise<void> {
  const batches = chunk(blocks, 100);
  for (const batch of batches) {
    await notionRequest(`/v1/blocks/${pageId}/children`, 'PATCH', { children: batch });
  }
}

export const NotionService = {
  testConnection: async (): Promise<{ name: string }> => {
    const data = await notionRequest('/v1/search', 'POST', { query: '', filter: { object: 'page' }, page_size: 1 });
    return { name: 'Connected' };
  },

  getPages: async (): Promise<{ id: string; title: string }[]> => {
    const data = await notionRequest('/v1/search', 'POST', { query: '', filter: { object: 'page' }, page_size: 20 });
    return (data.results || []).map((p: any) => ({
      id: p.id,
      title: p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
    }));
  },

  exportCornellNotes: async (title: string, notes: CornellNotes, parentPageId: string): Promise<NotionExportResult> => {
    const page = await notionRequest('/v1/pages', 'POST', {
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: title } }] } },
    });

    // Build Cornell Notes blocks
    const blocks: any[] = [
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Cornell Notes' } }] } },
      { object: 'block', type: 'divider', divider: {} },
    ];

    // Zip cues and notes
    const rows = Math.max(notes.cues.length, notes.notes.length);
    for (let i = 0; i < rows; i++) {
      const cue = notes.cues[i] || '';
      const note = notes.notes[i] || '';
      blocks.push({
        object: 'block', type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '💡' },
          rich_text: [{ text: { content: cue } }],
          color: 'blue_background',
        },
      });
      blocks.push({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: note } }] },
      });
    }

    blocks.push({ object: 'block', type: 'divider', divider: {} });
    blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: 'Summary' } }] } });
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: notes.summary } }] } });

    await appendChildren(page.id, blocks);
    return { pageId: page.id, pageUrl: page.url };
  },

  exportFlashcardsDatabase: async (title: string, flashcards: Flashcard[], parentPageId: string): Promise<NotionExportResult> => {
    const page = await notionRequest('/v1/pages', 'POST', {
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: `${title} — Flashcards` } }] } },
    });

    const blocks: any[] = flashcards.map(card => ({
      object: 'block', type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: card.term }, annotations: { bold: true } }],
        children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: card.definition } }] } }],
      },
    }));

    await appendChildren(page.id, blocks);
    return { pageId: page.id, pageUrl: page.url };
  },

  exportSummary: async (title: string, summary: LectureSummary, parentPageId: string): Promise<NotionExportResult> => {
    const page = await notionRequest('/v1/pages', 'POST', {
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: `${title} — Summary` } }] } },
    });

    const blocks: any[] = [
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Overview' } }] } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: summary.overview } }] } },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Key Points' } }] } },
      ...summary.keyPoints.map(p => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: p } }] } })),
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Vocabulary' } }] } },
      ...summary.vocabulary.map(v => ({
        object: 'block', type: 'toggle',
        toggle: {
          rich_text: [{ text: { content: v.term }, annotations: { bold: true } }],
          children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: v.definition } }] } }],
        },
      })),
    ];

    if (summary.actionItems.length > 0) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Action Items' } }] } });
      blocks.push(...summary.actionItems.map(item => ({
        object: 'block', type: 'to_do',
        to_do: { rich_text: [{ text: { content: item } }], checked: false },
      })));
    }

    await appendChildren(page.id, blocks);
    return { pageId: page.id, pageUrl: page.url };
  },
};
