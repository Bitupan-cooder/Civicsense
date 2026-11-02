// Markup converted 1:1 from the original admin.html (React migration, step 1).
import { useConsole } from '../console';

export function AuthLoading() {
  const { auth } = useConsole();
  return (
    <div id="authLoadingState" style={{ display: auth === 'loading' ? "flex" : "none", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "14px", background: "var(--bg)" }}>
      {" "}
      <div style={{ width: "28px", height: "28px", border: "2.5px solid var(--line)", borderTopColor: "var(--olive)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      {" "}
      <span style={{ fontSize: "13px", color: "#4a6142", fontWeight: "600" }}>
        Verifying official credentials...
      </span>
      {" "}
    </div>
  );
}
