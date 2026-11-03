export interface TrackStatusStep {
  label: string;
  timestamp: string | null;
}

/** Horizontal route milestone indicator for student complaint tracking. */
export function TrackStatusStepper({ steps }: { steps: TrackStatusStep[] }) {
  const firstPendingIndex = steps.findIndex((step) => !step.timestamp);
  const allComplete = firstPendingIndex === -1;

  return (
    <ol className="track-status-stepper" aria-label="Complaint route progress">
      {steps.map((step, index) => {
        const complete = Boolean(step.timestamp);
        const current = !allComplete && index === firstPendingIndex;
        const state = complete ? 'is-complete' : current ? 'is-current' : 'is-pending';
        return (
          <li className={`track-status-step ${state}`} key={step.label} aria-current={current ? 'step' : undefined}>
            <span className="track-status-marker" aria-hidden="true">{complete ? '✓' : current ? '○' : ''}</span>
            <strong>{step.label}</strong>
            <time dateTime={step.timestamp || undefined}>{step.timestamp ? new Date(step.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending'}</time>
          </li>
        );
      })}
    </ol>
  );
}
