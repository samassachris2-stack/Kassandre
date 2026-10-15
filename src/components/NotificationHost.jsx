import { useEffect, useState } from "react";
import { subscribe, dismissToast, answerConfirm } from "../lib/notify";

const COLORS = {
  success: { bar: "#22c55e", icon: "✓" },
  error: { bar: "#ef4444", icon: "!" },
  warning: { bar: "#f59e0b", icon: "!" },
  info: { bar: "#7c3aed", icon: "i" },
};

const S = {
  stack: {
    position: "fixed",
    top: "16px",
    right: "16px",
    left: "16px",
    zIndex: 10000,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
    pointerEvents: "none",
  },
  toast: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    maxWidth: "380px",
    padding: "12px 14px",
    background: "#14141f",
    color: "#e8e8f0",
    border: "1px solid #2a2a3d",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
    fontSize: "0.92rem",
    lineHeight: 1.4,
  },
  icon: {
    flex: "none",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#0a0a0f",
  },
  close: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#8888a0",
    cursor: "pointer",
    fontSize: "1.1rem",
    lineHeight: 1,
    padding: "0 2px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10001,
    background: "rgba(5,5,10,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  dialog: {
    width: "100%",
    maxWidth: "420px",
    background: "#14141f",
    color: "#e8e8f0",
    border: "1px solid #2a2a3d",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  btn: {
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #2a2a3d",
    background: "transparent",
    color: "#e8e8f0",
    cursor: "pointer",
    fontSize: "0.92rem",
  },
};

export default function NotificationHost() {
  const [state, setState] = useState({ toasts: [], confirm: null });

  useEffect(() => subscribe(setState), []);

  useEffect(() => {
    if (!state.confirm) return;
    const onKey = (e) => {
      if (e.key === "Escape") answerConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.confirm]);

  const { toasts, confirm } = state;

  return (
    <>
      <div style={S.stack} aria-live="polite">
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} role={t.type === "error" ? "alert" : "status"} style={{ ...S.toast, borderLeft: `4px solid ${c.bar}` }}>
              <span style={{ ...S.icon, background: c.bar }}>{c.icon}</span>
              <span style={{ flex: 1, wordBreak: "break-word" }}>{t.message}</span>
              <button style={S.close} onClick={() => dismissToast(t.id)} aria-label="Fermer">×</button>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div style={S.overlay} onClick={() => answerConfirm(false)}>
          <div role="alertdialog" aria-modal="true" style={S.dialog} onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{confirm.message}</p>
            <div style={S.actions}>
              <button style={S.btn} onClick={() => answerConfirm(false)}>Annuler</button>
              <button
                autoFocus
                style={{
                  ...S.btn,
                  border: "none",
                  background: confirm.danger ? "#ef4444" : "#7c3aed",
                  color: "#fff",
                  fontWeight: 600,
                }}
                onClick={() => answerConfirm(true)}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
