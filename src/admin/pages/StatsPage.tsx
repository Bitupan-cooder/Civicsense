// /admin/stats (PRD admin dashboard "statistics"): counts by status, category, place and priority, and the average
// resolution time. UNSTYLED ON PURPOSE: styling is done by the frontend (the PRD suggests Recharts for charts;
// each `counts` object below is ready to map to chart data: Object.entries(counts) → [{ name, value }]).
//
// Data: GET /api/admin/stats (CivicAuth.fetchStats). Category, place and priority need migration 001
// (stats.prdInstalled); before that they fall back to the reporter-chosen category.
import { useEffect, useState } from 'react';
import { routingApi, type Stats } from '../../civicAuth';
import { useLanguage, type TextKey } from '../../i18n';
import { categoryLabel } from '../../RouteTracker';
import { STATUS_NAMES } from '../../logic';
import { PageState } from './ConsoleNav';

function Counts({ title, counts, label = (k) => k }: { title: TextKey; counts: Record<string, number>; label?: (key: string) => string }) {
  const { t } = useLanguage();
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <section aria-label={t(title)}>
      <h2>{t(title)}</h2>
      <table>
        <tbody>
          {rows.map(([k, n]) => <tr key={k}><th scope="row">{label(k)}</th><td>{n}</td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

export function StatsPage() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { routingApi().fetchStats().then(setStats, (err) => setError((err as Error).message)); }, []);

  return (
    <section aria-label={t('stats.title')}>
      <h1>{t('stats.title')}</h1>
      <PageState loading={!stats && !error} error={error} />
      {stats && (
        <>
          <dl>
            <dt>{t('stats.total')}</dt><dd>{stats.total}</dd>
            <dt>{t('stats.avgResolution')}</dt><dd>{stats.averageResolutionHours ?? '—'}</dd>
            <dt>{t('nav.review')}</dt><dd>{stats.needsReview}</dd>
            <dt>{t('nav.duplicates')}</dt><dd>{stats.possibleDuplicates}</dd>
          </dl>
          <Counts title="stats.byStatus" counts={stats.byStatusAll} label={(k) => STATUS_NAMES[k]?.[lang] ?? k} />
          <Counts title="stats.byCategory" counts={stats.byCategory} label={categoryLabel} />
          <Counts title="stats.byLocation" counts={stats.byLocation} />
          {stats.prdInstalled && <Counts title="stats.byPriority" counts={stats.byPriority} />}
        </>
      )}
    </section>
  );
}
