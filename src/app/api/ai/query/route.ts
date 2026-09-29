import { NextResponse } from "next/server";
import {
  claudeModelFlag,
  coerceModelForProvider,
  cursorModelCliFlag,
  type AiProvider,
} from "@/lib/ai/providers";
import {
  createAndRunJob,
  encodeSseEvent,
  getJob,
  subscribeToJob,
  type QueryJobEvent,
} from "@/lib/ai/query-jobs";

const TIMEOUT_MS = 120_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: job.status,
    partialOutput: job.partialOutput,
    output: job.output,
    error: job.error,
    entryId: job.entryId,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const provider = body.provider as AiProvider;
  const prompt = String(body.prompt ?? "");
  const context = body.context ? String(body.context) : "";
  const entryId = String(body.entryId ?? "").trim();

  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }
  if (!prompt.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  if (provider !== "claude" && provider !== "cursor") {
    return NextResponse.json({ error: "invalid provider" }, { status: 400 });
  }

  const model = coerceModelForProvider(provider, String(body.model ?? ""));
  const modelCliArg = String(body.modelCliArg ?? "").trim();

  const formatHint =
    "Reply in GitHub-Flavored Markdown (headings, lists, **bold**). Use markdown pipe tables for tabular data.";
  const fullPrompt = context
    ? `${formatHint}\n\n${prompt}\n\n--- Workspace context ---\n${context}`
    : `${formatHint}\n\n${prompt}`;

  let cmd: string;
  let args: string[];

  if (provider === "claude") {
    const modelFlag = modelCliArg || claudeModelFlag(model);
    cmd = "claude";
    args = ["-p", fullPrompt, "--model", modelFlag];
  } else {
    cmd = "agent";
    args = [
      "-p",
      fullPrompt,
      "--model",
      modelCliArg || cursorModelCliFlag(model),
    ];
  }

  const jobId = createAndRunJob({
    entryId,
    cmd,
    args,
    timeoutMs: TIMEOUT_MS,
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const push = (event: QueryJobEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      push({ type: "job", jobId });

      const job = getJob(jobId);
      if (job?.partialOutput) {
        push({ type: "chunk", text: job.partialOutput });
      }
      if (job?.status === "completed" && job.output !== undefined) {
        push({ type: "done", output: job.output });
        closed = true;
        controller.close();
        return;
      }
      if (job?.status === "failed" && job.error) {
        push({ type: "error", message: job.error });
        closed = true;
        controller.close();
        return;
      }

      const unsubscribe = subscribeToJob(jobId, (event) => {
        push(event);
        if (event.type === "done" || event.type === "error") {
          closed = true;
          unsubscribe();
          controller.close();
        }
      });

      request.signal.addEventListener(
        "abort",
        () => {
          unsubscribe();
          if (!closed) {
            closed = true;
            controller.close();
          }
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
