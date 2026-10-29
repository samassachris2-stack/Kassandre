import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { notify, askConfirm } from "../lib/notify";
import { AGE_BANDS, PROFESSIONS, deleteDemographics, loadDemographics, saveDemographics } from "../lib/demographics";
import departements from "../lib/departements.json";
import pays from "../lib/pays.json";

// Profil facultatif pour les statistiques de groupes. Rien n'est enregistré
// sans consentement, et tout peut être effacé à tout moment.
export default function DemographicsPanel() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState(null);
  const [consent, setConsent] = useState(false);
  const [f, setF] = useState({ country: "FR", dept: "", arr: "", ageBand: "", profession: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDemographics(user.uid)
      .then((d) => {
        if (!alive) return;
        if (d) {
          setExisting(d);
          setConsent(true);
          setF({ country: d.country || "FR", dept: d.dept || "", arr: d.arr ? String(d.arr) : "", ageBand: d.ageBand || "", profession: d.profession || "" });
        }
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [user.uid]);

  async function save() {
    setSaving(true);
    try {
      await saveDemographics(user.uid, f, existing);
      setExisting({ ...(existing || {}), consent: true });
      notify("Merci, ton profil est enregistré.", "success");
    } catch (e) {
      console.error(e);
      notify("Enregistrement impossible.", "error");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!(await askConfirm("Effacer ces informations et retirer ton consentement ?", { confirmLabel: "Effacer", danger: true }))) return;
    try {
      await deleteDemographics(user.uid);
      setExisting(null); setConsent(false); setF({ country: "FR", dept: "", arr: "", ageBand: "", profession: "" });
      notify("Informations effacées.", "success");
    } catch { notify("Suppression impossible.", "error"); }
  }

  const sel = {
    width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--k-border)",
    background: "var(--k-inset)", color: "var(--k-text)", fontSize: "14px", fontFamily: "inherit",
  };
  const lbl = { display: "block", fontSize: "12px", color: "var(--k-muted)", margin: "12px 0 4px" };

  return (
    <section style={{ border: "1px solid var(--k-border)", borderRadius: "12px", padding: "18px", background: "var(--k-surface)", textAlign: "left" }}>
      <h2 style={{ fontSize: "18px", margin: "0 0 6px", color: "var(--k-text)" }}>Aider la recherche (facultatif)</h2>
      <p style={{ fontSize: "13px", color: "var(--k-muted2)", lineHeight: 1.55, margin: 0 }}>
        Indique où tu vis, ton âge et ton métier pour que Kassandre puisse montrer ce que pensent les différents groupes
        (par exemple par département ou par tranche d'âge). Ces informations ne sont <strong>jamais affichées à ton nom</strong> :
        elles servent uniquement à des statistiques de groupes d'au moins 10 personnes.
      </p>

      <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", margin: "14px 0 0", fontSize: "13px", color: "var(--k-text)", cursor: "pointer" }}>
        <input type="checkbox" checked={consent} disabled={!loaded} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: "3px" }} />
        <span>J'accepte que ces informations soient utilisées de façon agrégée et anonyme. Je peux les effacer à tout moment.</span>
      </label>

      {consent && (
        <div>
          <label style={lbl}>Pays de résidence</label>
          <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value, dept: "", arr: "" })} style={sel}>
            {pays.map((c) => <option key={c.code} value={c.code}>{c.nom}</option>)}
          </select>

          {f.country === "FR" && (
            <>
              <label style={lbl}>Département</label>
              <select value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value, arr: e.target.value === "75" ? f.arr : "" })} style={sel}>
                <option value="">Non précisé</option>
                {departements.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.nom}</option>)}
              </select>
            </>
          )}

          {f.country === "FR" && f.dept === "75" && (
            <>
              <label style={lbl}>Arrondissement de Paris</label>
              <select value={f.arr} onChange={(e) => setF({ ...f, arr: e.target.value })} style={sel}>
                <option value="">Non précisé</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}{n === 1 ? "er" : "e"}</option>)}
              </select>
            </>
          )}

          <label style={lbl}>Tranche d'âge</label>
          <select value={f.ageBand} onChange={(e) => setF({ ...f, ageBand: e.target.value })} style={sel}>
            <option value="">Non précisé</option>
            {AGE_BANDS.map((a) => <option key={a} value={a}>{a.replace("-", " à ")}{a === "65+" ? " ans et plus" : " ans"}</option>)}
          </select>

          <label style={lbl}>Domaine d'activité</label>
          <select value={f.profession} onChange={(e) => setF({ ...f, profession: e.target.value })} style={sel}>
            <option value="">Non précisé</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <button type="button" onClick={save} disabled={saving} style={{ marginTop: "16px", padding: "10px 16px", borderRadius: "8px", border: "none", background: "var(--k-accent)", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}

      {existing && (
        <button type="button" onClick={remove} style={{ display: "block", marginTop: "14px", background: "none", border: "none", padding: 0, color: "#ef4444", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>
          Effacer mes informations et retirer mon consentement
        </button>
      )}
    </section>
  );
}
