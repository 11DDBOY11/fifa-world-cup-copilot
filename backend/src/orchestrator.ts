import 'dotenv/config';
import { Groq } from 'groq-sdk';
import db from './db';
import { venues } from './config/venues';
import { navigation } from './tools/navigation';
import { weather } from './tools/weather';
import { crowd } from './tools/crowd';
import { knowledge } from './tools/knowledge';
import type { ToolResult } from './tools/types';

export const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Spec system prompt — {venue_name}, {venue_city}, {default_language}, {unit_system}
// filled from venues.ts at request time, not hardcoded.
function buildSystemPrompt(venueId: string): string {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) {
    throw new Error(`Unknown venue_id: ${venueId}`);
  }
  return (
    `You are Fan Copilot, an assistant for FIFA World Cup 2026 attendees at ` +
    `${venue.name} in ${venue.city}. ` +
    `Answer in the same language the user writes in, defaulting to ${venue.default_language} if unclear. ` +
    `Use ${venue.unit_system} units. ` +
    `Use the available tools to get real information before answering — ` +
    `do not guess at routes, weather, or crowd levels. ` +
    `Keep answers short and conversational, suitable for a mobile chat window.`
  );
}

// All 4 tools registered in the OpenAI/Groq function calling format.
const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'navigation',
      description:
        'Get directions from an origin location to the current venue. Supports walking and driving modes only — transit routing is not available. Returns route duration and distance in the venue\'s unit system.',
      parameters: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'Starting address or location name.',
          },
          venue_id: {
            type: 'string',
            description: 'The venue ID (provided by the session context).',
          },
          mode: {
            type: 'string',
            enum: ['walking', 'driving'],
            description: 'Travel mode. Use walking for pedestrian routes, driving for car routes. Transit is not supported — do not suggest it.',
          },
        },
        required: ['origin', 'venue_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'weather',
      description:
        'Get current weather conditions at the venue\'s city, in the venue\'s unit system (°F for imperial, °C for metric).',
      parameters: {
        type: 'object',
        properties: {
          venue_id: {
            type: 'string',
            description: 'The venue ID (provided by the session context).',
          },
        },
        required: ['venue_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'crowd',
      description:
        'Get current crowd occupancy levels for all gates at the specified venue.',
      parameters: {
        type: 'object',
        properties: {
          venue_id: {
            type: 'string',
            description: 'The venue ID (provided by the session context).',
          },
        },
        required: ['venue_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'knowledge',
      description:
        'Look up venue-specific information from the knowledge base: gate maps, accessible facilities, transit options.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The question or topic to search the knowledge base for.',
          },
          venue_id: {
            type: 'string',
            description: 'The venue ID (provided by the session context).',
          },
        },
        required: ['query', 'venue_id'],
      },
    },
  },
];

type ToolName = 'navigation' | 'weather' | 'crowd' | 'knowledge';

const TOOL_MAP: Record<ToolName, (input: Record<string, unknown>) => Promise<ToolResult>> = {
  navigation,
  weather,
  crowd,
  knowledge,
};

// Max prior conversation pairs (user + assistant) to include for context.
// 10 pairs = 20 rows max from DB — keeps token count reasonable.
const MAX_HISTORY_PAIRS = 10;

interface ChatLogRow {
  role: string;
  content: string;
}

function loadHistory(sessionId: string): Groq.Chat.ChatCompletionMessageParam[] {
  // Fetch the last MAX_HISTORY_PAIRS * 2 rows for this session,
  // excluding the message we just inserted (hence LIMIT - offset by 1).
  // We exclude the last row because it IS the current user message already
  // added to the array below.
  const rows = db
    .prepare(
      `SELECT role, content FROM chat_log
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(sessionId, MAX_HISTORY_PAIRS * 2 + 1) as ChatLogRow[];

  // Reverse to chronological order, then drop the first result which is the
  // current user message we just inserted.
  const chronological = rows.reverse();
  const history = chronological.slice(0, chronological.length - 1);

  return history
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
    }));
}

function logMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
  db.prepare(
    'INSERT INTO chat_log (session_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, role, content, new Date().toISOString());
}

/**
 * Main orchestration entry point using Groq.
 * venue_id is injected into every tool call so the model never has to ask the
 * fan which venue they mean — it's already known from the session.
 * Prior messages for the session are loaded from chat_log and prepended so
 * the model has conversation context for follow-up questions.
 */
export async function orchestrate(
  sessionId: string,
  userMessage: string,
  venueId: string
): Promise<string> {
  // Log the incoming user message FIRST so loadHistory can exclude it correctly.
  logMessage(sessionId, 'user', userMessage);

  const systemPrompt = buildSystemPrompt(venueId);

  // Load prior turns (everything except the message we just logged).
  const history = loadHistory(sessionId);
  console.log(`[Memory] Session ${sessionId}: loaded ${history.length} prior message(s) from chat_log`);

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  // Tool-use loop
  while (true) {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Append assistant turn to message history
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const finalText = assistantMessage.content || '';
      logMessage(sessionId, 'assistant', finalText);
      return finalText;
    }

    // Execute tool calls requested by Groq
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name as ToolName;
      const toolFn = TOOL_MAP[toolName];

      // Safe JSON argument parsing
      let rawArgs: Record<string, unknown> = {};
      try {
        rawArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        console.error('Error parsing tool arguments:', e);
      }

      // Inject/overwrite venue_id with session's actual venueId as a safety net
      const toolInput = {
        ...rawArgs,
        venue_id: venueId,
      };

      console.log(`[Tool Call] Name: ${toolName} | Raw Arguments: ${toolCall.function.arguments}`);
      console.log(`[Tool Call] Executing with input (venue_id injected):`, JSON.stringify(toolInput));

      let resultContent: string;
      if (!toolFn) {
        resultContent = JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
      } else {
        const result = await toolFn(toolInput);
        resultContent = JSON.stringify(result);
      }

      console.log(`[Tool Result] Name: ${toolName} | Output:`, resultContent);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: resultContent,
      });
    }
  }
}
