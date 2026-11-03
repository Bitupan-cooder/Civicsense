// /admin/routing (PRD P1 "Routing editor"): who holds each post (names change every term, no code change) and
// which post receives each category. Styled in src/admin/console-redesign.css (hallmark redesign).
//
// Data: GET /api/admin/routing (auth.fetchRoutingConfig) → { authorities, rules, categories };
// save: PUT /api/admin/routing (auth.saveRoutingConfig) with the edited { authorities, rules }; the server
// validates and returns the saved config. A post's "login email" links it to an official account: that official
// then receives the post's complaints.
import { useEffect, useState } from 'react';
import type { Authority, RoutingConfig, RoutingRule } from '../../civicAuth';
import * as auth from '../../civicAuth';
import { useLanguage } from '../../i18n';
import { categoryLabel } from '../../RouteTracker';
import { showToast } from '../../toast';
import { PageState } from './ConsoleNav';

export function RoutingEditorPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<RoutingConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    auth.fetchRoutingConfig().then(setConfig, (err) => {
      if ((err as { notInstalled?: boolean }).notInstalled) setNotInstalled(true); else setError((err as Error).message);
    });
  }, []);

  const setPost = (id: string, patch: Partial<Authority>) =>
    setConfig((c) => c && { ...c, authorities: c.authorities.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const setRule = (category: string, patch: Partial<RoutingRule>) =>
    setConfig((c) => c && { ...c, rules: c.rules.map((r) => (r.category === category ? { ...r, ...patch } : r)) });

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      setConfig(await auth.saveRoutingConfig({ authorities: config.authorities, rules: config.rules }));
      showToast('Routing saved.', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
    setSaving(false);
  };

  const posts = config?.authorities ?? [];
  const postOptions = posts.map((a) => <option key={a.id} value={a.id}>{a.post_title}</option>);

  return (
    <section className="workflow-page" aria-label={t('routing.title')}>
      <h1>{t('routing.title')}</h1>
      <PageState notInstalled={notInstalled} loading={!config && !error && !notInstalled} error={error} />
      {config && (
        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
          <h2>{t('routing.posts')}</h2>
          <table>
            <thead><tr><th>{t('routing.post')}</th><th>{t('routing.person')}</th><th>{t('routing.email')}</th><th>{t('routing.active')}</th></tr></thead>
            <tbody>
              {posts.map((a) => (
                <tr key={a.id}>
                  <td><input aria-label={t('routing.post')} required value={a.post_title} onChange={(e) => setPost(a.id, { post_title: e.target.value })} /></td>
                  <td><input aria-label={t('routing.person')} value={a.person_name ?? ''} onChange={(e) => setPost(a.id, { person_name: e.target.value || null })} /></td>
                  <td><input aria-label={t('routing.email')} type="email" value={a.email ?? ''} onChange={(e) => setPost(a.id, { email: e.target.value || null })} /></td>
                  <td><input aria-label={t('routing.active')} type="checkbox" checked={a.active} onChange={(e) => setPost(a.id, { active: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>{t('routing.rules')}</h2>
          <table>
            <thead><tr><th>{t('routing.category')}</th><th>{t('routing.primary')}</th><th>{t('routing.copies')}</th><th>{t('routing.escalateTo')}</th><th>{t('routing.hours')}</th><th>{t('routing.active')}</th></tr></thead>
            <tbody>
              {config.rules.map((r) => (
                <tr key={r.category}>
                  <th scope="row">{categoryLabel(r.category)}</th>
                  <td><select aria-label={t('routing.primary')} value={r.primary_authority_id} onChange={(e) => setRule(r.category, { primary_authority_id: e.target.value })}>{postOptions}</select></td>
                  <td>
                    <select aria-label={t('routing.copies')} multiple value={r.copy_authority_ids}
                      onChange={(e) => setRule(r.category, { copy_authority_ids: [...e.target.selectedOptions].map((o) => o.value) })}>
                      {postOptions}
                    </select>
                  </td>
                  <td>
                    <select aria-label={t('routing.escalateTo')} value={r.escalate_to_id ?? ''} onChange={(e) => setRule(r.category, { escalate_to_id: e.target.value || null })}>
                      <option value="">—</option>{postOptions}
                    </select>
                  </td>
                  <td><input aria-label={t('routing.hours')} type="number" min={1} max={2000} required value={r.response_hours} onChange={(e) => setRule(r.category, { response_hours: Number(e.target.value) })} /></td>
                  <td><input aria-label={t('routing.active')} type="checkbox" checked={r.active} onChange={(e) => setRule(r.category, { active: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </form>
      )}
    </section>
  );
}
