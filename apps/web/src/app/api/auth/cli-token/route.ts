/**
 * POST /api/auth/cli-token
 *
 * Mock authentication endpoint for the Backspace CLI.
 * Generates a random 32-character API key and returns it as JSON.
 *
 * In production this will validate an OAuth code / session cookie
 * and issue a scoped token tied to the authenticated user.
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function POST() {
  // Generate a cryptographically random 32-char hex key (16 bytes → 32 hex chars)
  const apiKey = crypto.randomBytes(16).toString('hex');

  return NextResponse.json(
    {
      ok: true,
      token: apiKey,
      expiresIn: '30d',
      message: 'Mock token generated successfully. Do not use in production.',
    },
    { status: 200 }
  );
}

/**
 * GET handler — returns usage instructions instead of a token.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Use POST to generate a CLI token.',
      usage: 'curl -X POST https://backspace.dev/api/auth/cli-token',
    },
    { status: 405 }
  );
}
