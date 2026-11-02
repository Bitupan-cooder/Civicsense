// /admin/duplicates (PRD admin dashboard "possible duplicates"): pairs flagged by the AI; the admin confirms every
// merge. Reporters of a merged complaint then receive every update of the surviving one.
// UNSTYLED ON PURPOSE: styling is done by the frontend.
//
// Data: GET /api/admin/duplicates (CivicAuth.fetchDuplicates);
// actions: CivicAuth.mergeComplaint(id, intoId) → POST /api/admin/merge, CivicAuth.dismissDuplicate(id) → POST /api/admin/dismiss-duplicate.
import { useCallback, useEffect, useState } from 'react';
import { routingApi, type DuplicatePair, type DuplicateSide } from '../../civicAuth';
import { useLanguage } from '../../i18n';
import { ticketRef } from '../../logic';
import { categoryLabel } from '../../RouteTracker';
import { showToast } from '../../toast';
import { loadOfficialComplaints, openDocket } from '../console';
import { PageState } from './ConsoleNav';

function Side({ c }: { c: DuplicateSide | null }) {
  if (!c) return <div>—</div>;
  return (
    <div>
      <button type="button" onClick={() => openDocket(c.id)}>{ticketRef(c.id)} · {c.title}</button>
      <p>{c.summary_en || c.description}</p>
      {c.summary_as && <p lang="as">{c.summary_as}</p>}
      <p data-field="meta">{categoryLabel(c.ai_category)}{c.location_text ? ` · ${c.location_text}` : ''} · {c.status}</p>
    </div>
  );
}

export function DuplicatesPage() {
  const { t } = useLanguage();
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setPairs((await routingApi().fetchDuplicates()).pairs); }
    catch (err) { if ((err as { notInstalled?: boolean }).notInstalled) setNotInstalled(true); else setError((err as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try { await action(); showToast(done, 'success'); await Promise.all([load(), loadOfficialComplaints()]); }
    catch (err) { showToast((err as Error).message, 'error'); }
    setBusy(null);
  };

  return (
    <section className="workflow-page" aria-label={t('dup.title')}>
      <h1>{t('dup.title')}</h1>
      <PageState notInstalled={notInstalled} loading={pairs === null && !error} error={error} />
      {pairs && !pairs.length && <p>{t('dup.empty')}</p>}
      <ul>
        {(pairs || []).map((p) => (
          <li key={p.complaint.id}>
            <Side c={p.complaint} />
            <Side c={p.original} />
            {p.score != null && <p data-field="score">{t('dup.similarity')}: {Math.round(p.score * 100)}%</p>}
            <button type="button" disabled={busy === p.complaint.id || !p.original}
              onClick={() => act(p.complaint.id, () => routingApi().mergeComplaint(p.complaint.id, p.original?.id), 'Merged.')}>
              {t('dup.merge')}
            </button>
            <button type="button" disabled={busy === p.complaint.id}
              onClick={() => act(p.complaint.id, () => routingApi().dismissDuplicate(p.complaint.id), 'Dismissed.')}>
              {t('dup.dismiss')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
