import { spawn, type ChildProcess } from "child_process";
import { v4 as uuidv4 } from "uuid";

export type QueryJobStatus = "running" | "completed" | "failed";

export type QueryJobState = {
  jobId: string;
  entryId: string;
  status: QueryJobStatus;
  partialOutput: string;
  output?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
};

export type QueryJobSpawnOptions = {
  entryId: string;
  cmd: string;
  args: string[];
  timeoutMs: number;
};

type JobListener = (event: QueryJobEvent) => void;

export type QueryJobEvent =
  | { type: "job"; jobId: string }
  | { type: "chunk"; text: string }
  | { type: "done"; output: string }
  | { type: "error"; message: string };

const jobs = new Map<string, QueryJobState>();
const listeners = new Map<string, Set<JobListener>>();
const activeChildren = new Map<string, ChildProcess>();

const JOB_TTL_MS = 30 * 60 * 1000;

function notify(jobId: string, event: QueryJobEvent) {
  const set = listeners.get(jobId);
  if (!set) return;
  for (const fn of set) fn(event);
}

export function subscribeToJob(
  jobId: string,
  listener: JobListener,
): () => void {
  let set = listeners.get(jobId);
  if (!set) {
    set = new Set();
    listeners.set(jobId, set);
  }
  set.add(listener);

  const job = jobs.get(jobId);
  if (job?.status === "completed" && job.output !== undefined) {
    queueMicrotask(() => listener({ type: "done", output: job.output! }));
  } else if (job?.status === "failed" && job.error) {
    queueMicrotask(() => listener({ type: "error", message: job.error! }));
  }

  return () => {
    set?.delete(listener);
    if (set?.size === 0) listeners.delete(jobId);
  };
}

export function getJob(jobId: string): QueryJobState | undefined {
  return jobs.get(jobId);
}

export function createAndRunJob(options: QueryJobSpawnOptions): string {
  const jobId = uuidv4();
  const startedAt = new Date().toISOString();
  const state: QueryJobState = {
    jobId,
    entryId: options.entryId,
    status: "running",
    partialOutput: "",
    startedAt,
  };
  jobs.set(jobId, state);

  void runJobProcess(jobId, options);

  scheduleJobCleanup(jobId);
  return jobId;
}

function scheduleJobCleanup(jobId: string) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (!job || job.status === "running") return;
    jobs.delete(jobId);
    listeners.delete(jobId);
  }, JOB_TTL_MS);
}

async function runJobProcess(
  jobId: string,
  options: QueryJobSpawnOptions,
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  const child = spawn(options.cmd, options.args, { shell: false });
  activeChildren.set(jobId, child);

  let stderr = "";
  const timer = setTimeout(() => {
    if (!activeChildren.has(jobId)) return;
    child.kill("SIGTERM");
    finishJobFailed(jobId, "CLI timed out after 120s");
  }, options.timeoutMs);

  child.stdout.on("data", (d: Buffer) => {
    const text = d.toString();
    const current = jobs.get(jobId);
    if (!current || current.status !== "running") return;
    current.partialOutput += text;
    notify(jobId, { type: "chunk", text });
  });

  child.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
  });

  child.on("error", (err) => {
    clearTimeout(timer);
    activeChildren.delete(jobId);
    finishJobFailed(jobId, err.message || "CLI spawn failed");
  });

  child.on("close", (code) => {
    clearTimeout(timer);
    activeChildren.delete(jobId);
    const current = jobs.get(jobId);
    if (!current || current.status !== "running") return;

    if (code !== 0) {
      finishJobFailed(
        jobId,
        stderr.trim() ||
          current.partialOutput.trim() ||
          `CLI exited ${code ?? "unknown"}`,
      );
      return;
    }

    const output = current.partialOutput.trim();
    current.status = "completed";
    current.output = output;
    current.finishedAt = new Date().toISOString();
    notify(jobId, { type: "done", output });
  });
}

function finishJobFailed(jobId: string, message: string) {
  const current = jobs.get(jobId);
  if (!current || current.status !== "running") return;
  current.status = "failed";
  current.error = message;
  current.finishedAt = new Date().toISOString();
  notify(jobId, { type: "error", message });
}

export function encodeSseEvent(data: QueryJobEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}
