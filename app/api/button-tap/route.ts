import { NextRequest, NextResponse } from "next/server";
import { getDMQueue } from "@/lib/queue/client";

export async function GET(request: NextRequest) {
  const payload = request.nextUrl.searchParams.get("payload");
  const userId = request.nextUrl.searchParams.get("userId");
  const accountId = request.nextUrl.searchParams.get("accountId");

  if (!payload || !userId || !accountId) {
    return NextResponse.json(
      { success: false, error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const queue = getDMQueue();

    await queue.add(
      "postback",
      {
        instagramAccountId: accountId,
        userId,
        payload,
        mid: undefined,
      },
      {
        // Same jobId pattern as webhook postback handler
        jobId: `postback_${accountId}_${userId}_${payload.replace(/:/g, "_")}`,
      }
    );

    // Return a simple success response.
    // The actual reveal will be sent asynchronously.
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
