/**
 * extension.ts — Backspace VS Code Extension
 *
 * Provides a sidebar "Timeline" webview that reads snapshots from the
 * local `.backspace/db.sqlite` database (created by the Backspace CLI)
 * and lets the user scrub through them with a range slider.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKSPACE_DIR = '.backspace';
const DB_FILENAME = 'db.sqlite';
const MAX_SNAPSHOTS = 10;

// ─── Types (mirrors CLI's schema) ────────────────────────────────────────────

interface SnapshotRow {
  id: string;
  timestamp: number;
  prompt_context: string;
  file_paths: string; // JSON-serialised string[]
  diff_data: string;  // JSON-serialised Record<string, string>
}

interface SnapshotPayload {
  id: string;
  timestamp: number;
  date: string;
  prompt: string;
  files: string[];
  fileCount: number;
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * Resolves the path to the `.backspace/db.sqlite` file in the first
 * workspace folder. Returns `undefined` if the file doesn't exist.
 */
function resolveDbPath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  const dbPath = path.join(folders[0].uri.fsPath, BACKSPACE_DIR, DB_FILENAME);
  return fs.existsSync(dbPath) ? dbPath : undefined;
}

/**
 * Opens the SQLite database in read-only mode and fetches the most
 * recent snapshots.
 */
function fetchSnapshots(dbPath: string, limit: number = MAX_SNAPSHOTS): SnapshotPayload[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    const rows = db
      .prepare('SELECT id, timestamp, prompt_context, file_paths FROM snapshots ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as SnapshotRow[];

    return rows.map((row) => {
      const files: string[] = JSON.parse(row.file_paths);
      return {
        id: row.id,
        timestamp: row.timestamp,
        date: new Date(row.timestamp).toLocaleString(),
        prompt: row.prompt_context,
        files,
        fileCount: files.length,
      };
    });
  } finally {
    db.close();
  }
}

/**
 * Fetches the full diff_data for a single snapshot by ID.
 */
function fetchSnapshotDiff(dbPath: string, snapshotId: string): Record<string, string> | null {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    const row = db
      .prepare('SELECT diff_data FROM snapshots WHERE id = ?')
      .get(snapshotId) as Pick<SnapshotRow, 'diff_data'> | undefined;

    return row ? JSON.parse(row.diff_data) : null;
  } finally {
    db.close();
  }
}

// ─── Webview Provider ─────────────────────────────────────────────────────────

class TimelineViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'backspace.timelineView';

  private _view?: vscode.WebviewView;
  private _dbPath?: string;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Resolve DB path
    this._dbPath = resolveDbPath();

    // Set the HTML content
    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Send initial snapshot data
    this._sendSnapshots();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'snapshotSelected': {
          const { snapshotId, timestamp } = message;
          vscode.window.showInformationMessage(
            `Backspace: Selected snapshot ${snapshotId.substring(0, 8)} (${new Date(timestamp).toLocaleString()})`
          );

          // Fetch and display diff data for the selected snapshot
          if (this._dbPath) {
            const diffs = fetchSnapshotDiff(this._dbPath, snapshotId);
            if (diffs) {
              this._view?.webview.postMessage({
                type: 'snapshotDiff',
                snapshotId,
                diffs,
              });
            }
          }
          break;
        }

        case 'refresh': {
          this._dbPath = resolveDbPath();
          this._sendSnapshots();
          break;
        }
      }
    });

    // Re-send data when the view becomes visible again
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._dbPath = resolveDbPath();
        this._sendSnapshots();
      }
    });
  }

  /** Sends the latest snapshots to the webview. */
  private _sendSnapshots(): void {
    if (!this._view) return;

    if (!this._dbPath) {
      this._view.webview.postMessage({
        type: 'noDatabase',
        message: 'No .backspace/db.sqlite found.\nRun `backspace init` in your project.',
      });
      return;
    }

    try {
      const snapshots = fetchSnapshots(this._dbPath);
      this._view.webview.postMessage({ type: 'snapshots', data: snapshots });
    } catch (err: any) {
      this._view.webview.postMessage({
        type: 'error',
        message: `Failed to read database: ${err.message}`,
      });
    }
  }

  /** Generates the webview HTML/CSS/JS. */
  private _getHtml(webview: vscode.Webview): string {
    // CSP nonce for inline scripts
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';" />
  <title>Backspace Timeline</title>
  <style>
    /* ── Reset & base ─────────────────────────────────────────── */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background, #1e1e1e);
      padding: 12px;
      overflow-x: hidden;
    }

    /* ── Header ───────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border, #333);
    }

    .header h2 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header h2::before {
      content: '⏪';
      font-size: 14px;
    }

    .refresh-btn {
      background: none;
      border: 1px solid var(--vscode-button-secondaryBackground, #3a3a3a);
      color: var(--vscode-foreground);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .refresh-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #454545);
    }

    /* ── Slider container ─────────────────────────────────────── */
    .slider-section {
      margin-bottom: 20px;
      padding: 12px;
      background: var(--vscode-editor-background, #1a1a2e);
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border, #333);
    }

    .slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
      margin-bottom: 8px;
    }

    .slider-label .current {
      color: var(--vscode-textLink-foreground, #4fc1ff);
      font-weight: 600;
    }

    /* ── Custom range input ───────────────────────────────────── */
    input[type='range'] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      background: linear-gradient(
        90deg,
        var(--vscode-textLink-foreground, #4fc1ff) 0%,
        var(--vscode-textLink-foreground, #4fc1ff) var(--slider-progress, 0%),
        var(--vscode-input-background, #2a2a3e) var(--slider-progress, 0%),
        var(--vscode-input-background, #2a2a3e) 100%
      );
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--vscode-textLink-foreground, #4fc1ff);
      border: 2px solid var(--vscode-editor-background, #1a1a2e);
      box-shadow: 0 0 8px rgba(79, 193, 255, 0.4);
      cursor: grab;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 14px rgba(79, 193, 255, 0.6);
    }

    input[type='range']::-webkit-slider-thumb:active {
      cursor: grabbing;
      transform: scale(1.1);
    }

    input[type='range']::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--vscode-textLink-foreground, #4fc1ff);
      border: 2px solid var(--vscode-editor-background, #1a1a2e);
      box-shadow: 0 0 8px rgba(79, 193, 255, 0.4);
      cursor: grab;
    }

    /* ── Snapshot detail card ──────────────────────────────────── */
    .snapshot-card {
      padding: 14px;
      background: var(--vscode-editor-background, #1a1a2e);
      border: 1px solid var(--vscode-panel-border, #333);
      border-radius: 8px;
      margin-bottom: 12px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .snapshot-card.active {
      border-color: var(--vscode-textLink-foreground, #4fc1ff);
      box-shadow: 0 0 12px rgba(79, 193, 255, 0.1);
    }

    .snapshot-id {
      font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
      font-size: 12px;
      color: var(--vscode-textLink-foreground, #4fc1ff);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .snapshot-id .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--vscode-textLink-foreground, #4fc1ff);
      display: inline-block;
    }

    .snapshot-time {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
      margin-bottom: 8px;
    }

    .snapshot-prompt {
      font-size: 12px;
      color: var(--vscode-foreground);
      line-height: 1.5;
      margin-bottom: 8px;
      padding: 8px 10px;
      background: var(--vscode-sideBar-background, #1e1e1e);
      border-radius: 4px;
      border-left: 3px solid var(--vscode-textLink-foreground, #4fc1ff);
      word-break: break-word;
    }

    .snapshot-files {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .file-tag {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      padding: 2px 8px;
      background: var(--vscode-badge-background, #333);
      color: var(--vscode-badge-foreground, #ccc);
      border-radius: 10px;
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Diff preview ─────────────────────────────────────────── */
    .diff-section {
      margin-top: 12px;
    }

    .diff-section summary {
      font-size: 11px;
      cursor: pointer;
      color: var(--vscode-descriptionForeground, #888);
      padding: 4px 0;
    }

    .diff-block {
      margin-top: 8px;
      font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
      font-size: 11px;
      line-height: 1.6;
      background: var(--vscode-sideBar-background, #111);
      border-radius: 4px;
      padding: 10px;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre;
    }

    .diff-block .added   { color: #4ec9b0; }
    .diff-block .removed { color: #f14c4c; }
    .diff-block .header  { color: #569cd6; font-weight: 600; }
    .diff-block .meta    { color: #666; }

    /* ── Empty / error states ─────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 40px 16px;
      color: var(--vscode-descriptionForeground, #888);
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 12px;
      line-height: 1.6;
      max-width: 220px;
      margin: 0 auto;
    }

    .empty-state code {
      font-family: var(--vscode-editor-font-family, monospace);
      background: var(--vscode-textCodeBlock-background, #2a2a3e);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 11px;
    }

    /* ── Scrollbar styling ────────────────────────────────────── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background, #444);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground, #555);
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Timeline</h2>
    <button class="refresh-btn" id="refreshBtn">↻ Refresh</button>
  </div>

  <div id="content">
    <div class="empty-state">
      <div class="icon">⏳</div>
      <p>Loading snapshots…</p>
    </div>
  </div>

  <script nonce="${nonce}">
    // Acquire the VS Code API handle
    const vscode = acquireVsCodeApi();

    // State
    let snapshots = [];
    let selectedIndex = 0;

    const contentEl = document.getElementById('content');
    const refreshBtn = document.getElementById('refreshBtn');

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    // ── Render functions ────────────────────────────────────────

    function renderEmpty(message) {
      contentEl.innerHTML = \`
        <div class="empty-state">
          <div class="icon">📭</div>
          <p>\${escapeHtml(message)}</p>
        </div>
      \`;
    }

    function renderTimeline() {
      if (snapshots.length === 0) {
        renderEmpty('No snapshots yet.\\nStart the daemon with backspace watch to begin capturing.');
        return;
      }

      const snap = snapshots[selectedIndex];
      const progress = snapshots.length === 1
        ? 100
        : ((selectedIndex / (snapshots.length - 1)) * 100);

      contentEl.innerHTML = \`
        <div class="slider-section">
          <div class="slider-label">
            <span>Oldest</span>
            <span class="current">\${selectedIndex + 1} / \${snapshots.length}</span>
            <span>Latest</span>
          </div>
          <input
            type="range"
            id="timelineSlider"
            min="0"
            max="\${snapshots.length - 1}"
            value="\${selectedIndex}"
            style="--slider-progress: \${progress}%"
          />
        </div>

        <div class="snapshot-card active" id="snapshotCard">
          <div class="snapshot-id">
            <span class="dot"></span>
            \${escapeHtml(snap.id.substring(0, 8))}
          </div>
          <div class="snapshot-time">\${escapeHtml(snap.date)}</div>
          <div class="snapshot-prompt">\${escapeHtml(truncate(snap.prompt, 200))}</div>
          <div class="snapshot-files">
            \${snap.files.map(f => \`<span class="file-tag" title="\${escapeHtml(f)}">\${escapeHtml(basename(f))}</span>\`).join('')}
          </div>
          <div class="diff-section" id="diffSection"></div>
        </div>
      \`;

      // Wire up the slider
      const slider = document.getElementById('timelineSlider');
      slider.addEventListener('input', (e) => {
        selectedIndex = parseInt(e.target.value, 10);
        const pct = snapshots.length === 1
          ? 100
          : ((selectedIndex / (snapshots.length - 1)) * 100);
        e.target.style.setProperty('--slider-progress', pct + '%');
        renderTimeline();

        // Notify the extension backend
        const selected = snapshots[selectedIndex];
        vscode.postMessage({
          type: 'snapshotSelected',
          snapshotId: selected.id,
          timestamp: selected.timestamp,
        });
      });
    }

    function renderDiff(diffs) {
      const section = document.getElementById('diffSection');
      if (!section) return;

      const entries = Object.entries(diffs);
      if (entries.length === 0) return;

      section.innerHTML = entries.map(([file, patch]) => \`
        <details>
          <summary>📄 \${escapeHtml(basename(file))}</summary>
          <div class="diff-block">\${highlightDiff(patch)}</div>
        </details>
      \`).join('');
    }

    // ── Helpers ──────────────────────────────────────────────────

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function truncate(str, max) {
      return str.length > max ? str.substring(0, max) + '…' : str;
    }

    function basename(filePath) {
      return filePath.split(/[\\\\/]/).pop() || filePath;
    }

    function highlightDiff(patch) {
      return patch
        .split('\\n')
        .map(line => {
          const escaped = escapeHtml(line);
          if (line.startsWith('+++') || line.startsWith('---')) {
            return '<span class="meta">' + escaped + '</span>';
          }
          if (line.startsWith('@@')) {
            return '<span class="header">' + escaped + '</span>';
          }
          if (line.startsWith('+')) {
            return '<span class="added">' + escaped + '</span>';
          }
          if (line.startsWith('-')) {
            return '<span class="removed">' + escaped + '</span>';
          }
          return escaped;
        })
        .join('\\n');
    }

    // ── Message handler ─────────────────────────────────────────

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'snapshots':
          // Data arrives newest-first; reverse so slider goes left→right = old→new
          snapshots = message.data.reverse();
          selectedIndex = snapshots.length - 1; // Start at the latest
          renderTimeline();
          break;

        case 'snapshotDiff':
          renderDiff(message.diffs);
          break;

        case 'noDatabase':
          renderEmpty(message.message);
          break;

        case 'error':
          renderEmpty('⚠️ ' + message.message);
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// ─── Extension lifecycle ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  // 1. Register the sidebar webview view provider
  const provider = new TimelineViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TimelineViewProvider.viewType,
      provider
    )
  );

  // 2. Register the command to focus/open the timeline view
  context.subscriptions.push(
    vscode.commands.registerCommand('backspace.openTimeline', () => {
      // This focuses the sidebar view if it's already registered
      vscode.commands.executeCommand('backspace.timelineView.focus');
    })
  );

  console.log('Backspace Timeline extension activated.');
}

export function deactivate(): void {
  // Nothing to clean up
}
