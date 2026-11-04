// In-app notifications (PRD), shared by the student site and the official console. New ones arrive live
// through Supabase Realtime. Hidden until migration 001 has been run.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AppNotification } from './civicAuth';
import * as auth from './civicAuth';

// ── which PRD features the server has switched on (fetched once per page) ──
let features: { routing: boolean; gemini: boolean; signals?: boolean } = { routing: false, gemini: false };
let featuresLoaded = false;
const featureListeners = new Set<() => void>();
export function useFeatures() {
  return useSyncExternalStore(
    (notify) => {
      featureListeners.add(notify);
      if (!featuresLoaded) {
        featuresLoaded = true;
        auth.fetchFeatures().then((f) => { features = f; featureListeners.forEach((n) => n()); });
      }
      return () => { featureListeners.delete(notify); };
    },
    () => features,
  );
}

function ago(ts: string): string {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return min + 'm';
  const hr = Math.floor(min / 60);
  return hr < 24 ? hr + 'h' : Math.floor(hr / 24) + 'd';
}

interface Props {
  userId: string | null | undefined;
  lang: 'en' | 'as';
  /** open the complaint a notification is about */
  onOpen: (complaintId: string) => void;
  /** a new notification arrived live: refresh whatever shows that complaint */
  onLive?: (n: AppNotification) => void;
}

export function NotificationBell({ userId, lang, onOpen, onLive }: Props) {
  const { routing } = useFeatures();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const live = useRef(onLive);
  live.current = onLive;

  useEffect(() => {
    if (!routing || !userId) { setItems([]); return; }
    let active = true;
    auth.fetchNotifications().then((n) => { if (active) setItems(n); });
    const unsubscribe = auth.subscribeNotifications(userId, (n) => {
      setItems((list) => [n, ...list.filter((x) => x.id !== n.id)]);
      live.current?.(n);
    });
    return () => { active = false; unsubscribe(); };
  }, [routing, userId]);

  if (!routing || !userId) return null;
  const unread = items.filter((n) => !n.read);
  const text = (n: AppNotification) => (lang === 'as' && n.message_as ? n.message_as : n.message_en);
  const markRead = (ids: string[]) => {
    if (!ids.length) return;
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    auth.markNotificationsRead(ids);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="btn-outline" aria-label={`Notifications (${unread.length} unread)`} aria-expanded={open}
        onClick={() => setOpen(!open)} style={{ height: '32px', padding: '0 10px', fontSize: '12px', position: 'relative' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread.length > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '17px', height: '17px', borderRadius: '999px', background: '#b91c1c', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" style={{ position: 'absolute', top: '38px', right: 0, width: 'min(340px, calc(100vw - 32px))', maxHeight: '420px', overflowY: 'auto', background: '#ffffff', border: '1.5px solid var(--line)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,.12)', zIndex: 1000, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
            {lang === 'as' ? 'জাননী' : 'Notifications'}
            {unread.length > 0 && (
              <button type="button" onClick={() => markRead(unread.map((n) => n.id))} style={{ background: 'none', border: 'none', color: 'var(--olive)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                {lang === 'as' ? 'সকলো পঢ়া হ\'ল' : 'Mark all read'}
              </button>
            )}
          </div>
          {items.length === 0 && <div style={{ padding: '18px 12px', fontSize: '12.5px', color: '#64748b' }}>{lang === 'as' ? 'কোনো জাননী নাই।' : 'No notifications yet.'}</div>}
          {items.map((n) => (
            <button key={n.id} type="button" lang={lang} onClick={() => { markRead([n.id]); setOpen(false); if (n.complaint_id) onOpen(n.complaint_id); }}
              style={{ display: 'flex', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', background: n.read ? '#ffffff' : '#FAF2EB', cursor: 'pointer', fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.45 }}>
              <span style={{ flex: 1 }}>{text(n)}</span>
              <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>{ago(n.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
