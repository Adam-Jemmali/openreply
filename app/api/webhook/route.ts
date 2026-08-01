import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import {
  parseCommentEvents,
  parseMessageEvents,
  parsePostbackEvents,
  parseReadEvents,
  verifyWebhookSignature,
} from "@/lib/meta/webhook";
import { MESSAGE_JOB_NAME, POSTBACK_JOB_NAME } from "@/lib/queue/client";
import { Prisma } from "@/app/generated/prisma/client";

const OPENING_DM_READ_FALLBACK_DELAY_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { success: false, error: "Verification failed" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Record the attempt so a signature mismatch is visible rather than a
    // silent 401. This is the common symptom of FACEBOOK_APP_SECRET being
    // set to the wrong app's secret for the webhook's signing key.
    await prisma.operationalEvent
      .create({
        data: {
          source: "SYSTEM",
          level: "WARNING",
          message: "Webhook signature verification failed",
          payload: {
            hadSignatureHeader: Boolean(signature),
            bodyLength: rawBody.length,
            bodyPreview: rawBody.slice(0, 200),
          },
        },
      })
      .catch(() => {});
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      object:
        typeof payload === "object" && payload && "object" in payload
          ? String(payload.object)
          : null,
      payload: payload as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });

  try {
    // Log webhook structure to debug what's being received
    console.log(
      `[Webhook] Received webhook: object=${
        typeof payload === "object" && payload ? (payload as any).object : "unknown"
      }, entries=${
        typeof payload === "object" && payload && "entry" in payload
          ? (payload as any).entry?.length ?? 0
          : 0
      }`
    );

    if (typeof payload === "object" && payload && "entry" in payload) {
      for (const entry of (payload as any).entry ?? []) {
        if (entry.messaging?.length > 0) {
          console.log(
            `[Webhook] Entry has messaging array with ${entry.messaging.length} items: ${entry.messaging
              .map(
                (m: any) =>
                  Object.keys(m).filter((k) => !["sender", "recipient"].includes(k))
              )
              .join(", ")}`
          );
        }
        if (entry.changes?.length > 0) {
          console.log(
            `[Webhook] Entry has changes array with ${entry.changes.length} items`
          );
        }
      }
    }

    const commentEvents = parseCommentEvents(
      payload as Parameters<typeof parseCommentEvents>[0]
    );
    const queue = getDMQueue();

    for (const event of commentEvents) {
      // Skip comments already processed by this webhook or the reconciler.
      // This prevents duplicate jobs if Meta retries the webhook delivery.
      const alreadyProcessed = await prisma.processedComment.findUnique({
        where: { commentId: event.commentId },
      });
      if (alreadyProcessed) {
        continue;
      }

      const account = await prisma.instagramAccount.findUnique({
        where: { instagramId: event.instagramAccountId },
        select: { workspaceId: true },
      });

      await queue.add(
        "process-comment",
        {
          instagramAccountId: event.instagramAccountId,
          commentId: event.commentId,
          commentText: event.commentText,
          commenterId: event.commenterId,
          commenterName: event.commenterName,
          mediaId: event.mediaId,
          source: "WEBHOOK",
        },
        {
          jobId: `comment_${event.instagramAccountId}_${event.commentId}`,
        }
      );

      // Mark comment as processed to prevent webhook retries from re-queuing.
      // ProcessedComment is a dedup set: prevents reconciler and webhook retries
      // from both processing the same comment twice.
      await prisma.processedComment.upsert({
        where: { commentId: event.commentId },
        create: {
          instagramAccountId: event.instagramAccountId,
          commentId: event.commentId,
          source: "WEBHOOK",
        },
        update: {
          source: "WEBHOOK",
        },
      });

      if (account) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { workspaceId: account.workspaceId },
        });
      }
    }

    // Button taps from opening DMs → deliver the reveal message.
    const postbackEvents = parsePostbackEvents(
      payload as Parameters<typeof parsePostbackEvents>[0]
    );

    if (postbackEvents.length > 0) {
      console.log(
        `[Webhook] Received ${postbackEvents.length} postback event(s):`
      );
    }

    for (const event of postbackEvents) {
      console.log(
        `[Webhook] Queuing postback: accountId=${event.instagramAccountId}, userId=${event.userId}, payload=${event.payload}`
      );
      await queue.add(
        POSTBACK_JOB_NAME,
        {
          instagramAccountId: event.instagramAccountId,
          userId: event.userId,
          payload: event.payload,
          mid: event.mid,
        },
        {
          // BullMQ forbids ":" in custom job ids, and the payload is
          // "reveal:<id>", so build with underscores and strip any colons.
          jobId: `postback_${event.instagramAccountId}_${event.userId}_${(
            event.mid ?? event.payload
          ).replace(/:/g, "_")}`,
        }
      );
      console.log(`[Webhook] Postback queued successfully`);
    }

    // Inbound DMs → keyword-triggered autoreply.
    const messageEvents = parseMessageEvents(
      payload as Parameters<typeof parseMessageEvents>[0]
    );

    for (const event of messageEvents) {
      const account = await prisma.instagramAccount.findUnique({
        where: { instagramId: event.instagramAccountId },
        select: { workspaceId: true },
      });

      await queue.add(
        MESSAGE_JOB_NAME,
        {
          instagramAccountId: event.instagramAccountId,
          messageId: event.messageId,
          messageText: event.messageText,
          senderId: event.senderId,
        },
        {
          // Message ids can contain characters BullMQ rejects in a job id (":"
          // in particular). base64url encodes into exactly the allowed alphabet
          // and stays injective — substituting invalid characters would let two
          // distinct mids collapse onto one job id, silently dropping a reply.
          jobId: `message_${event.instagramAccountId}_${Buffer.from(
            event.messageId
          ).toString("base64url")}`,
        }
      );

      if (account) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { workspaceId: account.workspaceId },
        });
      }
    }

    // If a user reads the opening DM and never taps the button, deliver the
    // same next-step DM after five minutes. The worker no-ops this delayed job
    // if a real button tap has already delivered the reveal.
    const readEvents = parseReadEvents(
      payload as Parameters<typeof parseReadEvents>[0]
    );

    for (const event of readEvents) {
      const openingLogs = await prisma.dmLog.findMany({
        where: {
          commenterId: event.userId,
          status: "SENT",
          automation: {
            isActive: true,
            openingDmEnabled: true,
            instagramAccount: {
              instagramId: event.instagramAccountId,
            },
          },
        },
        select: {
          automation: {
            select: {
              id: true,
            },
          },
        },
      });

      const scheduledAutomationIds = new Set<string>();
      for (const log of openingLogs) {
        const automation = log.automation;
        if (scheduledAutomationIds.has(automation.id)) continue;
        scheduledAutomationIds.add(automation.id);

        await queue.add(
          POSTBACK_JOB_NAME,
          {
            instagramAccountId: event.instagramAccountId,
            userId: event.userId,
            payload: `reveal:${automation.id}`,
            fallback: true,
          },
          {
            delay: OPENING_DM_READ_FALLBACK_DELAY_MS,
            jobId: `read_fallback_${event.instagramAccountId}_${event.userId}_${automation.id}`,
          }
        );
      }
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        processedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
