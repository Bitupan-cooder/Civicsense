// /admin/system (administration only): developer monitoring. Gemini calls, tokens and estimated cost, reliability and
// latency, the complaint and signal pipeline, server errors, and the chat bots' health.
// Data: GET /api/admin/system (auth.fetchSystem), summarised in backend/system.ts. Tokens and server errors need
// migration 003. English only: it is a developer tool. Styled by the .analytics-* and .system-* rules in console-redesign.css.
import { useEffect, useState } from 'react';
import type { SystemReport } from '../../civicAuth';
import * as auth from '../../civicAuth';
import { STATUS_NAMES } from '../../logic';
import { PageState } from './ConsoleNav';
import { Breakdown } from './StatsPage';

const num = (v: number) => v.toLocaleString('en-IN');
const compact = (v: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const ms = (v: number | null) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never');
const words = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
const STEP: Record<string, string> = { understanding: 'Understanding (complaints, tags)', translation: 'Reply translation', embedding: 'Embeddings (duplicates)' };
const PLATFORM = { telegram: 'Telegram', discord: 'Discord', moodle: 'Moodle' } as const;

function botState(b: SystemReport['bots'][number]): { label: string; tone: 'ok' | 'bad' | 'off' } {
  if (!b.configured) return { label: 'No token set', tone: 'off' };
  if (!b.enabled) return { label: b.platform === 'moodle' ? 'MOODLE_SECRET not set' : 'Off here (CHAT_BOTS is not true)', tone: 'off' };
  if (b.connected === null) return { label: 'Waiting for posts', tone: 'ok' };
  return b.connected ? { label: 'Connected', tone: 'ok' } : { label: 'Not connected', tone: 'bad' };
}

function DailyChart({ daily }: { daily: SystemReport['ai']['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.calls));
  const every = daily.length > 10 ? 5 : 1;
  return (
    <div className="analytics-chart" role="img" aria-label="Model calls and failures per day">
      <div className="analytics-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="analytics-chart-columns" style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}>
        {daily.map((d, i) => (
          <div className="analytics-month" key={d.day}>
            <div className="analytics-bars">
              <span className="analytics-bar analytics-bar-filed" style={{ height: `${Math.max(d.calls ? 6 : 2, (d.calls / max) * 100)}%` }} title={`${d.day}: ${d.calls} calls, ${num(d.tokens)} tokens`} />
              <span className="analytics-bar system-bar-failed" style={{ height: `${Math.max(d.failed ? 6 : 2, (d.failed / max) * 100)}%` }} title={`${d.day}: ${d.failed} failed`} />
            </div>
            <span className="analytics-month-label">{(daily.length - 1 - i) % every === 0 ? d.day.slice(8) : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemPage() {
  const [days, setDays] = useState<7 | 30>(7);
  const [report, setReport] = useState<SystemReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setReport(null); setError(null);
    auth.fetchSystem(days).then(setReport, (err) => setError((err as Error).message));
  }, [days]);
  const ai = report?.ai;

  return (
    <main className="analytics-page" aria-label="System monitoring">
      <header className="analytics-heading">
        <div>
          <span className="analytics-eyebrow">Developer</span>
          <h1>System and model usage</h1>
          <p>Gemini calls, tokens and cost, reliability, the complaint pipeline, server errors and the chat bots, over the last {days} days.</p>
        </div>
        <div className="system-range" role="group" aria-label="Period">
          {([7, 30] as const).map((d) => <button key={d} type="button" className="analytics-refresh" aria-pressed={days === d} onClick={() => setDays(d)}>{d} days</button>)}
        </div>
      </header>
      <PageState loading={!report && !error} error={error} />
      {report && ai && (
        <>
          {!report.gemini && <p className="analytics-notice">GEMINI_API_KEY is not set, so the keyword rules do every analysis and no model is called.</p>}
          {!report.tokensInstalled && <p className="analytics-notice">Run backend/migrations/003_observability.sql to record token counts and server errors.</p>}

          <section className="analytics-metrics" aria-label="Model usage">
            <article><span>Model calls</span><strong>{num(ai.calls)}</strong><small>{ai.failed} failed ({pct(ai.calls ? ai.failed / ai.calls : null)})</small></article>
            <article><span>Tokens</span><strong>{compact(ai.inputTokens + ai.outputTokens)}</strong><small>{num(ai.inputTokens)} in, {num(ai.outputTokens)} out</small></article>
            <article><span>Estimated cost</span><strong>{ai.cost == null ? '—' : `$${ai.cost.toFixed(2)}`}</strong><small>{ai.cost == null ? 'Set GEMINI_PRICE_INPUT_PER_M and GEMINI_PRICE_OUTPUT_PER_M' : 'Tokens × the prices set in the env'}</small></article>
            <article><span>Keyword fallback</span><strong>{pct(ai.rulesShare)}</strong><small>{ai.rulesCalls} analyses done without Gemini</small></article>
          </section>

          <section className="analytics-panel analytics-volume-panel">
            <div className="analytics-panel-heading">
              <div><h2>Model calls per day</h2><p>Gemini only; the keyword rules are not counted as calls.</p></div>
              <div className="analytics-legend system-legend"><span><i /> Calls</span><span><i /> Failed</span></div>
            </div>
            <DailyChart daily={ai.daily} />
          </section>

          <section className="analytics-breakdown system-panel">
            <h2>By step</h2>
            {ai.steps.length ? (
              <table className="system-table">
                <thead><tr><th scope="col">Step</th><th scope="col">Calls</th><th scope="col">Failed</th><th scope="col">Tokens in</th><th scope="col">Tokens out</th><th scope="col">Median</th><th scope="col">Slowest 5%</th></tr></thead>
                <tbody>
                  {ai.steps.map((s) => (
                    <tr key={s.step}>
                      <th scope="row">{STEP[s.step] ?? s.step}</th><td>{num(s.calls)}</td><td>{num(s.failed)}</td>
                      <td>{num(s.inputTokens)}</td><td>{num(s.outputTokens)}</td><td>{ms(s.p50)}</td><td>{ms(s.p95)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="analytics-empty">No model calls in this period.</p>}
          </section>

          <div className="analytics-grid">
            <Breakdown title="Calls by model" counts={Object.fromEntries(ai.models.map((m) => [m.model, m.calls]))} emptyText="No model calls in this period." />
            <Breakdown title="Complaints filed, by status now" counts={report.complaints} label={(k) => STATUS_NAMES[k]?.en ?? words(k)} emptyText="No complaints in this period." />
            {report.signals && <Breakdown title="Group signals, by status now" counts={report.signals} label={words} emptyText="No signals in this period." />}
            <section className="analytics-breakdown">
              <h2>Chat bots</h2>
              <p className="analytics-breakdown-description">State of this server process. The listeners run only where CHAT_BOTS=true, so a Vercel function always shows Telegram and Discord as off.</p>
              <ul className="system-log">
                {report.bots.map((b) => {
                  const state = botState(b);
                  return (
                    <li key={b.platform}>
                      <span className="system-bot"><b>{PLATFORM[b.platform]}</b><span className={`system-dot system-dot-${state.tone}`}>{state.label}</span></span>
                      <small>Last tag: {when(b.lastTagAt)}</small>
                      {b.lastError && <small className="system-error">{b.lastError}</small>}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="analytics-grid">
            <section className="analytics-breakdown">
              <h2>Recent model failures</h2>
              {ai.recentFailures.length ? (
                <ul className="system-log">
                  {ai.recentFailures.map((f, i) => (
                    <li key={i}><span><b>{STEP[f.step] ?? f.step}</b> <time dateTime={f.created_at}>{when(f.created_at)}</time></span><small className="system-error">{f.error || 'Unknown error'}</small></li>
                  ))}
                </ul>
              ) : <p className="analytics-empty">No failed calls in this period.</p>}
            </section>
            <section className="analytics-breakdown">
              <h2>Server errors{report.errors ? ` (${report.errors.total >= 1000 ? '1000+' : report.errors.total})` : ''}</h2>
              {!report.errors ? <p className="analytics-empty">Recorded once migration 003 has run.</p>
                : report.errors.recent.length ? (
                  <ul className="system-log">
                    {report.errors.recent.map((e, i) => (
                      <li key={i}><span><b>{e.method} {e.route}</b> <time dateTime={e.created_at}>{when(e.created_at)}</time></span><small className="system-error">{e.status}: {e.message || 'No message'}</small></li>
                    ))}
                  </ul>
                ) : <p className="analytics-empty">No server errors in this period.</p>}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
