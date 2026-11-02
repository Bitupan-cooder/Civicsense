// /admin/review (PRD admin dashboard "review queue"): low-confidence results, non-complaints and failed AI calls,
// routed by hand. UNSTYLED ON PURPOSE: styling is done by the frontend.
//
// Data: console.ts store (complaints with status 'needs_review', routing[id] for the AI suggestion);
// actions: routeByHand(id, category) → POST /api/admin/route-complaint; openDocket(id) for the full detail.
import { useState } from 'react';
import { useLanguage } from '../../i18n';
import { CATEGORIES, CATEGORY_LABELS, ticketRef } from '../../logic';
import { categoryLabel, priorityLabel } from '../../RouteTracker';
import { useFeatures } from '../../NotificationBell';
import { openDocket, routeByHand, useConsole, type OfficialComplaint } from '../console';
import { PageState } from './ConsoleNav';

function ReviewItem({ c }: { c: OfficialComplaint }) {
  const { t } = useLanguage();
  const ai = useConsole().routing[c.id];
  const [category, setCategory] = useState(ai?.ai_category || 'other');
  const [busy, setBusy] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => openDocket(c.id)}>{ticketRef(c.id)} · {c.title}</button>
      <p>{c.description}</p>
      {ai?.analysed_at && (
        <p data-field="ai">
          {categoryLabel(ai.ai_category)} · {priorityLabel(ai.priority)}
          {ai.confidence != null && ` · ${Math.round(ai.confidence * 100)}%`}
          {ai.summary_en && ` · ${ai.summary_en}`}
        </p>
      )}
      <label>{t('review.routeAs')}{' '}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); await routeByHand(c.id, category); setBusy(false); }}>
        {busy ? t('common.loading') : t('review.route')}
      </button>
    </li>
  );
}

export function ReviewQueuePage() {
  const { t } = useLanguage();
  const { routing } = useFeatures();
  const s = useConsole();
  const queue = s.complaints.filter((c) => c.status === 'needs_review');
  return (
    <section aria-label={t('review.title')}>
      <h1>{t('review.title')}</h1>
      <PageState notInstalled={!routing} loading={s.loading} error={s.loadError} />
      {routing && s.loaded && !queue.length && <p>{t('review.empty')}</p>}
      <ul>{queue.map((c) => <ReviewItem key={c.id} c={c} />)}</ul>
    </section>
  );
}
