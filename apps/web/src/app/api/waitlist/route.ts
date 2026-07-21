import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Tracks submission timestamps per IP. Allows max 3 requests per IP per hour.
// This is reset on server restart, which is acceptable for a marketing page.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  // Remove entries older than the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  return false;
}

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = body?.email;

    // Validate email format
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[/api/waitlist] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Email not persisted.");
      if (process.env.NODE_ENV === "production") {
        // Never fake success in production — a misconfigured env would
        // silently drop every signup while telling users they're on the list.
        return NextResponse.json(
          { error: "The waitlist is temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      // Dev fallback: return success so the form can be tested without Supabase
      return NextResponse.json({ success: true, message: "You're on the list. (dev mode — not persisted)" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email, source: "landing_page" }]);

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation — email already on the waitlist
        return NextResponse.json(
          { error: "This email is already on the waitlist." },
          { status: 409 }
        );
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "You're on the list." });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
