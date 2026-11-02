// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { closeIdCard, reviewIdCard, useConsole } from '../console';

export function IdCardModal() {
  const { idCard: v } = useConsole();
  const label = v?.status === 'verified' ? 'ID Verified' : v?.status === 'not_valid' ? 'ID Not Valid' : 'ID Pending Verification';
  return (
    <div className={v ? "modal-overlay" : "modal-overlay hidden"} id="idCardModal">
      {" "}
      <div className="auth-box" style={{ maxWidth: "580px" }}>
        {" "}
        <div className="modal-head" style={{ background: "#ffffff" }}>
          {" "}
          <div>
            {" "}
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
              Student Identity Card Verification
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#51684c" }} id="idCardModalStudentInfo">
              {v ? 'Student: ' + (v.name || 'Registered Student') + (v.email ? ' · ' + v.email : '') : 'Student: --'}
            </div>
            {" "}
          </div>
          {" "}
          <button type="button" onClick={() => closeIdCard()} style={{ background: "none", border: "none", color: "#4a6142", fontSize: "22px", fontWeight: "700", cursor: "pointer" }}>
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body">
          {" "}
          <div id="idCardLoading" style={{ display: !v || v.loading ? "block" : "none", textAlign: "center", padding: "36px", fontSize: "13px", color: "#51684c" }}>
            {" "}
            <div style={{ width: "24px", height: "24px", border: "2.5px solid var(--line)", borderTopColor: "var(--olive)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
            {" "}Fetching authenticated signed ID card from Cloudinary...{" "}
          </div>
          {" "}
          <div id="idCardViewerContainer" style={{ display: v && v.url ? "block" : "none" }}>
            {" "}
            <div style={{ background: "#ffffff", padding: "8px", borderRadius: "12px", border: "1.5px solid var(--line)", textAlign: "center", marginBottom: "16px" }}>
              {" "}
              <img id="idCardImagePreview" src={v?.url ?? undefined} alt="Student ID Card Preview" style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain", borderRadius: "8px" }} />
              {" "}
            </div>
            {" "}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              {" "}
              <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: "600" }}>
                Current Card Status:
              </span>
              {" "}
              <span id="idCardPreviewStatusPill" className={v?.status ? 'pill-id-' + v.status : 'pill-id-pending'}>
                {v?.status ? label : 'Pending'}
              </span>
              {" "}
            </div>
            {" "}
            <div style={{ display: "flex", gap: "10px" }}>
              {" "}
              <button type="button" className="btn" style={{ flex: "1", background: "var(--olive)" }} onClick={() => reviewIdCard('verified')}>
                {" "}Mark ID as Verified{" "}
              </button>
              {" "}
              <button type="button" className="btn-outline btn-red" style={{ flex: "1" }} onClick={() => reviewIdCard('not_valid')}>
                {" "}Mark ID as Not Valid{" "}
              </button>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div id="idCardErrorContainer" style={{ display: v?.error ? "block" : "none", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 14px", borderRadius: "8px", fontSize: "12.5px", lineHeight: "1.45" }}>
            {v?.error}
          </div>
          {" "}
        </div>
        {" "}
        <div className="modal-foot">
          {" "}
          <button type="button" className="btn-outline" onClick={() => closeIdCard()}>
            Close
          </button>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
