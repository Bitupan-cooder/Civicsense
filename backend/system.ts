// Monitoring summaries for GET /api/admin/system (console page /admin/system). Pure: rows in, numbers out.
// Tested through the route in backend/api.test.ts.

export interface AiLogRow {
  step: string;
  model: string | null;
  latency_ms: number | null;
  ok: boolean;
  error: string | null;
  created_at: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
}

/** The keyword analyzer is logged as a model too; it is the fallback, not a model call. */
export const RULES_MODEL = "keyword-rules";

export function tally<T>(rows: T[] | null | undefined, key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows || []) out[key(row)] = (out[key(row)] || 0) + 1;
  return out;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Model usage and reliability over the last `days` days. Cost only when both prices (USD per million tokens) are set. */
export function summariseAi(rows: AiLogRow[], days: number, price: { input: number; output: number }, now = Date.now()) {
  const steps = new Map<string, { calls: number; failed: number; inputTokens: number; outputTokens: number; latencies: number[] }>();
  const models = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
  const daily = new Map<string, { day: string; calls: number; failed: number; tokens: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now - i * 86400e3).toISOString().slice(0, 10);
    daily.set(day, { day, calls: 0, failed: 0, tokens: 0 });
  }
  let rulesCalls = 0;
  for (const r of rows) {
    if (r.model === RULES_MODEL) { rulesCalls++; continue; }
    const input = r.input_tokens ?? 0, output = r.output_tokens ?? 0;
    const s = steps.get(r.step) ?? { calls: 0, failed: 0, inputTokens: 0, outputTokens: 0, latencies: [] };
    s.calls++; if (!r.ok) s.failed++; s.inputTokens += input; s.outputTokens += output;
    if (r.latency_ms != null) s.latencies.push(r.latency_ms);
    steps.set(r.step, s);
    const m = models.get(r.model || "unknown") ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    m.calls++; m.inputTokens += input; m.outputTokens += output;
    models.set(r.model || "unknown", m);
    const d = daily.get(r.created_at.slice(0, 10));
    if (d) { d.calls++; if (!r.ok) d.failed++; d.tokens += input + output; }
  }
  const stepList = [...steps].map(([step, s]) => ({
    step, calls: s.calls, failed: s.failed, inputTokens: s.inputTokens, outputTokens: s.outputTokens,
    p50: percentile(s.latencies, 0.5), p95: percentile(s.latencies, 0.95),
  }));
  const sum = (k: 'calls' | 'failed' | 'inputTokens' | 'outputTokens') => stepList.reduce((n, s) => n + s[k], 0);
  const [calls, failed, inputTokens, outputTokens] = [sum('calls'), sum('failed'), sum('inputTokens'), sum('outputTokens')];
  const understanding = (steps.get("understanding")?.calls ?? 0) - (steps.get("understanding")?.failed ?? 0) + rulesCalls;
  return {
    calls, failed, inputTokens, outputTokens,
    cost: price.input && price.output ? (inputTokens * price.input + outputTokens * price.output) / 1e6 : null,
    /** complaints and tags the keyword rules analysed, because Gemini had no key or failed */
    rulesCalls,
    rulesShare: understanding ? rulesCalls / understanding : null,
    steps: stepList,
    models: [...models].map(([model, m]) => ({ model, ...m })),
    daily: [...daily.values()],
    recentFailures: rows.filter((r) => !r.ok).slice(0, 10).map(({ step, model, error, created_at }) => ({ step, model, error, created_at })),
  };
}

export type AiSummary = ReturnType<typeof summariseAi>;
