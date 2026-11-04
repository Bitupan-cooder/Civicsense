import { useEffect, useMemo, useState } from 'react';
import type { Stats } from '../../civicAuth';
import * as auth from '../../civicAuth';
import { useLanguage } from '../../i18n';
import { categoryLabel } from '../../RouteTracker';
import { STATUS_NAMES } from '../../logic';
import { PageState } from './ConsoleNav';
import { useConsole } from '../console';

type MonthPoint = { key: string; label: string; filed: number; resolved: number; reporters: Set<string> };

const ANALYTICS_COPY = {
  en: {
    page: 'Complaint analytics', eyebrow: 'Service analytics', title: 'Complaints overview',
    intro: 'Volume, resolution progress and reporting activity across campus.',
    runCheck: 'Run deadline check', checking: 'Checking…',
    checkTitle: 'Escalate overdue complaints and close resolutions the reporter did not answer within 7 days',
    checkDone: (count: number) => `Deadline check complete · ${count} overdue cases notified`,
    total: 'Total complaints', allReports: 'All reports in the register', resolved: 'Resolved',
    ofAll: (rate: number) => `${rate}% of all complaints`, average: 'Average resolution',
    resolvedOnly: 'For resolved complaints', active: 'Active reporters', uniqueStudents: 'Unique students this month',
    volume: 'Reports and resolutions', sixMonths: 'Monthly activity · last six months', filed: 'Filed',
    status: 'Status', categories: 'Issue categories', locations: 'Campus locations', priority: 'Priority',
    priorityGuide: 'P1 needs urgent attention, P2 is high priority, P3 is normal, and P4 is minor.',
    empty: 'No reports recorded yet.', chartLabel: 'Monthly complaints filed and resolved for the last six months',
    filedTitle: (count: number) => `${count} filed`, resolvedTitle: (count: number) => `${count} resolved`,
  },
  as: {
    page: 'অভিযোগৰ পৰিসংখ্যা', eyebrow: 'সেৱাৰ পৰিসংখ্যা', title: 'অভিযোগৰ সামগ্ৰিক চিত্ৰ',
    intro: 'কেম্পাছত দাখিল হোৱা অভিযোগ, সমাধানৰ অগ্ৰগতি আৰু কাৰ্যকলাপৰ তথ্য।',
    runCheck: 'সময়সীমা পৰীক্ষা কৰক', checking: 'পৰীক্ষা কৰি আছে…',
    checkTitle: 'সময়সীমা উকলি যোৱা অভিযোগসমূহ ওপৰলৈ পঠিয়াওক আৰু ৭ দিনৰ ভিতৰত অভিযোগকাৰীৰ উত্তৰ নোপোৱা সমাধানসমূহ বন্ধ কৰক',
    checkDone: (count: number) => `সময়সীমা পৰীক্ষা সম্পূৰ্ণ · সময়সীমা উকলি যোৱা ${count}টা অভিযোগৰ বিষয়ে জাননী দিয়া হৈছে`,
    total: 'মুঠ অভিযোগ', allReports: 'পঞ্জীত থকা সকলো অভিযোগ', resolved: 'সমাধান হোৱা অভিযোগ',
    ofAll: (rate: number) => `মুঠ অভিযোগৰ ${rate}%`, average: 'সমাধানৰ গড় সময়',
    resolvedOnly: 'সমাধান হোৱা অভিযোগসমূহৰ ক্ষেত্ৰত', active: 'এই মাহৰ সক্ৰিয় অভিযোগকাৰী', uniqueStudents: 'এই মাহত অভিযোগ দাখিল কৰা পৃথক শিক্ষাৰ্থীৰ সংখ্যা',
    volume: 'দাখিল আৰু সমাধান', sixMonths: 'মাহেকীয়া কাৰ্যকলাপ · বিগত ছয় মাহ', filed: 'দাখিল কৰা',
    status: 'স্থিতি', categories: 'সমস্যাৰ শ্ৰেণী', locations: 'কেম্পাছৰ স্থানসমূহ', priority: 'অগ্ৰাধিকাৰ',
    priorityGuide: 'P1 অতি জৰুৰী (সুৰক্ষাৰ বিপদ), P2 উচ্চ অগ্ৰাধিকাৰ, P3 সাধাৰণ আৰু P4 কম অগ্ৰাধিকাৰ।',
    empty: 'এতিয়ালৈ কোনো অভিযোগ দাখিল হোৱা নাই।', chartLabel: 'বিগত ছয় মাহত দাখিল আৰু সমাধান হোৱা অভিযোগৰ মাহেকীয়া সংখ্যা',
    filedTitle: (count: number) => `${count}টা দাখিল`, resolvedTitle: (count: number) => `${count}টা সমাধান`,
  },
} as const;

