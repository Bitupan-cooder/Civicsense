// /admin/stats (PRD admin dashboard "statistics"): counts by status, category, place and priority, and the average
// resolution time. Styled in src/admin/console-redesign.css (the PRD suggests Recharts for charts;
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
          {rows.map(([k, n]) => <tr key={k}><th scope="row">{label(k)}</th><td className="stats-bar"><progress aria-label={label(k)} value={n} max={Math.max(1, ...rows.map(([, value]) => value))} /></td><td>{n}</td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

export function StatsPage() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState('');
  useEffect(() => { routingApi().fetchStats().then(setStats, (err) => setError((err as Error).message)); }, []);

  return (
    <section className="workflow-page" aria-label={t('stats.title')}>
      <h1>{t('stats.title')}</h1>
      <button type="button" className="stats-maintenance" title="Escalate overdue complaints and close resolutions the reporter did not answer within 7 days" disabled={running} onClick={async () => {
        setRunning(true); setError(null);
        try { const result = await routingApi().runMaintenance(); setMaintenanceResult(`Deadline checks complete. ${result.escalated} overdue cases notified.`); setStats(await routingApi().fetchStats()); }
        catch (err) { setError((err as Error).message); }
        finally { setRunning(false); }
      }}>{running ? 'Checking deadlines…' : 'Run deadline check'}</button>
      {maintenanceResult && <p role="status">{maintenanceResult}</p>}
      <PageState loading={!stats && !error} error={error} />
      {stats && (
        <>
          <dl className="stats-summary">
            <div><dt>{t('stats.total')}</dt><dd>{stats.total}</dd></div>
            <div><dt>{t('stats.avgResolution')}</dt><dd>{stats.averageResolutionHours ?? '—'}</dd></div>
            <div><dt>{t('nav.review')}</dt><dd>{stats.needsReview}</dd></div>
            <div><dt>{t('nav.duplicates')}</dt><dd>{stats.possibleDuplicates}</dd></div>
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
