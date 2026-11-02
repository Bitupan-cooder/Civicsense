import { closeStudentAuth, useStudentSession } from '../studentSession';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';

export function StudentAuthModal() {
  const s = useStudentSession();
  if (!s.authOpen) return null;

  return (
    <div
      className="modal-overlay"
      id="studentAuthModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studentAuthTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeStudentAuth();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 20, 16, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
        <button
          onClick={() => closeStudentAuth()}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 30,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f2f8ec',
            border: 'none',
            fontSize: '18px',
            lineHeight: 1,
            color: '#4a6142',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}
        >
          ×
        </button>
        <SignInCard
          embedded={true}
          defaultTab={s.authTab}
          onSuccess={() => closeStudentAuth()}
        />
      </div>
    </div>
  );
}
