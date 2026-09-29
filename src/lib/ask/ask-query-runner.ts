"use client";

import { v4 as uuidv4 } from "uuid";
import type { AiProvider } from "@/lib/ai/providers";
import { resolveCliModelArg } from "@/lib/ai/providers";
import type { Settings } from "@/lib/types/schemas";
import type { QueryTemplateId } from "@/lib/query/mechanical";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useAskRunnerStore } from "@/lib/ask/ask-runner-store";

const STREAM_TIMEOUT_MS = 125_000;
const PARTIAL_PERSIST_MS = 2_000;

type StartAiQueryParams = {
  prompt: string;
  context: string;
  provider: AiProvider;
  model: string;
  settings: Settings;
  templateId?: QueryTemplateId;
  mechanicalFallback?: string;
};

type SsePayload =
  | { type: "job"; jobId: string }
  | { type: "chunk"; text: string }
  | { type: "done"; output: string }
  | { type: "error"; message: string };

const inFlightByEntry = new Set<string>();

function parseSseLines(buffer: string): { events: SsePayload[]; rest: string } {
  const events: SsePayload[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part
      .split("\n")
      .find((l) => l.startsWith("data: "));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as SsePayload);
    } catch {
      /* ignore malformed */
    }
  }
  return { events, rest };
}

