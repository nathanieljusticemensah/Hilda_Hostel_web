import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// This is a simple in-memory limiter: fine for a single-instance deployment
// (e.g. one Vercel serverless function that stays warm, or a single Node
// server). It will NOT correctly share state across multiple concurrent
// serverless instances or after a cold start resets memory.
//
// If Hilda Hostel ever scales beyond a single warm instance, replace this
// with a shared store (e.g. Upstash Redis + @upstash/ratelimit) so all
// instances see the same counters. Flagging this now so it doesn't get
// forgotten.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // max auth requests per user per window

const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(userId) ?? [];

  // Drop timestamps outside the current window.
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(userId, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(userId, recent);
  return false;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    // 1. Require an authenticated Supabase session. Anyone without a valid
    //    session should never receive a signed ImageKit token.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limit per authenticated user, not per IP, since students may
    //    share NAT'd hostel wifi.
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // 3. Validate environment configuration.
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      console.error("ImageKit environment variables are missing.");
      return NextResponse.json(
        { error: "Image upload is not configured. Please contact an administrator." },
        { status: 500 }
      );
    }

    // 4. Generate signed auth parameters via the official SDK.
    const imagekit = new ImageKit({ publicKey, privateKey, urlEndpoint });
    const authParams = imagekit.getAuthenticationParameters();

    return NextResponse.json(authParams);
  } catch (err) {
    console.error("ImageKit auth error:", err);
    return NextResponse.json(
      { error: "Failed to generate upload authentication. Please try again." },
      { status: 500 }
    );
  }
}