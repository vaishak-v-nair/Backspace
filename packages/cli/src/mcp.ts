/**
 * mcp.ts — Backspace MCP (Model Context Protocol) Server
 *
 * Exposes Backspace snapshot data to AI coding agents (Claude Code, etc.)
 * via the Model Context Protocol over stdio.
 *
 * Tools:
 *   - list_snapshots  — Returns the last N snapshots with timestamps & prompts
 *   - get_snapshot_diff — Returns the full diff data for a specific snapshot
 *
 * This file is a separate entry point from `index.ts`. It runs as a
 * subprocess spawned by the AI agent's MCP host. All logging goes to
 * stderr (stdout is reserved for the MCP JSON-RPC transport).
 *
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { openDatabase, listSnapshots, getSnapshot, isInitialized } from './db.js';
import { decryptData } from './crypto.js';
import zlib from 'zlib';

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'backspace',
  version: '0.1.0',
});

// ─── Tool: list_snapshots ─────────────────────────────────────────────────────

// @ts-expect-error Type instantiation is excessively deep
server.tool(
  'list_snapshots',
  'List the most recent Backspace snapshots. Returns timestamps, prompt context, and affected file paths. Use this to understand what the AI agent changed recently.',
  {
    limit: z.number().min(1).max(20).default(5).describe(
      'Maximum number of snapshots to return (default: 5, max: 20)'
    ),
  },
  async ({ limit }) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Backspace is not initialized in this directory. Run `backspace init` first.',
        }],
      };
    }

    const db = openDatabase(cwd);
    try {
      const snapshots = listSnapshots(db).slice(0, limit);

      if (snapshots.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No snapshots found. Start the daemon with `backspace watch` to begin capturing.',
          }],
        };
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
        content: [{
          type: 'text' as const,
          text: `# Backspace Snapshots (${snapshots.length} most recent)\n\n${formatted.join('\n\n---\n\n')}`,
        }],
      };
    } finally {
      db.close();
    }
  }
);

// ─── Tool: get_snapshot_diff ──────────────────────────────────────────────────

server.tool(
  'get_snapshot_diff',
  'Get the full red/green unified diff for a specific Backspace snapshot. Use this to see exactly what code was added or removed.',
  {
    snapshot_id: z.string().describe(
      'The snapshot UUID (full or first 8 characters). Get IDs from list_snapshots.'
    ),
  },
  async ({ snapshot_id }) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Backspace is not initialized in this directory. Run `backspace init` first.',
        }],
      };
    }

    const db = openDatabase(cwd);
    try {
      // Support short IDs (first 8 chars) by doing a prefix search
      let snapshot = getSnapshot(db, snapshot_id);

      if (!snapshot && snapshot_id.length < 36) {
        // Try prefix match
        const all = listSnapshots(db);
        const match = all.find(s => s.id.startsWith(snapshot_id));
        if (match) {
          snapshot = getSnapshot(db, match.id);
        }
      }

      if (!snapshot) {
        return {
          content: [{
            type: 'text' as const,
            text: `Snapshot not found: \`${snapshot_id}\`. Use \`list_snapshots\` to see available IDs.`,
          }],
        };
      }

      // Decrypt the snapshot payload if it's encrypted
      let diffPayloads: any[];
      try {
        let rawPayload = snapshot.diff_data;
        if (typeof rawPayload === 'string') {
          rawPayload = JSON.parse(rawPayload);
        }

        if (rawPayload && rawPayload.cipher_payload) {
          // Encrypted payload — decrypt it
          let decryptedStr = decryptData(
            rawPayload.cipher_payload,
            rawPayload.crypto_iv,
            rawPayload.crypto_tag,
            cwd
          );

          // If the payload was compressed before encryption, decompress
          if (rawPayload.compressed) {
            const compressedBuf = Buffer.from(decryptedStr, 'base64');
            decryptedStr = zlib.brotliDecompressSync(compressedBuf).toString('utf8');
          }

          diffPayloads = JSON.parse(decryptedStr);
        } else if (Array.isArray(rawPayload)) {
          // Unencrypted legacy format
          diffPayloads = rawPayload;
        } else {
          diffPayloads = [];
        }
      } catch (e) {
        return {
          content: [{
            type: 'text' as const,
            text: `Failed to decrypt snapshot \`${snapshot_id}\`. The encryption key may have changed.`,
          }],
        };
      }

      if (diffPayloads.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `Snapshot \`${snapshot.id.substring(0, 8)}\` has no diff data.`,
          }],
        };
      }

      const sections = diffPayloads.map((entry: any) => {
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

      return {
        content: [{
          type: 'text' as const,
          text: header + '\n' + sections.join('\n\n'),
        }],
      };
    } finally {
      db.close();
    }
  }
);

// ─── Start the server ─────────────────────────────────────────────────────────

export async function mcpCommand() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (stdout is the MCP transport)
  console.error('[Backspace MCP] Server started on stdio');
}
