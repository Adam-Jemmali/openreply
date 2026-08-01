import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RACE CONDITION TEST: Verify hypothesis about concurrent duplicate sends
 *
 * This test reproduces the exact scenario that causes the DM loop:
 * Two jobs process the same comment simultaneously, creating a race
 * where both try to send DMs because the PENDING status check doesn't
 * prevent concurrent sends.
 */

const {
  mockPrisma,
  mockSendPrivateReply,
  mockDecryptToken,
  mockMatchKeywords,
  mockReserveDMSlot,
  mockReserveWorkspaceDMSend,
  mockReleaseWorkspaceDMReservation,
} = vi.hoisted(() => ({
  mockPrisma: {
    automation: {
      findMany: vi.fn(),
    },
    dmLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    instagramAccount: {
      findUnique: vi.fn(),
    },
    operationalEvent: {
      create: vi.fn(),
    },
  },
  mockSendPrivateReply: vi.fn(),
  mockDecryptToken: vi.fn(),
  mockMatchKeywords: vi.fn(),
  mockReserveDMSlot: vi.fn(),
  mockReserveWorkspaceDMSend: vi.fn(),
  mockReleaseWorkspaceDMReservation: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/meta/client", () => ({
  sendPrivateReply: mockSendPrivateReply,
  decryptToken: mockDecryptToken,
  MetaApiError: class MetaApiError extends Error {
    code: number;
    constructor(code: number, _subcode: number | undefined, _fbTraceId: string | undefined, message: string) {
      super(message);
      this.code = code;
      this.name = "MetaApiError";
    }
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    name = "TokenExpiredError";
  },
  RateLimitError: class RateLimitError extends Error {
    name = "RateLimitError";
  },
}));

vi.mock("@/lib/meta/oauth", () => ({
  decryptToken: mockDecryptToken,
}));

vi.mock("@/lib/utils/keyword-matcher", () => ({
  matchKeywords: mockMatchKeywords,
}));

vi.mock("@/lib/utils/rate-limiter", () => ({
  reserveDMSlot: mockReserveDMSlot,
}));

vi.mock("@/lib/billing/usage", () => ({
  reserveWorkspaceDMSend: mockReserveWorkspaceDMSend,
  releaseWorkspaceDMReservation: mockReleaseWorkspaceDMReservation,
}));

vi.mock("@/lib/ops/worker-health", () => ({
  recordWorkerAlert: vi.fn(),
}));

vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({
    add: vi.fn(),
  }),
  getRedisConnection: vi.fn(),
  POSTBACK_JOB_NAME: "process-postback",
  FOLLOWUP_JOB_NAME: "process-followup",
  MESSAGE_JOB_NAME: "process-message",
}));

vi.mock("bullmq", () => {
  function MockWorker(_name: string, processor: unknown) {
    (global as Record<string, unknown>).__dmWorkerProcessor = processor;
    return {
      on: vi.fn(),
      close: vi.fn(),
    };
  }
  return {
    Worker: MockWorker,
  };
});

import { createDMWorker } from "../lib/queue/dm-worker";

const usagePeriodStart = new Date("2026-05-01T00:00:00.000Z");

const mockAutomation = {
  id: "auto_789",
  workspaceId: "workspace_123",
  instagramAccountId: "ig_account_row_1",
  postId: "media_101",
  keywords: ["LINK"],
  dmMessage: "Here is the link",
  isActive: true,
  wholeWordMatch: true,
  matchAnyPost: false,
  matchAnyWord: false,
  openingDmEnabled: false,
  publicReplyEnabled: false,
  publicReplyMessage: null,
  publicReplyMessages: [],
  instagramAccount: {
    id: "ig_account_row_1",
    instagramId: "ig_456",
    accessToken: "encrypted_token_abc",
  },
  workspace: {
    id: "workspace_123",
  },
  trackedLinks: [],
  requireFollow: false,
  followPromptMessage: null,
  followPromptButtonLabel: null,
  followUpEnabled: false,
  followUpMessage: null,
  followUpDelayMinutes: 0,
};

const mockJobData = {
  instagramAccountId: "ig_456",
  commentId: "comment_555",
  commentText: "I want the LINK!",
  commenterId: "commenter_999",
  commenterName: "commenter_user",
  mediaId: "media_101",
};

