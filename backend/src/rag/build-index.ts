import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { LocalIndex } from 'vectra';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
if (!VOYAGE_API_KEY) {
  console.error('FATAL: VOYAGE_API_KEY is not set in environment.');
  process.exit(1);
}

const DOCS_DIR = path.join(__dirname, 'docs');
const INDEX_PATH = path.join(__dirname, 'index');

// VoyageAI free tier allows 3 RPM. Wait 21s between calls to stay within limits.
const RATE_LIMIT_DELAY_MS = 21_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedText(text: string): Promise<number[]> {
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

async function buildIndex(): Promise<void> {
  console.log('Building RAG index...');

  // Bug #3 fix: Always delete and recreate the index directory so re-runs
  // never produce duplicate vectors. docs/ is the source of truth, not index/.
  if (fs.existsSync(INDEX_PATH)) {
    fs.rmSync(INDEX_PATH, { recursive: true, force: true });
    console.log('Cleared existing vectra index at', INDEX_PATH);
  }

  const index = new LocalIndex(INDEX_PATH);
  await index.createIndex();
  console.log('Created fresh vectra index at', INDEX_PATH);

  // Find all venue directories (subfolders of DOCS_DIR)
  const venueDirs = fs.readdirSync(DOCS_DIR).filter((file) => {
    return fs.statSync(path.join(DOCS_DIR, file)).isDirectory();
  });

  console.log(`Found ${venueDirs.length} venue folders in docs: ${venueDirs.join(', ')}`);

  // Count total docs first for progress display
  let docIndex = 0;
  let totalDocs = 0;
  for (const venueId of venueDirs) {
    const venuePath = path.join(DOCS_DIR, venueId);
    totalDocs += fs.readdirSync(venuePath).filter((f) => f.endsWith('.md')).length;
  }

  console.log(`Total docs to embed: ${totalDocs} (~${Math.round(RATE_LIMIT_DELAY_MS / 1000)}s delay between calls for VoyageAI free tier)\n`);

  for (const venueId of venueDirs) {
    const venuePath = path.join(DOCS_DIR, venueId);
    const files = fs.readdirSync(venuePath).filter((f) => f.endsWith('.md'));
    console.log(`\nProcessing venue "${venueId}" (${files.length} markdown files):`);

    for (const filename of files) {
      const filepath = path.join(venuePath, filename);
      const content = fs.readFileSync(filepath, 'utf-8');

      docIndex++;
      console.log(`  [${docIndex}/${totalDocs}] Embedding: ${filename} (${content.length} chars)...`);
      const vector = await embedText(content);

      await index.insertItem({
        vector,
        metadata: {
          filename,
          content,
          venue_id: venueId, // Tagged with venue_id for per-venue filtering
        },
      });

      console.log(`    ✓ Inserted ${filename}`);

      // Respect VoyageAI free-tier 3 RPM limit; skip delay after the last doc
      if (docIndex < totalDocs) {
        console.log(`    ⏳ Waiting ${RATE_LIMIT_DELAY_MS / 1000}s (VoyageAI rate limit)...`);
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }
  }

  console.log('\nRAG index build complete.');
}

buildIndex().catch((err) => {
  console.error('build-index failed:', err);
  process.exit(1);
});
