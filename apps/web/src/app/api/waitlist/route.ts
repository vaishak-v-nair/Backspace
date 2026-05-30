import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;

    // Validate email format
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // Dev fallback: log warning and return success so the form doesn't break
      console.warn("[/api/waitlist] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Email not persisted.");
      return NextResponse.json({ success: true, message: "You're on the list." });
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
