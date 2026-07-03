/**
 * mcp.ts — Backspace MCP (Model Context Protocol) Server
 *
 * Exposes Backspace provenance data to AI coding agents (Claude Code, etc.)
 * via the Model Context Protocol over stdio.
 *
 * Tools:
 *   - list_sessions     — Returns recent sessions with event counts
 *   - get_session_events — Returns all events for a specific session
 *   - list_snapshots    — Returns legacy snapshots (backward compatibility)
 *   - get_snapshot_diff — Returns legacy snapshot diff data
 *   - revert_session    — Reverts all changes in a session
 *
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { BackspaceDB, isInitialized } from './db.js';
import { decryptData } from './crypto.js';
import zlib from 'node:zlib';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffPayload {
  path: string;
  event: string;
  patch: string;
}

interface EncryptedEnvelope {
  cipher_payload: string;
  crypto_iv: string;
  crypto_tag: string;
  compressed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decompressPayload(payload: Buffer | null): string {
  if (!payload) return '';
  try {
    return zlib.brotliDecompressSync(payload).toString('utf8');
  } catch {
    return payload.toString('utf8');
  }
}

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'backspace',
  version: '0.2.0',
});

// ─── Tool: list_sessions ──────────────────────────────────────────────────────

// @ts-expect-error Type instantiation is excessively deep
server.tool(
  'list_sessions',
  'List recent Backspace sessions. Each session represents a watch lifecycle with individually tracked file events. Use this to understand AI coding activity.',
  {
    limit: z.number().min(1).max(20).default(5).describe(
      'Maximum number of sessions to return (default: 5, max: 20)',
    ),
  },
  async ({ limit }) => {
    const cwd = process.cwd();
    if (!isInitialized(cwd)) {
      return { content: [{ type: 'text' as const, text: 'Backspace is not initialized. Run `backspace-ai init` first.' }] };
    }

    const db = BackspaceDB.open(cwd);
    try {
      const sessions = db.listSessions(limit);

      if (sessions.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No sessions found. Start one with `backspace-ai watch`.' }] };
      }

      const formatted = sessions.map((s, i) => {
        const started = new Date(s.started_at).toLocaleString();
        const ended = s.ended_at ? new Date(s.ended_at).toLocaleString() : 'active';
        return [
          `### ${i + 1}. Session \`${s.id.substring(0, 8)}\``,
          `- **Status:** ${s.status}`,
          `- **Prompt:** ${s.prompt}`,
          `- **Tool:** ${s.tool ?? 'unknown'}`,
          `- **Events:** ${s.event_count}`,
          `- **Started:** ${started}`,
          `- **Ended:** ${ended}`,
          `- **Full ID:** \`${s.id}\``,
        ].join('\n');
      });

      return {
        content: [{ type: 'text' as const, text: `# Backspace Sessions (${sessions.length} most recent)\n\n${formatted.join('\n\n---\n\n')}` }],
      };
    } finally {
      db.close();
    }
  },
);

// ─── Tool: get_session_events ─────────────────────────────────────────────────

server.tool(
  'get_session_events',
  'Get all file-level events for a specific session. Each event shows what file was changed, the event type (add/change/unlink), and the unified diff.',
  {
    session_id: z.string().describe('The session UUID (full or first 8 characters). Get IDs from list_sessions.'),
  },
  async ({ session_id }) => {
    const cwd = process.cwd();
    if (!isInitialized(cwd)) {
      return { content: [{ type: 'text' as const, text: 'Backspace is not initialized. Run `backspace-ai init` first.' }] };
    }

    const db = BackspaceDB.open(cwd);
    try {
      const session = db.findSession(session_id);
      if (!session) {
        return { content: [{ type: 'text' as const, text: `Session not found: \`${session_id}\`. Use \`list_sessions\` to see available IDs.` }] };
      }

      const events = db.listSessionEvents(session.id);
      if (events.length === 0) {
        return { content: [{ type: 'text' as const, text: `Session \`${session.id.substring(0, 8)}\` has no events.` }] };
      }

      const sections = events.map((e) => {
        const patch = decompressPayload(e.diff_payload);
        const time = new Date(e.captured_at).toLocaleString();

        if (e.event_type === 'unlink') {
          return `## ${e.file_path} *(deleted)*\n- **Seq:** ${e.sequence} | **Time:** ${time}\n\`\`\`\n${patch}\n\`\`\``;
        }
        return `## ${e.file_path}\n- **Type:** ${e.event_type} | **Seq:** ${e.sequence} | **Time:** ${time}\n\`\`\`diff\n${patch}\n\`\`\``;
      });

      const header = [
        `# Events for Session \`${session.id.substring(0, 8)}\``,
        `- **Prompt:** ${session.prompt}`,
        `- **Status:** ${session.status}`,
        `- **Events:** ${events.length}`,
        '',
      ].join('\n');

      return { content: [{ type: 'text' as const, text: header + '\n' + sections.join('\n\n') }] };
    } finally {
      db.close();
    }
  },
);

// ─── Tool: revert_session ─────────────────────────────────────────────────────

server.tool(
  'revert_session',
  'Revert all file changes from a specific session. This undoes all AI modifications atomically. Use with caution.',
  {
    session_id: z.string().describe('The session UUID to revert. Get IDs from list_sessions.'),
  },
  async ({ session_id }) => {
    const cwd = process.cwd();
    if (!isInitialized(cwd)) {
      return { content: [{ type: 'text' as const, text: 'Backspace is not initialized. Run `backspace-ai init` first.' }] };
    }

    // Delegate to the CLI command
    return {
      content: [{
        type: 'text' as const,
        text: `To revert session \`${session_id}\`, run:\n\`\`\`\nbackspace-ai revert --id ${session_id}\n\`\`\`\nThis will reverse all file changes in the session.`,
      }],
    };
  },
);

// ─── Tool: list_snapshots (backward compat) ──────────────────────────────────

// @ts-expect-error Type instantiation is excessively deep
server.tool(
  'list_snapshots',
  'List legacy Backspace snapshots. For newer sessions with individual events, use list_sessions instead.',
  {
    limit: z.number().min(1).max(20).default(5).describe(
      'Maximum number of snapshots to return (default: 5, max: 20)',
    ),
  },
  async ({ limit }) => {
    const cwd = process.cwd();
    if (!isInitialized(cwd)) {
      return { content: [{ type: 'text' as const, text: 'Backspace is not initialized. Run `backspace-ai init` first.' }] };
    }

    const db = BackspaceDB.open(cwd);
    try {
      const snapshots = db.listSnapshots(limit);

      if (snapshots.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No snapshots found. Start the daemon with `backspace-ai watch`.' }] };
      }

      const formatted = snapshots.map((s, i) => {
        const time = s.timestamp.toLocaleString();
        const files = s.file_paths.join(', ');
        return [
          `### ${i + 1}. Snapshot \`${s.id.substring(0, 8)}\``,
          `- **Time:** ${time}`,
          `- **Prompt:** ${s.prompt_context}`,
          `- **Files (${s.file_paths.length}):** ${files}`,
          `- **Full ID:** \`${s.id}\``,
        ].join('\n');
      });

      return {
        content: [{ type: 'text' as const, text: `# Backspace Snapshots (${snapshots.length} most recent)\n\n${formatted.join('\n\n---\n\n')}` }],
      };
    } finally {
      db.close();
    }
  },
);

// ─── Tool: get_snapshot_diff (backward compat) ───────────────────────────────

server.tool(
  'get_snapshot_diff',
  'Get the full diff for a legacy snapshot. For newer sessions, use get_session_events instead.',
  {
    snapshot_id: z.string().describe('The snapshot UUID (full or first 8 characters).'),
  },
  async ({ snapshot_id }) => {
    const cwd = process.cwd();
    if (!isInitialized(cwd)) {
      return { content: [{ type: 'text' as const, text: 'Backspace is not initialized. Run `backspace-ai init` first.' }] };
    }

    const db = BackspaceDB.open(cwd);
    try {
      const snapshot = db.findSnapshot(snapshot_id);
      if (!snapshot) {
        return { content: [{ type: 'text' as const, text: `Snapshot not found: \`${snapshot_id}\`. Use \`list_snapshots\` to see available IDs.` }] };
      }

      let diffPayloads: DiffPayload[];
      try {
        const rawPayload = snapshot.diff_data;

        if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
          const envelope = rawPayload as Partial<EncryptedEnvelope>;
          if (envelope.cipher_payload && envelope.crypto_iv && envelope.crypto_tag) {
            let decryptedStr = decryptData(envelope.cipher_payload, envelope.crypto_iv, envelope.crypto_tag, cwd);
            if (envelope.compressed) {
              const compressedBuf = Buffer.from(decryptedStr, 'base64');
              decryptedStr = zlib.brotliDecompressSync(compressedBuf).toString('utf8');
            }
            diffPayloads = JSON.parse(decryptedStr) as DiffPayload[];
          } else {
            diffPayloads = [];
          }
        } else if (Array.isArray(rawPayload)) {
          diffPayloads = rawPayload as DiffPayload[];
        } else {
          diffPayloads = [];
        }
      } catch {
        return { content: [{ type: 'text' as const, text: `Failed to decrypt snapshot \`${snapshot_id}\`. The encryption key may have changed.` }] };
      }

      if (diffPayloads.length === 0) {
        return { content: [{ type: 'text' as const, text: `Snapshot \`${snapshot.id.substring(0, 8)}\` has no diff data.` }] };
      }

      const sections = diffPayloads.map((entry) => {
        if (entry.patch === 'BINARY_FILE_BYPASSED') {
          return `## ${entry.path}\n*(binary file — ${entry.event})*`;
        }
        if (entry.event === 'unlink') {
          return `## ${entry.path} *(deleted)*\n\`\`\`\n${entry.patch}\n\`\`\``;
        }
        return `## ${entry.path}\n\`\`\`diff\n${entry.patch}\n\`\`\``;
      });

      const header = [
        `# Diff for Snapshot \`${snapshot.id.substring(0, 8)}\``,
        `- **Time:** ${snapshot.timestamp.toLocaleString()}`,
        `- **Prompt:** ${snapshot.prompt_context}`,
        `- **Files changed:** ${diffPayloads.length}`,
        '',
      ].join('\n');

      return { content: [{ type: 'text' as const, text: header + '\n' + sections.join('\n\n') }] };
    } finally {
      db.close();
    }
  },
);

// ─── Start the server ─────────────────────────────────────────────────────────

export async function mcpCommand(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Backspace MCP] Server started on stdio (v0.2.0 — sessions + events)');
}
