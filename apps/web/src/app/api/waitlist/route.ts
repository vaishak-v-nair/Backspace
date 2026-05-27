import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // Fallback: generate beta key without Supabase
      const betaKey = "bs_" + crypto.randomBytes(16).toString("hex");
      return NextResponse.json({ success: true, betaKey });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const betaKey = "bs_" + crypto.randomBytes(16).toString("hex");

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email, beta_key: betaKey, source: "landing_page" }]);

    if (error) {
      if (error.code === "23505") {
        // Already on waitlist — still return success
        return NextResponse.json({ success: true, betaKey, existing: true });
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true, betaKey, existing: false });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
