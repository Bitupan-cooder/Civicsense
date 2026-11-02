// Markup converted 1:1 from the original index.html (React migration, step 1).
import { useRef } from 'react';
import { closeReuploadModal, submitReuploadId, useStudentSession } from '../studentSession';

export function ReuploadIdModal() {
  const s = useStudentSession();
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className={s.reuploadOpen ? "modal-overlay" : "modal-overlay hidden"} id="reuploadIdModal" role="dialog" aria-modal="true" aria-labelledby="reuploadTitle">
      {" "}
      <div className="modal" style={{ maxWidth: "440px" }}>
        {" "}
        <div className="modal-header">
          {" "}
          <div className="modal-title" id="reuploadTitle">
            {" "}Re-upload Student ID Card{" "}
          </div>
          {" "}
          <button className="modal-close" onClick={() => closeReuploadModal()} aria-label="Close">
            ×
          </button>
          {" "}
        </div>
        {" "}
        <div className="modal-body" style={{ padding: "20px 22px" }}>
          {" "}
          <p style={{ fontSize: "12.5px", color: "#4a6142", lineHeight: "1.5", marginBottom: "14px" }}>
            {" "}Your previous ID card submission was marked not valid. Please attach a clear scan or photograph of your valid Dibrugarh University student ID card.{" "}
          </p>
          {" "}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            {" "}
            <label className="form-label" htmlFor="reuploadFile">
              New ID Card File (Image or PDF, max 5 MB)
            </label>
            {" "}
            <input ref={file} className="track-input" id="reuploadFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", boxSizing: "border-box", background: "#ffffff" }} />
            {" "}
          </div>
          {" "}
          <div id="reuploadErr" style={{ display: s.reuploadError ? "block" : "none", color: "#b91c1c", fontSize: "12px", fontWeight: "600", marginBottom: "12px", lineHeight: "1.4" }}>
              {s.reuploadError}
            </div>
          {" "}
          <div style={{ display: "flex", gap: "10px" }}>
            {" "}
            <button type="button" className="btn-outline" style={{ flex: "1" }} onClick={() => closeReuploadModal()}>
              Cancel
            </button>
            {" "}
            <button type="button" className="btn" id="reuploadSubmitBtn" style={{ flex: "2" }} disabled={s.reuploadBusy} onClick={() => submitReuploadId(file.current?.files?.[0] ?? null)}>
              {s.reuploadBusy ? 'Uploading ID...' : 'Submit for Review'}
            </button>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </div>
  );
}