async function fetchJobStatus(jobId: string) {
  const res = await fetch(`/api/ai/query?jobId=${encodeURIComponent(jobId)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Job status failed",
    );
  }
  return res.json() as Promise<{
    status: "running" | "completed" | "failed";
    partialOutput: string;
    output?: string;
    error?: string;
  }>;
}

async function reconcileEntry(entryId: string, jobId?: string) {
  const store = useWorkspaceStore.getState();
  const entry = store.snapshot?.askHistory?.find((e) => e.id === entryId);
  if (!entry || entry.status !== "running") return;

  if (!jobId) {
    const started = entry.startedAt ?? entry.respondedAt;
    const age = Date.now() - new Date(started).getTime();
    if (age > STREAM_TIMEOUT_MS) {
      await store.failAskHistoryEntry(
        entryId,
        "Query timed out or was interrupted.",
      );
    }
    return;
  }

  const job = await fetchJobStatus(jobId).catch(() => null);
  if (!job) {
    await store.failAskHistoryEntry(
      entryId,
      "Job expired or server restarted.",
    );
    return;
  }
  if (job.status === "running") {
    if (job.partialOutput && job.partialOutput !== entry.answer) {
      await store.updateAskHistoryEntry(entryId, {
        answer: job.partialOutput,
      });
    }
    return;
  }
  if (job.status === "completed") {
    await store.finalizeAskHistoryEntry(
      entryId,
      job.output ?? job.partialOutput,
    );
    return;
  }
  await store.failAskHistoryEntry(entryId, job.error ?? "AI query failed");
}

async function consumeSseStream(
  entryId: string,
  res: Response,
  mechanicalFallback?: string,
) {
  const store = useWorkspaceStore.getState();
  const reader = res.body?.getReader();
  if (!reader) {
    await store.failAskHistoryEntry(
      entryId,
      "No response stream from server.",
      mechanicalFallback,
    );
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let jobId: string | undefined;
  let accumulated = "";
  let terminal = false;
  let lastPersist = 0;
  const startedAt = Date.now();

  const persistPartial = async (answer: string) => {
    const now = Date.now();
    if (now - lastPersist < PARTIAL_PERSIST_MS) return;
    lastPersist = now;
    await store.updateAskHistoryEntry(
      entryId,
      { answer, jobId },
      { persistToServer: true },
    );
  };

  const failUnlessJobCompleted = async (message: string) => {
    if (jobId) {
      const job = await fetchJobStatus(jobId).catch(() => null);
      if (job?.status === "completed") {
        await store.finalizeAskHistoryEntry(
          entryId,
          job.output ?? job.partialOutput,
        );
        return;
      }
      if (job?.status === "failed") {
        await store.failAskHistoryEntry(
          entryId,
          job.error ?? message,
          mechanicalFallback,
        );
        return;
      }
    }
    await store.failAskHistoryEntry(entryId, message, mechanicalFallback);
  };

  try {
    while (true) {
      if (Date.now() - startedAt > STREAM_TIMEOUT_MS) {
        await failUnlessJobCompleted("Query timed out after 125s.");
        terminal = true;
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseLines(buffer);
      buffer = rest;

      for (const event of events) {
        if (event.type === "job") {
          jobId = event.jobId;
          await store.updateAskHistoryEntry(entryId, { jobId });
        } else if (event.type === "chunk") {
          accumulated += event.text;
          await store.updateAskHistoryEntry(entryId, {
            answer: accumulated,
            jobId,
          });
          void persistPartial(accumulated);
        } else if (event.type === "done") {
          await store.finalizeAskHistoryEntry(entryId, event.output);
          terminal = true;
        } else if (event.type === "error") {
          await store.failAskHistoryEntry(
            entryId,
            event.message,
            mechanicalFallback,
          );
          terminal = true;
        }
      }
    }

    if (!terminal) {
      await failUnlessJobCompleted("Stream ended unexpectedly.");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stream failed";
    await failUnlessJobCompleted(msg);
  }
}

export async function startAiQuery(params: StartAiQueryParams): Promise<string> {
  if (useAskRunnerStore.getState().isBusy()) {
    throw new Error("An Ask desk query is already running.");
  }

  const entryId = uuidv4();
  if (inFlightByEntry.has(entryId)) {
    throw new Error("Query already in flight.");
  }

  const store = useWorkspaceStore.getState();
  await store.createAskHistoryPending({
    id: entryId,
    prompt: params.prompt,
    source: "ai",
    provider: params.provider,
    model: params.model,
    templateId: params.templateId,
  });

  inFlightByEntry.add(entryId);
  useAskRunnerStore.getState().addActive(entryId);

  void (async () => {
    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          provider: params.provider,
          model: params.model,
          modelCliArg: resolveCliModelArg(
            params.provider,
            params.model,
            params.settings,
          ),
          prompt: params.prompt,
          context: params.context,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await store.failAskHistoryEntry(
          entryId,
          typeof data.error === "string" ? data.error : "AI query failed",
          params.mechanicalFallback,
        );
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        await consumeSseStream(entryId, res, params.mechanicalFallback);
      } else {
        const data = await res.json();
        if (data.output) {
          await store.finalizeAskHistoryEntry(entryId, data.output);
        } else {
          await store.failAskHistoryEntry(
            entryId,
            data.error ?? "AI query failed",
            params.mechanicalFallback,
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI query failed";
      await store.failAskHistoryEntry(
        entryId,
        msg,
        params.mechanicalFallback,
      );
    } finally {
      inFlightByEntry.delete(entryId);
      useAskRunnerStore.getState().removeActive(entryId);
    }
  })();

  return entryId;
}

const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

function stopPolling(entryId: string) {
  const t = pollTimers.get(entryId);
  if (t) {
    clearInterval(t);
    pollTimers.delete(entryId);
  }
}

function startPollingReconnected(entryId: string, jobId: string) {
  if (pollTimers.has(entryId) || inFlightByEntry.has(entryId)) return;

  const tick = async () => {
    const store = useWorkspaceStore.getState();
    const entry = store.snapshot?.askHistory?.find((e) => e.id === entryId);
    if (!entry || entry.status !== "running") {
      stopPolling(entryId);
      return;
    }
    await reconcileEntry(entryId, jobId);
    const after = useWorkspaceStore.getState().snapshot?.askHistory?.find(
      (e) => e.id === entryId,
    );
    if (after?.status !== "running") {
      stopPolling(entryId);
    }
  };

  void tick();
  pollTimers.set(entryId, setInterval(() => void tick(), 1500));
}

export async function reconcileRunningEntries() {
  const store = useWorkspaceStore.getState();
  const running =
    store.snapshot?.askHistory?.filter((e) => e.status === "running") ?? [];
  for (const entry of running) {
    if (inFlightByEntry.has(entry.id)) continue;
    await reconcileEntry(entry.id, entry.jobId);
    if (entry.jobId) {
      const after = useWorkspaceStore.getState().snapshot?.askHistory?.find(
        (e) => e.id === entry.id,
      );
      if (after?.status === "running") {
        startPollingReconnected(entry.id, entry.jobId);
      }
    }
  }
}

export function hasRunningAskEntries(): boolean {
  const store = useWorkspaceStore.getState();
  const running =
    store.snapshot?.askHistory?.some((e) => e.status === "running") ?? false;
  return running || useAskRunnerStore.getState().isBusy();
}
