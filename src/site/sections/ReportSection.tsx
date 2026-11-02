// Report section layout. The form, sign-in gate and success card are React components.
import { ReportAuthGate, ReportForm, ReportSuccessCard } from '../components/ReportForm';
import { ShaderCanvas } from '../../components/ui/ShaderCanvas';

export function ReportSection() {
  return (
    <section className="report-section" id="report">
      <ShaderCanvas />
      <div className="report-inner">
        <h2 className="h2 split reveal">
          Report a Campus Issue.
          <br />
          <em style={{ color: 'var(--olive)', fontStyle: 'italic' }}>
            Campus Redressal &amp; Grievance Tracking.
          </em>
        </h2>
        <p style={{ fontSize: '14px', color: '#2a3820', margin: '-10px 0 20px', lineHeight: '1.5' }} className="reveal">
          Submit issues directly to university departments or administration. Every complaint is tracked openly with clear milestone updates.
        </p>
        <ReportSuccessCard />
        <ReportAuthGate />
        <ReportForm />
      </div>
    </section>
  );
}