const ASSAMESE_CATEGORIES: Record<string, string> = {
  electricity: 'বিদ্যুৎ', water: 'পানী', sanitation: 'পৰিষ্কাৰ-পৰিচ্ছন্নতা', hostel: 'ছাত্ৰাবাস',
  library: 'পুথিভঁৰাল', classroom: 'শ্ৰেণীকোঠা', road_transport: 'পথ আৰু পৰিবহণ', safety: 'নিৰাপত্তা',
  internet: 'ইণ্টাৰনেট', sports: 'ক্ৰীড়া', cricket: 'ক্ৰিকেট', music: 'সংগীত', debating: 'বিতৰ্ক / আলোচনা-চক্ৰ',
  fine_arts_literary: 'চাৰুকলা / সাহিত্য', magazine: 'আলোচনী', girls_common_room: 'ছাত্ৰীৰ কমন ৰুম',
  boys_common_room: 'ছাত্ৰৰ কমন ৰুম', social_service: 'সমাজসেৱা', general: 'সাধাৰণ', other: 'অন্যান্য',
};

function buildMonthly(complaints: ReturnType<typeof useConsole>['complaints'], lang: 'en' | 'as'): MonthPoint[] {
  const now = new Date();
  const points = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat(lang === 'as' ? 'as-IN' : 'en-IN', { month: 'short' }).format(date),
      filed: 0,
      resolved: 0,
      reporters: new Set<string>(),
    };
  });
  const byMonth = new Map(points.map((point) => [point.key, point]));
  for (const complaint of complaints) {
    const filedKey = complaint.created_at.slice(0, 7);
    const filedPoint = byMonth.get(filedKey);
    if (filedPoint) {
      filedPoint.filed += 1;
      if (complaint.student_id) filedPoint.reporters.add(complaint.student_id);
    }
    const resolvedEvent = (complaint.history || []).find((event) => event.status === 'resolved' || event.status === 'closed');
    const resolvedKey = resolvedEvent?.created_at.slice(0, 7);
    const resolvedPoint = resolvedKey ? byMonth.get(resolvedKey) : undefined;
    if (resolvedPoint) resolvedPoint.resolved += 1;
  }
  return points;
}