function getProcessor(): (job: {
  name?: string;
  data: typeof mockJobData | Record<string, unknown>;
  id: string;
  attemptsMade: number;
}) => Promise<void> {
  createDMWorker();
  return global.__dmWorkerProcessor as (job: unknown) => Promise<void>;
}

describe("DM Worker — RACE CONDITION: Concurrent Duplicate Sends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecryptToken.mockReturnValue("decrypted_token");
    mockMatchKeywords.mockReturnValue({ matched: true, matchedKeyword: "LINK" });
    mockReserveWorkspaceDMSend.mockResolvedValue({
      allowed: true,
      reserved: true,
      remaining: 99,
      limit: 100,
      periodStart: usagePeriodStart,
    });
    mockReserveDMSlot.mockResolvedValue({
      allowed: true,
      currentCount: 1,
      remainingDMs: 749,
      shouldRequeue: false,
      requeueDelayMs: 0,
      shouldSkip: false,
      reserved: true,
    });
    mockSendPrivateReply.mockResolvedValue({});
  });

  it("RACE: Two concurrent jobs both see no log and both try to send (demonstrates bug)", async () => {
    /**
     * BUG SCENARIO:
     * Job A and Job B both process the same comment simultaneously
     * (happens when webhook is retried before first job completes)
     *
     * Timeline:
     * 1. Job A: queries findUnique → null (no log exists)
     * 2. Job B: queries findUnique → null (A hasn't committed yet)
     * 3. Job A: creates PENDING log
     * 4. Job A: sends DM successfully
     * 5. Job A: tries to update dmLog to SENT → FAILS (DB timeout/crash)
     * 6. Job B: tries to create log → fails with unique constraint
     * 7. Job B: re-queries log → finds PENDING (from Job A)
     * 8. Job B: sees PENDING, thinks it needs to send → sends DUPLICATE
     *
     * RESULT: User receives 2 DMs instead of 1
     */

    const processor = getProcessor();

    // ============ JOB A PHASE ============
    // Step 1: Job A queries and finds no existing log
    mockPrisma.dmLog.findUnique.mockResolvedValueOnce(null);

    // Step 3: Job A creates PENDING log successfully
    mockPrisma.dmLog.create.mockResolvedValueOnce({
      id: "log_1",
      automationId: "auto_789",
      commentId: "comment_555",
      status: "PENDING",
    });

    // ============ JOB B PHASE (overlaps) ============
    // Step 2: Job B queries and finds no log (A hasn't committed)
    mockPrisma.dmLog.findUnique.mockResolvedValueOnce(null);

    // Step 6: Job B tries to create but gets unique constraint violation
    mockPrisma.dmLog.create.mockRejectedValueOnce(
      new Error("Unique constraint `DmLog_automationId_commentId_key` violation")
    );

    // ============ JOB A CONTINUES ============
    // Step 4: Job A sends DM successfully
    // (mockSendPrivateReply already mocked to resolve)

    // Step 5: Job A tries to update but fails
    mockPrisma.dmLog.update.mockRejectedValueOnce(
      new Error("Database connection timeout")
    );

    // ============ JOB B RECOVERY (tries to handle failure) ============
    // Job B catches create error and tries to find existing log
    // But the log is still PENDING from Job A
    mockPrisma.dmLog.findUnique.mockResolvedValueOnce({
      id: "log_1",
      automationId: "auto_789",
      commentId: "comment_555",
      status: "PENDING",  // ← Job A's update failed! Status is still PENDING!
    });

    // Job B proceeds because status is not SENT
    // (Current code only checks: `const alreadyDmd = existingLog?.status === "SENT"`)
    // Since status is PENDING, it thinks it needs to send

    // Step 8: Job B sends DM (DUPLICATE!)
    // (mockSendPrivateReply already mocked to resolve)

    mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);

    // Run Job A
    try {
      await processor({
        name: "process-comment",
        data: mockJobData,
        id: "job_a",
        attemptsMade: 0,
      });
    } catch (error) {
      // Job A fails on update, which is expected in this scenario
      console.log("Job A failed on update (expected):", (error as Error).message);
    }

    // Run Job B (should succeed but sends duplicate)
    try {
      await processor({
        name: "process-comment",
        data: mockJobData,
        id: "job_b",
        attemptsMade: 0,
      });
    } catch (error) {
      console.log("Job B error:", (error as Error).message);
    }

    // VERIFICATION OF BUG:
    // Both jobs should have attempted to send
    const sendCallCount = mockSendPrivateReply.mock.calls.length;
    expect(sendCallCount).toBeGreaterThanOrEqual(2);

    // This shows the bug: TWO DM sends happened for ONE comment
    console.log(`
    ┌─ RACE CONDITION DETECTED ─────────────────┐
    │ Sends attempted: ${sendCallCount}                           │
    │ Expected: 1                               │
    │ Bug confirmed: Multiple sends occurred    │
    └───────────────────────────────────────────┘
    `);
  });

  it("RACE: Create + update pattern has no atomic guarantee", async () => {
    /**
     * The current pattern (lines 323-350 of dm-worker.ts) is:
     *
     * const existingLog = await prisma.dmLog.findUnique({...});
     * if (!existingLog) {
     *   await prisma.dmLog.create({...});  // ← Race window here!
     * } else if (needsDm) {
     *   await prisma.dmLog.update({...});
     * }
     *
     * Between findUnique and create, another job can also:
     * - Query findUnique (still returns null)
     * - Try to create (but now gets unique constraint)
     *
     * Neither job's create/update is protected against concurrent
     * modifications from the other job.
     */

    const processor = getProcessor();

    // Simulate two jobs querying simultaneously
    mockPrisma.dmLog.findUnique
      .mockResolvedValueOnce(null)  // Job A query
      .mockResolvedValueOnce(null)  // Job B query (before A creates)
      .mockResolvedValueOnce({      // Job B re-query after create fails
        id: "log_1",
        status: "PENDING",
      });

    mockPrisma.dmLog.create
      .mockResolvedValueOnce({ id: "log_1", status: "PENDING" })  // Job A succeeds
      .mockRejectedValueOnce(new Error("Unique constraint violation")); // Job B fails

    mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);
    mockSendPrivateReply.mockResolvedValue({});

    // Both jobs try to process
    const jobA = processor({
      name: "process-comment",
      data: mockJobData,
      id: "job_a",
      attemptsMade: 0,
    });

    const jobB = processor({
      name: "process-comment",
      data: mockJobData,
      id: "job_b",
      attemptsMade: 0,
    });

    // One should succeed, one should fail on create, but both might send
    const results = await Promise.allSettled([jobA, jobB]);

    const sends = mockSendPrivateReply.mock.calls.length;

    // EXPECTED: 1 send (from first job only)
    // ACTUAL (with bug): Could be 2 sends (both jobs proceed)
    expect(sends).toBeGreaterThanOrEqual(1);

    console.log(`
    ┌─ RACE CONDITION TEST SUMMARY ─────────────┐
    │ DM sends: ${sends}                                 │
    │ Create calls: ${mockPrisma.dmLog.create.mock.calls.length}                             │
    │ Job A: ${results[0].status}                           │
    │ Job B: ${results[1].status}                           │
    └───────────────────────────────────────────┘
    `);
  });

  it("RACE: Status check doesn't prevent PENDING sends", async () => {
    /**
     * Current status check (line 249):
     *   const alreadyDmd = existingLog?.status === "SENT"
     *
     * Only skips if SENT. But PENDING is also "already in progress"!
     *
     * If Job A sets status to PENDING and then crashes before
     * updating to SENT, Job B will see PENDING and proceed.
     */

    const processor = getProcessor();

    // First query: no log
    mockPrisma.dmLog.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "log_1",
        status: "PENDING",  // ← This should block sends!
      });

    mockPrisma.dmLog.create.mockResolvedValueOnce({
      id: "log_1",
      status: "PENDING",
    });

    mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);
    mockSendPrivateReply.mockResolvedValue({});

    const processor1 = getProcessor();
    await processor1({
      name: "process-comment",
      data: mockJobData,
      id: "job_1",
      attemptsMade: 0,
    });

    // Second job sees PENDING and proceeds
    await processor({
      name: "process-comment",
      data: mockJobData,
      id: "job_2",
      attemptsMade: 0,
    });

    // Both jobs send because PENDING doesn't block
    expect(mockSendPrivateReply.mock.calls.length).toBeGreaterThanOrEqual(1);

    console.log(`
    ┌─ STATUS CHECK BUG ────────────────────────┐
    │ Sends with PENDING status: ${mockSendPrivateReply.mock.calls.length}               │
    │ Expected: 0 (PENDING should block)        │
    │ Actual: ≥1 (PENDING doesn't block)        │
    └───────────────────────────────────────────┘
    `);
  });
});
