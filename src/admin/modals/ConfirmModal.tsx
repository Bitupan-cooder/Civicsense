// The console's own confirm card (log out, deactivate, delete), in place of the browser's confirm() box.
import { useEffect, useRef } from 'react';
import { CircleCheck, LogOut, TriangleAlert } from 'lucide-react';
import { answerConfirm, useConsole } from '../console';

const ICONS = { logout: LogOut, warning: TriangleAlert, check: CircleCheck };

export function ConfirmModal() {
  const { confirm: c } = useConsole();
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!c) return;
    const returnTo = document.activeElement as HTMLElement | null;
    (c.danger ? cancelBtn : confirmBtn).current?.focus(); // risky actions start on Cancel
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') answerConfirm(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); returnTo?.focus?.(); };
  }, [c]);
  if (!c) return null;
  const Icon = ICONS[c.icon];
  return (
    <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) answerConfirm(false); }}>
      <div className={c.danger ? 'confirm-card is-danger' : 'confirm-card'} role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
        <span className="confirm-icon" aria-hidden="true"><Icon /></span>
        <h2 id="confirmTitle">{c.title}</h2>
        <p id="confirmMessage">{c.message}</p>
        <div className="confirm-actions">
          <button ref={cancelBtn} type="button" className="confirm-cancel" onClick={() => answerConfirm(false)}>Cancel</button>
          <button ref={confirmBtn} type="button" className="confirm-ok" onClick={() => answerConfirm(true)}>{c.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
