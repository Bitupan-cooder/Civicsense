// Route tracker and AI analysis panel (PRD "Route tracker"), shared by the student tracker and the admin docket.
// Inline styles so they look the same on both pages, whose stylesheets differ.
import { useState, type CSSProperties } from 'react';
import type { ComplaintRoute, Reply, Routing } from './civicAuth';
import { CATEGORY_LABELS, waitingOn, type Category } from './logic';
import { TrackStatusStepper } from './components/ui/track-status-stepper';

const PRIORITY_LABELS: Record<number, string> = { 1: 'P1 · Urgent (safety risk)', 2: 'P2 · High', 3: 'P3 · Normal', 4: 'P4 · Minor' };
const PRIORITY_COLORS: Record<number, string> = { 1: '#b91c1c', 2: '#b45309', 3: '#4a6142', 4: '#64748b' };

export const categoryLabel = (c: string | null | undefined) => (c ? CATEGORY_LABELS[c as Category] ?? c : 'Not analysed');
export const priorityLabel = (p: number | null | undefined) => (p ? PRIORITY_LABELS[p] ?? 'P' + p : '—');

function when(ts: string | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const LABEL: CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: '6px' };
const BOX: CSSProperties = { background: '#ffffff', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px 14px' };

export function PriorityChip({ priority }: { priority: number | null | undefined }) {
  if (!priority) return null;
  const color = PRIORITY_COLORS[priority] ?? '#4a6142';
  return <span style={{ fontSize: '11px', fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: '999px', padding: '1px 8px', whiteSpace: 'nowrap' }}>{priorityLabel(priority)}</span>;
}

/** Category, priority, sensitive flag, place, bilingual summary and how sure the AI is. */
export function AiPanel({ routing }: { routing: Routing }) {
  if (!routing.analysed_at) return null;
  return (
    <div className="ai-analysis-panel" style={BOX}>
      <div style={{ ...LABEL, display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span>AI analysis</span>
        <span style={{ fontWeight: 600, textTransform: 'none', color: '#64748b' }}>
          {routing.ai_source === 'gemini' ? 'Gemini' : 'Keyword rules'}
          {routing.confidence != null && ' · ' + Math.round(routing.confidence * 100) + '% confident'}
          {routing.human_edited && ' · edited by an official'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
        <span style={{ fontWeight: 700 }}>{categoryLabel(routing.ai_category)}</span>
        <PriorityChip priority={routing.priority} />
        {routing.is_sensitive && <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b' }}>Sensitive · Head / Chairperson only</span>}
        {routing.location_text && <span style={{ color: '#4a6142' }}>· {routing.location_text}</span>}
      </div>
      {routing.summary_en && <div style={{ fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.5 }}>{routing.summary_en}</div>}
      {routing.summary_as && <div lang="as" style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6, marginTop: '2px' }}>{routing.summary_as}</div>}
      {routing.image_findings && <div style={{ fontSize: '12px', color: '#4a6142', marginTop: '6px' }}>Photo: {routing.image_findings}</div>}
    </div>
  );
}

const CHECKPOINTS: [keyof ComplaintRoute, string][] = [['delivered_at', 'Delivered'], ['seen_at', 'Seen'], ['replied_at', 'Replied'], ['resolved_at', 'Resolved']];

/** Each recipient with its four checkpoints, and who the complaint is waiting on. */
export function RouteTracker({ routes, status, stepper = false }: { routes: ComplaintRoute[]; status: string | null; stepper?: boolean }) {
  if (!routes.length) return null;
  const waiting = waitingOn(routes, status || '');
  return (
    <div className="route-tracker-panel" style={BOX}>
      <div style={{ ...LABEL, display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span>Route tracker</span>
        <span style={{ fontWeight: 600, textTransform: 'none', color: waiting ? '#b45309' : 'var(--olive)' }}>
          {waiting ? 'Waiting on: ' + waiting : 'Route complete'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {routes.map((r, i) => (
          <div key={i} style={{ borderTop: i ? '1px dashed var(--line)' : 'none', paddingTop: i ? '8px' : 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {r.post_title}
              {r.person_name && <span style={{ fontWeight: 500, color: '#4a6142' }}>({r.person_name})</span>}
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: r.kind === 'primary' ? 'var(--olive)' : '#64748b', border: '1px solid currentColor', borderRadius: '999px', padding: '0 6px' }}>
                {r.kind === 'primary' ? 'Must resolve' : r.kind === 'copy' ? 'Copied' : 'Escalation'}
              </span>
            </div>
            {stepper ? <TrackStatusStepper steps={CHECKPOINTS.map(([key, label]) => {
              const ts = r[key] as string | null;
              return { label, timestamp: ts };
            })} /> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px', marginTop: '6px' }}>
              {CHECKPOINTS.map(([key, label]) => {
                const ts = r[key] as string | null;
                return (
                  <div key={key} style={{ fontSize: '11px', textAlign: 'center', padding: '4px 2px', borderRadius: '6px', background: ts ? '#d4f5c0' : '#f8fafc', color: ts ? '#1a3010' : '#94a3b8', border: '1px solid ' + (ts ? '#cbe3b8' : '#e2e8f0') }}>
                    <div style={{ fontWeight: 700 }}>{ts ? '✓ ' : ''}{label}</div>
                    <div style={{ fontSize: '10px', minHeight: '12px' }}>{when(ts)}</div>
                  </div>
                );
              })}
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Replies (and, for officials, internal notes) in the reader's language, with the original on request. */
export function Replies({ replies, lang, showInternal }: { replies: Reply[]; lang: 'en' | 'as'; showInternal: boolean }) {
  const [originals, setOriginals] = useState<string[]>([]);
  const list = replies.filter((r) => showInternal || r.visibility === 'public');
  if (!list.length) return null;
  return (
    <div className="official-replies-panel" style={BOX}>
      <div style={LABEL}>{lang === 'as' ? 'উত্তৰসমূহ' : 'Replies'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.map((r) => {
          const translated = lang === 'as' ? r.body_as : r.body_en;
          const showOriginal = originals.includes(r.id) || !translated;
          const internal = r.visibility === 'internal';
          return (
            <div key={r.id} style={{ background: internal ? '#fffbeb' : '#FAF2EB', border: '1px solid ' + (internal ? '#fde68a' : '#e0f0d0'), borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11.5px', color: '#4a6142', marginBottom: '3px', flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--ink)' }}>{r.from}{internal && <span style={{ color: '#92400e', fontWeight: 700 }}> · Internal note</span>}</strong>
                <span>{when(r.created_at)}</span>
              </div>
              <div lang={showOriginal ? (r.body_language === 'as' ? 'as' : 'en') : lang} style={{ fontSize: '12.5px', color: '#1e293b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {showOriginal ? r.body_original : translated}
              </div>
              {translated && translated !== r.body_original && (
                <button type="button" onClick={() => setOriginals((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))}
                  style={{ background: 'none', border: 'none', padding: 0, marginTop: '3px', color: 'var(--olive)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  {showOriginal ? (lang === 'as' ? 'অনুবাদ চাওক' : 'Show translation') : (lang === 'as' ? 'মূল লেখা চাওক' : 'Show original')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
