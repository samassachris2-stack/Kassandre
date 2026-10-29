import { ACCENTS, DEFAULTS, setAppearance, resetAppearance, useAppearance } from "../lib/appearance";

const THEMES = [
  { id: "dark", label: "Sombre", bg: "#0a0a0f", card: "#12121a", line: "#2a2a35", text: "#e8e8f0" },
  { id: "light", label: "Clair", bg: "#f4f4f9", card: "#ffffff", line: "#d8d8e4", text: "#17172a" },
  { id: "amoled", label: "Noir pur", bg: "#000000", card: "#08080c", line: "#22222c", text: "#e8e8f0" },
  { id: "auto", label: "Automatique", bg: "linear-gradient(135deg,#0a0a0f 50%,#f4f4f9 50%)", card: "#8884", line: "#8886", text: "#888" },
];

const SCALES = [
  { v: 0.9, label: "Petite" },
  { v: 1, label: "Normale" },
  { v: 1.1, label: "Grande" },
  { v: 1.2, label: "Très grande" },
];

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            style={{
              padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              border: `1px solid ${on ? "var(--k-accent)" : "var(--k-border)"}`,
              background: on ? "rgba(var(--k-accent-rgb), 0.15)" : "var(--k-inset)",
              color: on ? "var(--k-accent-text)" : "var(--k-muted2)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ title, hint, children }) {
  return (
    <div style={{ marginBottom: "22px", textAlign: "left" }}>
      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--k-text)", marginBottom: hint ? "2px" : "10px" }}>{title}</p>
      {hint && <p style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "10px", lineHeight: 1.4 }}>{hint}</p>}
      {children}
    </div>
  );
}

export default function AppearancePanel() {
  const s = useAppearance();
  const changed = JSON.stringify(s) !== JSON.stringify(DEFAULTS);

  return (
    <section style={{ border: "1px solid var(--k-border)", borderRadius: "12px", padding: "18px", background: "var(--k-surface)" }}>
      <h2 style={{ fontSize: "18px", margin: "0 0 4px", textAlign: "left", color: "var(--k-text)" }}>Apparence</h2>
      <p style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "20px", textAlign: "left" }}>
        Ces réglages s'appliquent tout de suite et sont gardés sur cet appareil.
      </p>

      <Row title="Thème">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
          {THEMES.map((t) => {
            const on = s.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAppearance({ theme: t.id })}
                aria-pressed={on}
                style={{
                  padding: "8px", borderRadius: "10px", cursor: "pointer", textAlign: "center",
                  border: `2px solid ${on ? "var(--k-accent)" : "var(--k-border)"}`,
                  background: "var(--k-inset)", color: "var(--k-text)", fontSize: "12px", fontWeight: 600,
                }}
              >
                <div style={{ height: "46px", borderRadius: "6px", background: t.bg, border: `1px solid ${t.line}`, padding: "7px", boxSizing: "border-box", marginBottom: "6px" }}>
                  <div style={{ height: "100%", borderRadius: "4px", background: t.card, border: `1px solid ${t.line}`, display: "flex", alignItems: "center", padding: "0 6px", boxSizing: "border-box" }}>
                    <div style={{ height: "4px", width: "60%", borderRadius: "2px", background: t.text, opacity: 0.8 }} />
                  </div>
                </div>
                {t.label}
              </button>
            );
          })}
        </div>
      </Row>

      <Row title="Couleur d'accent" hint="Boutons, liens et éléments mis en avant.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {Object.entries(ACCENTS).map(([id, a]) => {
            const on = s.accent === id;
            return (
              <button
                key={id}
                type="button"
                title={a.label}
                aria-label={a.label}
                aria-pressed={on}
                onClick={() => setAppearance({ accent: id })}
                style={{
                  width: "38px", height: "38px", borderRadius: "50%", background: a.main, cursor: "pointer",
                  border: on ? "3px solid var(--k-text)" : "3px solid transparent",
                  outline: on ? "2px solid " + a.main : "none", outlineOffset: "1px",
                }}
              />
            );
          })}
        </div>
      </Row>

      <Row title="Taille d'affichage" hint="Agrandit ou réduit tout le site.">
        <Segmented options={SCALES} value={s.scale} onChange={(v) => setAppearance({ scale: v })} />
      </Row>

      <Row title="Police">
        <Segmented
          options={[{ v: "default", label: "Standard" }, { v: "readable", label: "Lisible" }, { v: "serif", label: "Avec empattements" }]}
          value={s.font}
          onChange={(v) => setAppearance({ font: v })}
        />
      </Row>

      <Row title="Contraste" hint="Bordures et textes plus marqués.">
        <Segmented
          options={[{ v: "normal", label: "Normal" }, { v: "high", label: "Élevé" }]}
          value={s.contrast}
          onChange={(v) => setAppearance({ contrast: v })}
        />
      </Row>

      <Row title="Animations" hint="Réduire supprime les transitions et les mouvements.">
        <Segmented
          options={[{ v: "normal", label: "Normales" }, { v: "reduced", label: "Réduites" }]}
          value={s.motion}
          onChange={(v) => setAppearance({ motion: v })}
        />
      </Row>

      <button
        type="button"
        onClick={resetAppearance}
        disabled={!changed}
        style={{
          padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
          border: "1px solid var(--k-border)", background: "transparent",
          color: changed ? "var(--k-text)" : "var(--k-faint)", cursor: changed ? "pointer" : "default",
        }}
      >
        Réinitialiser l'apparence
      </button>
    </section>
  );
}
