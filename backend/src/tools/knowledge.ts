import path from 'path';
import axios from 'axios';
import { LocalIndex } from 'vectra';
import { ToolResult } from './types';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const INDEX_PATH = path.join(__dirname, '..', 'rag', 'index');

let _index: LocalIndex | null = null;

async function getIndex(): Promise<LocalIndex> {
  if (!_index) {
    _index = new LocalIndex(INDEX_PATH);
  }
  return _index;
}

async function embedQuery(text: string): Promise<number[]> {
  const response = await axios.post(
    'https://api.voyageai.com/v1/embeddings',
    {
      input: [text],
      model: 'voyage-3-lite',
    },
    {
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.data[0].embedding as number[];
}

export async function knowledge(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const query = input.query as string;
    const venueId = input.venue_id as string;

    if (!query) {
      return { success: false, error: 'query is required' };
    }
    if (!venueId) {
      return { success: false, error: 'venue_id is required' };
    }

    const index = await getIndex();
    const vector = await embedQuery(query);

    // Filter results using venue_id metadata tag — Vectra MetadataFilter uses
    // MongoDB-style operators: { field: { '$eq': value } }
    const results = await index.queryItems(vector, query, 2, { venue_id: { '$eq': venueId } });

    if (results.length === 0) {
      return { success: true, data: { results: [], message: 'No relevant documents found for this venue.' } };
    }

    const docs = results.map((r) => ({
      score: r.score,
      content: (r.item.metadata as Record<string, unknown>).content as string,
      filename: (r.item.metadata as Record<string, unknown>).filename as string,
      venue_id: (r.item.metadata as Record<string, unknown>).venue_id as string,
    }));

    return { success: true, data: { results: docs } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