function VolumeChart({ points, copy }: { points: MonthPoint[]; copy: (typeof ANALYTICS_COPY)['en'] | (typeof ANALYTICS_COPY)['as'] }) {
  const max = Math.max(1, ...points.flatMap((point) => [point.filed, point.resolved]));
  return (
    <div className="analytics-chart" role="img" aria-label={copy.chartLabel}>
      <div className="analytics-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="analytics-chart-columns">
        {points.map((point) => (
          <div className="analytics-month" key={point.key}>
            <div className="analytics-bars">
              <span className="analytics-bar analytics-bar-filed" style={{ height: `${Math.max(point.filed ? 8 : 2, point.filed / max * 100)}%` }} title={copy.filedTitle(point.filed)} />
              <span className="analytics-bar analytics-bar-resolved" style={{ height: `${Math.max(point.resolved ? 8 : 2, point.resolved / max * 100)}%` }} title={copy.resolvedTitle(point.resolved)} />
            </div>
            <span className="analytics-month-label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Breakdown({ title, counts, label = (key: string) => key, description, emptyText }: { title: string; counts: Record<string, number>; label?: (key: string) => string; description?: string; emptyText: string }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <section className="analytics-breakdown">
      <h2>{title}</h2>
      {description && <p className="analytics-breakdown-description">{description}</p>}
      {rows.length ? rows.map(([key, value]) => (
        <div className="analytics-breakdown-row" key={key}>
          <span title={label(key)}>{label(key)}</span>
          <div className="analytics-track"><i style={{ width: `${value / max * 100}%` }} /></div>
          <strong>{value}</strong>
        </div>
      )) : <p className="analytics-empty">{emptyText}</p>}
    </section>
  );
}

export function StatsPage() {
  const { lang } = useLanguage();
  const copy = ANALYTICS_COPY[lang];
  const { complaints } = useConsole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState('');
  useEffect(() => { auth.fetchStats().then(setStats, (err) => setError((err as Error).message)); }, []);
  const monthly = useMemo(() => buildMonthly(complaints, lang), [complaints, lang]);
  const activeThisMonth = monthly.at(-1)?.reporters.size ?? 0;
  const resolved = stats?.resolvedCount ?? 0;
  const resolutionRate = stats?.total ? Math.round(resolved / stats.total * 100) : 0;

  return (
    <main className="analytics-page" aria-label={copy.page}>
      <header className="analytics-heading">
        <div><span className="analytics-eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div>
        <button type="button" className="analytics-refresh" disabled={running} title={copy.checkTitle} onClick={async () => {
          setRunning(true); setError(null);
          try { const result = await auth.runMaintenance(); setMaintenanceResult(copy.checkDone(result.escalated)); setStats(await auth.fetchStats()); }
          catch (err) { setError((err as Error).message); }
          finally { setRunning(false); }
        }}>{running ? copy.checking : copy.runCheck}</button>
      </header>
      {maintenanceResult && <p className="analytics-notice" role="status">{maintenanceResult}</p>}
      <PageState loading={!stats && !error} error={error} />
      {stats && (
        <>
          <section className="analytics-metrics" aria-label="Key complaint metrics">
            <article><span>{copy.total}</span><strong>{stats.total}</strong><small>{copy.allReports}</small></article>
            <article><span>{copy.resolved}</span><strong>{resolved}</strong><small>{copy.ofAll(resolutionRate)}</small></article>
            <article><span>{copy.average}</span><strong>{stats.averageResolutionHours == null ? '—' : `${stats.averageResolutionHours.toFixed(1)}h`}</strong><small>{copy.resolvedOnly}</small></article>
            <article><span>{copy.active}</span><strong>{activeThisMonth}</strong><small>{copy.uniqueStudents}</small></article>
          </section>

          <section className="analytics-panel analytics-volume-panel">
            <div className="analytics-panel-heading"><div><h2>{copy.volume}</h2><p>{copy.sixMonths}</p></div><div className="analytics-legend"><span><i /> {copy.filed}</span><span><i /> {copy.resolved}</span></div></div>
            <VolumeChart points={monthly} copy={copy} />
          </section>

          <div className="analytics-grid">
            <Breakdown title={copy.status} counts={stats.byStatusAll} emptyText={copy.empty} label={(key) => STATUS_NAMES[key]?.[lang] ?? key.replace(/_/g, ' ')} />
            <Breakdown title={copy.categories} counts={stats.byCategory} emptyText={copy.empty} label={(key) => lang === 'as' ? ASSAMESE_CATEGORIES[key] ?? categoryLabel(key) : categoryLabel(key)} />
            <Breakdown title={copy.locations} counts={stats.byLocation} emptyText={copy.empty} />
            {stats.prdInstalled && <Breakdown title={copy.priority} counts={stats.byPriority} emptyText={copy.empty} description={copy.priorityGuide} label={(key) => key.toUpperCase().startsWith('P') ? key.toUpperCase() : `P${key}`} />}
          </div>
        </>
      )}
    </main>
  );
}
