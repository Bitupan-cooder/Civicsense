// /admin/signals (Agent tag): issues raised by tagging the bot in Telegram / Discord groups or Moodle forums. Administration sees all;
// a post holder sees the open ones routed to their post. Acknowledging answers in the group; converting creates an
// official complaint for the first student who raised it.
// Styled by the shared .workflow-page card rules in src/admin/console-redesign.css.
//
// Data: GET /api/signals (auth.fetchSignals); actions: auth.actOnSignal → POST /api/signals/act.
import { useCallback, useEffect, useState } from 'react';
import type { Signal } from '../../civicAuth';
import * as auth from '../../civicAuth';
import { useLanguage, type TextKey } from '../../i18n';
import { ticketRef } from '../../logic';
import { categoryLabel, PriorityChip } from '../../RouteTracker';
import { showToast } from '../../toast';
import { loadOfficialComplaints, openDocket } from '../console';
import { PageState } from './ConsoleNav';

const PLATFORM = { telegram: 'Telegram', discord: 'Discord', moodle: 'Moodle' } as const;

export function SignalsPage() {
  const { t, lang } = useLanguage();
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try { setSignals((await auth.fetchSignals()).signals); }
    catch (err) { if ((err as { notInstalled?: boolean }).notInstalled) setNotInstalled(true); else setError((err as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (s: Signal, action: 'acknowledge' | 'convert' | 'dismiss') => {
    setBusy(s.id);
    try {
      const r = await auth.actOnSignal(s.id, action, notes[s.id]);
      const where = r.posted ? ' The bot answered in the group.' : '';
      showToast(action === 'convert' ? `Complaint ${ticketRef(r.complaintId!)} created.${where}` : action === 'acknowledge' ? `Acknowledged.${where}` : 'Dismissed.', 'success');
      await Promise.all([load(), action === 'convert' ? loadOfficialComplaints() : null]);
      if (r.complaintId) openDocket(r.complaintId);
    } catch (err) { showToast((err as Error).message, 'error'); }
    setBusy(null);
  };

  return (
    <section className="workflow-page" aria-label={t('signals.title')}>
      <h1>{t('signals.title')}</h1>
      <p>{t('signals.intro')}</p>
      <PageState notInstalled={notInstalled} loading={signals === null && !error} error={error} />
      {signals && !signals.length && <p>{t('signals.empty')}</p>}
      <ul>
        {(signals || []).map((s) => {
          const done = s.status === 'converted' || s.status === 'dismissed';
          return (
            <li key={s.id}>
              {s.complaint_id
                ? <button type="button" onClick={() => openDocket(s.complaint_id!)}><span className="signal-ref">{ticketRef(s.complaint_id)}</span> {(lang === 'as' && s.summary_as) || s.summary_en || s.text}</button>
                : <h2>{(lang === 'as' && s.summary_as) || s.summary_en || s.text}</h2>}
              <p data-field="meta" className="signal-source">
                <span>{PLATFORM[s.platform]}</span>
                {s.chat_title && <span>{s.chat_title}</span>}
                <time dateTime={s.created_at}>{new Date(s.created_at).toLocaleString(lang === 'as' ? 'as-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              </p>
              <blockquote>{s.text}</blockquote>
              <div className="signal-facts">
                <span className={'chip chip-signal-' + s.status} data-field="status">{t(`signals.status.${s.status}` as TextKey)}</span>
                <span className="chip chip-category">{categoryLabel(s.ai_category)}</span>
                <PriorityChip priority={s.priority} />
                {s.location_text && <span>{s.location_text}</span>}
                <strong>{s.supporters} {t(s.supporters === 1 ? 'signals.student' : 'signals.students')}</strong>
                <span>{s.posts.join(', ')}</span>
              </div>
              {s.is_sensitive && <p role="note">{t('signals.sensitive')}</p>}
              {s.handled_note && <p>“{s.handled_note}”</p>}
              {!done && (
                <>
                  <label>
                    {t('signals.note')}
                    <input value={notes[s.id] || ''} maxLength={500} onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))} />
                  </label>
                  {s.status !== 'acknowledged' && (
                    <button type="button" disabled={busy === s.id} onClick={() => act(s, 'acknowledge')}>{t('signals.acknowledge')}</button>
                  )}
                  <button type="button" className="is-primary" disabled={busy === s.id} onClick={() => act(s, 'convert')}>{t('signals.convert')}</button>
                  <button type="button" className="is-quiet" disabled={busy === s.id} onClick={() => act(s, 'dismiss')}>{t('signals.dismiss')}</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
