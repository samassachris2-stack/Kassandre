import { useState, useEffect, useRef, useMemo } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { resolveMarket, deleteMarket } from "../lib/amm.js";

function MultiResolveButtons({ marketId }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function load() {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      const snap = await getDocs(collection(db, "markets", marketId, "options"));
      setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [marketId]);

  async function handleResolve(optionId, label) {
    if (!confirm(`Résoudre avec "${label}" comme gagnant ?`)) return;
    try {
      await resolveMarket(marketId, optionId);
      alert("Marché résolu et gains distribués.");
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => handleResolve(opt.id, opt.label)}
          style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
        >
          Résoudre : {opt.label}
        </button>
      ))}
    </div>
  );
}

const CROP_RATIO = 900 / 280; // ratio largeur/hauteur du carrousel (un peu plus que le visible pour la marge)

function ImageCropper({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef(null);

  const CANVAS_W = 600;
  const CANVAS_H = Math.round(CANVAS_W / CROP_RATIO);

  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!objectUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Zoom minimal pour couvrir tout le cadre (comme object-fit: cover)
      const minZoom = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
      setZoom(minZoom);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = objectUrl;
  }, [objectUrl]);

  useEffect(() => {
    if (!imgLoaded) return;
    draw();
  }, [imgLoaded, zoom, offset]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const drawW = img.width * zoom;
    const drawH = img.height * zoom;
    const x = (CANVAS_W - drawW) / 2 + offset.x;
    const y = (CANVAS_H - drawH) / 2 + offset.y;
    ctx.drawImage(img, x, y, drawW, drawH);
  }

  function clampOffset(next, currentZoom) {
    const img = imgRef.current;
    if (!img) return next;
    const drawW = img.width * currentZoom;
    const drawH = img.height * currentZoom;
    const maxX = Math.max(0, (drawW - CANVAS_W) / 2);
    const maxY = Math.max(0, (drawH - CANVAS_H) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }
  function handlePointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy }, zoom));
  }
  function handlePointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(e) {
    const img = imgRef.current;
    if (!img) return;
    const minZoom = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
    const maxZoom = minZoom * 3;
    const newZoom = minZoom + (maxZoom - minZoom) * (Number(e.target.value) / 100);
    setZoom(newZoom);
    setOffset((prev) => clampOffset(prev, newZoom));
  }

  function handleConfirm() {
    // Rendu final à pleine résolution (1600x ratio) pour une bonne qualité d'affichage
    const FINAL_W = 1600;
    const FINAL_H = Math.round(FINAL_W / CROP_RATIO);
    const scale = FINAL_W / CANVAS_W;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = FINAL_W;
    finalCanvas.height = FINAL_H;
    const ctx = finalCanvas.getContext("2d");
    const img = imgRef.current;
    const drawW = img.width * zoom * scale;
    const drawH = img.height * zoom * scale;
    const x = (FINAL_W - drawW) / 2 + offset.x * scale;
    const y = (FINAL_H - drawH) / 2 + offset.y * scale;
    ctx.drawImage(img, x, y, drawW, drawH);

    finalCanvas.toBlob((blob) => onConfirm(blob), "image/jpeg", 0.9);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
    }}>
      <div style={{ background: "#13131a", border: "1px solid #2a2a3e", borderRadius: "16px", padding: "20px", maxWidth: "640px", width: "100%" }}>
        <p style={{ fontSize: "14px", fontWeight: "600", color: "#e8e8f0", marginBottom: "12px" }}>
          Ajuste le cadrage de l'image
        </p>

        {!imgLoaded ? (
          <p style={{ color: "#8888a0", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>Chargement de l'image...</p>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ width: "100%", height: "auto", borderRadius: "10px", cursor: "grab", display: "block", touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px" }}>
              <span style={{ fontSize: "12px", color: "#8888a0" }}>Zoom</span>
              <input
                type="range" min="0" max="100" defaultValue="0"
                onChange={handleZoomChange}
                style={{ flex: 1 }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#6b6b80", marginTop: "6px" }}>
              Glisse l'image pour la repositionner.
            </p>
          </>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "transparent", color: "#8888a0", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!imgLoaded}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
          >
            Valider le cadrage
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturedSettings({ market }) {
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("L'image doit faire moins de 10 Mo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Le fichier doit être une image.");
      return;
    }
    setPendingFile(file);
    e.target.value = ""; // permet de re-sélectionner le même fichier plus tard
  }

  async function handleCropConfirm(blob) {
    setPendingFile(null);
    setUploading(true);
    try {
      const imgRef = ref(storage, `market-covers/${market.id}`);
      await uploadBytes(imgRef, blob);
      const url = await getDownloadURL(imgRef);
      await updateDoc(doc(db, "markets", market.id), { coverImageUrl: url });
    } catch (err) {
      alert("Erreur lors de l'upload : " + err.message);
    }
    setUploading(false);
  }

  async function togglePin() {
    try {
      await updateDoc(doc(db, "markets", market.id), { pinnedFeatured: !market.pinnedFeatured });
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  const currentTags = market.tags || [];

  async function addTag() {
    const tag = newTag.trim();
    if (!tag || currentTags.includes(tag)) { setNewTag(""); return; }
    try {
      await updateDoc(doc(db, "markets", market.id), { tags: [...currentTags, tag] });
      setNewTag("");
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  async function removeTag(tag) {
    try {
      await updateDoc(doc(db, "markets", market.id), { tags: currentTags.filter((t) => t !== tag) });
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  return (
    <>
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #2a2a3e" }}>
      {market.coverImageUrl && (
        <img src={market.coverImageUrl} alt="" style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }} />
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ padding: "6px 12px", background: "#1a1a2e", color: "#a78bfa", borderRadius: "6px", border: "1px solid #7c3aed", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
      >
        {uploading ? "Envoi..." : market.coverImageUrl ? "Changer l'image" : "+ Image de couverture"}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />

      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}

      <button
        onClick={togglePin}
        style={{
          padding: "6px 12px", borderRadius: "6px", border: "1px solid",
          borderColor: market.pinnedFeatured ? "#f59e0b" : "#2a2a3e",
          background: market.pinnedFeatured ? "rgba(245,158,11,0.15)" : "#1a1a2e",
          color: market.pinnedFeatured ? "#f59e0b" : "#8888a0",
          cursor: "pointer", fontSize: "12px", fontWeight: "600", marginLeft: "auto",
        }}
      >
        {market.pinnedFeatured ? "★ Épinglé à la une" : "☆ Épingler à la une"}
      </button>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
      {currentTags.map((tag) => (
        <span key={tag} style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "11px", fontWeight: "500", color: "#a78bfa",
          background: "rgba(124,58,237,0.12)", borderRadius: "6px",
          padding: "3px 6px 3px 9px", border: "0.5px solid rgba(124,58,237,0.25)",
        }}>
          {tag}
          <button
            onClick={() => removeTag(tag)}
            aria-label={`Retirer le tag ${tag}`}
            style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", padding: 0, fontSize: "13px", lineHeight: 1 }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        placeholder="+ tag (ex: Trump)"
        style={{
          fontSize: "12px", padding: "5px 9px", borderRadius: "6px",
          border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0",
          width: "120px",
        }}
      />
    </div>
    </>
  );
}

// Parseur CSV minimal : gère les guillemets pour les champs contenant des
// virgules ou des retours à la ligne, sans dépendance externe.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { row.push(field); field = ""; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        if (row.some((f) => f.trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function CsvImport({ onAddToQueue }) {
  const [csvType, setCsvType] = useState("binary");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState(null); // null = pas encore prévisualisé
  const [parseErrors, setParseErrors] = useState([]);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target.result);
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function buildPreview() {
    const rows = parseCsv(rawText);
    if (rows.length === 0) {
      alert("Le CSV est vide ou n'a pas pu être lu.");
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const expectedCols = csvType === "binary"
      ? ["question", "description", "categories", "resolutiondate", "resolutionsource"]
      : ["question", "description", "categories", "resolutiondate", "resolutionsource", "options"];

    const missing = expectedCols.filter((c) => !header.includes(c));
    if (missing.length > 0) {
      alert(`Colonnes manquantes dans l'en-tête : ${missing.join(", ")}`);
      return;
    }

    const colIndex = {};
    expectedCols.forEach((c) => { colIndex[c] = header.indexOf(c); });
    const tagsColIndex = header.indexOf("tags"); // optionnelle, -1 si absente

    const results = [];
    const errors = [];

    dataRows.forEach((row, i) => {
      const lineNum = i + 2; // +1 pour l'en-tête, +1 pour l'index 0-based
      const question = (row[colIndex.question] || "").trim();
      const description = (row[colIndex.description] || "").trim();
      const categoriesRaw = (row[colIndex.categories] || "").trim();
      const resolutionDate = (row[colIndex.resolutiondate] || "").trim();
      const resolutionSource = (row[colIndex.resolutionsource] || "").trim();
      const tagsRaw = tagsColIndex >= 0 ? (row[tagsColIndex] || "").trim() : "";
      const tags = tagsRaw.split("|").map((t) => t.trim()).filter(Boolean);

      if (!question || !resolutionDate || !resolutionSource) {
        errors.push(`Ligne ${lineNum} : question, date ou source manquante — ignorée.`);
        return;
      }

      const categories = categoriesRaw.split("|").map((c) => c.trim()).filter(Boolean);
      if (categories.length === 0) {
        errors.push(`Ligne ${lineNum} : aucune catégorie valide — ignorée.`);
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(resolutionDate)) {
        errors.push(`Ligne ${lineNum} : date "${resolutionDate}" invalide (format attendu AAAA-MM-JJ) — ignorée.`);
        return;
      }

      if (csvType === "binary") {
        results.push({
          marketType: "binary", question, description, categories, tags,
          resolutionDate, resolutionSource, options: [],
        });
      } else {
        const optionsRaw = (row[colIndex.options] || "").trim();
        const options = optionsRaw.split("|").map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) {
          errors.push(`Ligne ${lineNum} : moins de 2 options valides — ignorée.`);
          return;
        }
        results.push({
          marketType: "multi", question, description, categories, tags,
          resolutionDate, resolutionSource, options,
        });
      }
    });

    setParsed(results);
    setParseErrors(errors);
  }

  function confirmImport() {
    if (!parsed || parsed.length === 0) return;
    parsed.forEach((item) => onAddToQueue(item));
    setParsed(null);
    setParseErrors([]);
    setRawText("");
  }

  return (
    <div style={{ border: "1px solid #2a2a3e", borderRadius: "12px", padding: "20px", marginBottom: "32px" }}>
      <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Import CSV</h3>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => { setCsvType("binary"); setParsed(null); }}
          style={{
            padding: "6px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: csvType === "binary" ? "#7c3aed" : "#1a1a2e", color: "#e8e8f0", fontWeight: "600", fontSize: "13px",
          }}
        >
          Format Oui/Non
        </button>
        <button
          onClick={() => { setCsvType("multi"); setParsed(null); }}
          style={{
            padding: "6px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: csvType === "multi" ? "#7c3aed" : "#1a1a2e", color: "#e8e8f0", fontWeight: "600", fontSize: "13px",
          }}
        >
          Format Multi-choix
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "#6b6b8a", marginBottom: "10px", lineHeight: "1.6" }}>
        Colonnes attendues : <code>question,description,categories,resolutionDate,resolutionSource{csvType === "multi" ? ",options" : ""}</code>
        <br />
        Colonne optionnelle : <code>tags</code> (séparés par <code>|</code>, ex: <code>Trump|Midterms</code>).
        <br />
        Catégories {csvType === "multi" ? "et options " : ""}séparées par <code>|</code> dans une même cellule. Date au format AAAA-MM-JJ.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: "10px 16px", background: "#1a1a2e", color: "#a78bfa", borderRadius: "8px", border: "1px solid #7c3aed", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
        >
          Choisir un fichier .csv
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFileChange} />
        {rawText && (
          <button
            onClick={buildPreview}
            style={{ padding: "10px 16px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
          >
            Prévisualiser
          </button>
        )}
      </div>

      <textarea
        placeholder="Ou colle directement le contenu CSV ici..."
        value={rawText}
        onChange={(e) => { setRawText(e.target.value); setParsed(null); }}
        style={{ width: "100%", minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0", fontFamily: "monospace", fontSize: "12px", boxSizing: "border-box" }}
      />

      {parsed !== null && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: parsed.length > 0 ? "#22c55e" : "#ef4444" }}>
            {parsed.length} marché(s) valide(s) détecté(s){parseErrors.length > 0 ? `, ${parseErrors.length} ligne(s) ignorée(s)` : ""}.
          </p>

          {parseErrors.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px", marginBottom: "12px" }}>
              {parseErrors.map((err, i) => (
                <p key={i} style={{ fontSize: "12px", color: "#ef4444", margin: "2px 0" }}>{err}</p>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <>
              <div style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "12px" }}>
                {parsed.map((item, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "#12121a", borderRadius: "8px", marginBottom: "6px", fontSize: "13px" }}>
                    <p style={{ fontWeight: "600", marginBottom: "2px" }}>{item.question}</p>
                    <p style={{ fontSize: "11px", color: "#6b6b8a" }}>
                      {item.marketType === "multi" ? `Multi (${item.options.join(", ")})` : "Oui/Non"} · {item.categories.join(", ")}{item.tags?.length > 0 && ` · #${item.tags.join(" #")}`} · {item.resolutionDate}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={confirmImport}
                style={{ width: "100%", padding: "12px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Ajouter ces {parsed.length} marché(s) à la liste d'attente
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState(["Sport"]);
  const [tagsInput, setTagsInput] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [marketType, setMarketType] = useState("binary");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedToDelete, setSelectedToDelete] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [queue, setQueue] = useState([]);
  const [creatingQueue, setCreatingQueue] = useState(false);
  const [queueProgress, setQueueProgress] = useState(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketCatFilter, setMarketCatFilter] = useState("Toutes");
  const [marketSort, setMarketSort] = useState("pinned"); // "pinned" | "resolutionAsc"

  // Certains docs Firestore plus anciens stockent `categories` comme une
  // string unique au lieu d'un array — on normalise toujours en array ici.
  function toCatArray(cats) {
    if (Array.isArray(cats)) return cats;
    if (typeof cats === "string" && cats.trim()) return [cats.trim()];
    return [];
  }

  const marketCategories = useMemo(() => {
    const set = new Set();
    markets.forEach((m) => toCatArray(m.categories).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    const result = markets.filter((m) => {
      const matchesSearch = !q || m.question?.toLowerCase().includes(q);
      const matchesCat = marketCatFilter === "Toutes" || toCatArray(m.categories).includes(marketCatFilter);
      return matchesSearch && matchesCat;
    });

    if (marketSort === "resolutionAsc") {
      // Tri par date de résolution la plus proche en premier. Les dates
      // manquantes ou invalides sont reléguées en fin de liste plutôt que
      // de casser le tri ou remonter en tête par erreur.
      return result.sort((a, b) => {
        const da = a.resolutionDate ? new Date(a.resolutionDate).getTime() : Infinity;
        const db = b.resolutionDate ? new Date(b.resolutionDate).getTime() : Infinity;
        return da - db;
      });
    }

    return result.sort((a, b) => (b.pinnedFeatured ? 1 : 0) - (a.pinnedFeatured ? 1 : 0));
  }, [markets, marketSearch, marketCatFilter, marketSort]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadSubmissions();
    const q = query(collection(db, "markets"), where("status", "==", "open"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  async function loadSubmissions() {
    const q = query(collection(db, "submissions"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  function resetForm() {
    setQuestion("");
    setDescription("");
    setTagsInput("");
    setResolutionDate("");
    setResolutionSource("");
    setOptions(["", ""]);
    // category n'est pas reset : pratique pour créer plusieurs marchés de suite
    // dans la même catégorie sans avoir à la resélectionner à chaque fois.
  }

  function buildMarketPayload() {
    if (!question || !resolutionDate || !resolutionSource || categories.length === 0) return null;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (marketType === "multi") {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) return null;
      return {
        marketType, question, description, categories, tags, resolutionDate, resolutionSource,
        options: validOptions,
      };
    }
    return {
      marketType, question, description, categories, tags, resolutionDate, resolutionSource,
      options: [],
    };
  }

  async function createOneMarket(payload) {
    if (payload.marketType === "binary") {
      await addDoc(collection(db, "markets"), {
        question: payload.question,
        description: payload.description,
        categories: payload.categories,
        tags: payload.tags || [],
        resolutionDate: payload.resolutionDate,
        resolutionSource: payload.resolutionSource,
        type: "binary",
        status: "open", outcome: null,
        poolYes: 100, poolNo: 100,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } else {
      const liquidityB = Math.round(75 * Math.log(payload.options.length + 1));
      const marketRef = await addDoc(collection(db, "markets"), {
        question: payload.question,
        description: payload.description,
        categories: payload.categories,
        tags: payload.tags || [],
        resolutionDate: payload.resolutionDate,
        resolutionSource: payload.resolutionSource,
        type: "multi",
        status: "open", outcome: null,
        liquidityB,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      const equalPrice = 1 / payload.options.length;
      const usedIds = new Set();
      for (const label of payload.options) {
        let baseId = label
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retire les accents
          .replace(/[^a-z0-9\s]/g, "") // retire tout sauf lettres/chiffres/espaces
          .trim()
          .replace(/\s+/g, "_");
        if (!baseId) baseId = "option";
        let finalId = baseId;
        let suffix = 1;
        while (usedIds.has(finalId)) {
          finalId = `${baseId}_${suffix}`;
          suffix++;
        }
        usedIds.add(finalId);

        await setDoc(doc(db, "markets", marketRef.id, "options", finalId), {
          label,
          q: 0,
          price: equalPrice,
          createdAt: serverTimestamp(),
        });
      }
    }
  }

  async function createMarket() {
    const payload = buildMarketPayload();
    if (!payload) {
      if (marketType === "multi" && options.filter((o) => o.trim()).length < 2) {
        alert("Ajoute au moins 2 options.");
      } else if (categories.length === 0) {
        alert("Sélectionne au moins un thème.");
      } else {
        alert("Remplis la question, la date et la source.");
      }
      return;
    }
    setLoading(true);
    await createOneMarket(payload);
    resetForm();
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  function addToQueue() {
    const payload = buildMarketPayload();
    if (!payload) {
      if (marketType === "multi" && options.filter((o) => o.trim()).length < 2) {
        alert("Ajoute au moins 2 options.");
      } else if (categories.length === 0) {
        alert("Sélectionne au moins un thème.");
      } else {
        alert("Remplis la question, la date et la source avant d'ajouter à la liste.");
      }
      return;
    }
    setQueue((prev) => [...prev, { ...payload, _id: Date.now() }]);
    resetForm();
  }

  function removeFromQueue(id) {
    setQueue((prev) => prev.filter((q) => q._id !== id));
  }

  async function createQueuedMarkets() {
    if (queue.length === 0) return;
    setCreatingQueue(true);
    for (let i = 0; i < queue.length; i++) {
      setQueueProgress({ current: i + 1, total: queue.length });
      try {
        await createOneMarket(queue[i]);
      } catch (e) {
        alert(`Erreur sur "${queue[i].question}" : ${e.message}`);
      }
    }
    setQueueProgress(null);
    setCreatingQueue(false);
    setQueue([]);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }


  async function approveSubmission(sub) {
    await addDoc(collection(db, "markets"), {
      question: sub.question,
      description: sub.description || "",
      resolutionDate: sub.resolutionDate,
      resolutionSource: sub.resolutionSource,
      categories: sub.categories || ["Autre"],
      type: "binary",
      status: "open", outcome: null,
      poolYes: 100, poolNo: 100,
      createdBy: sub.proposedBy,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "submissions", sub.id), { status: "approved" });
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
  }

  async function rejectSubmission(id) {
    await updateDoc(doc(db, "submissions", id), { status: "rejected" });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleResolve(marketId, outcome) {
    if (!confirm(`Résoudre ce marché avec outcome : ${outcome} ?`)) return;
    try {
      await resolveMarket(marketId, outcome);
      alert("Marché résolu et gains distribués.");
    } catch (e) {
      alert(e.message);
    }
  }

  function toggleSelectForDelete(marketId) {
    setSelectedToDelete((prev) =>
      prev.includes(marketId) ? prev.filter((id) => id !== marketId) : [...prev, marketId]
    );
  }

  async function deleteOneMarket(marketId) {
    // Délègue tout à la Cloud Function deleteMarket, qui utilise le SDK
    // admin (firebase-admin) côté serveur — aucune limite de get() liée aux
    // règles de sécurité (cette limite n'existe que pour les clients), donc
    // plus besoin du contournement "suppression une par une" qu'on avait dû
    // mettre en place avant. Le serveur vérifie aussi que l'appelant est
    // bien admin avant d'agir.
    await deleteMarket(marketId);
  }

  async function handleBulkDelete() {
    if (selectedToDelete.length === 0) return;
    const confirmMsg = selectedToDelete.length === 1
      ? "Supprimer ce marché et toutes ses données associées (options, paris, positions) ? Action irréversible."
      : `Supprimer ces ${selectedToDelete.length} marchés et toutes leurs données associées ? Action irréversible.`;
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    for (const marketId of selectedToDelete) {
      try {
        await deleteOneMarket(marketId);
      } catch (e) {
        alert(`Erreur lors de la suppression de ${marketId} : ${e.message}`);
      }
    }
    setDeleting(false);
    setSelectedToDelete([]);
  }

  if (!user) return <p style={{ padding: "40px", color: "#8888a0" }}>Connecte-toi pour continuer.</p>;
  if (!user.isAdmin) return <p style={{ padding: "40px", color: "#8888a0" }}>Page introuvable.</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "32px" }}>Admin</h1>

      <CsvImport
        onAddToQueue={(item) => setQueue((prev) => [...prev, { ...item, _id: `${Date.now()}_${Math.random()}` }])}
      />

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Créer un marché</h2>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={() => setMarketType("binary")}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: marketType === "binary" ? "#7c3aed" : "#1a1a2e",
            color: "#e8e8f0", fontWeight: "600"
          }}
        >
          Oui / Non
        </button>
        <button
          onClick={() => setMarketType("multi")}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: marketType === "multi" ? "#7c3aed" : "#1a1a2e",
            color: "#e8e8f0", fontWeight: "600"
          }}
        >
          Multi-choix
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
        <input
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />
        <textarea
          placeholder="Description (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0", minHeight: "80px" }}
        />
        <div>
          <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "8px" }}>Thèmes (sélection multiple)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"].map((cat) => {
              const active = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategories((prev) =>
                      active ? prev.filter((c) => c !== cat) : [...prev, cat]
                    );
                  }}
                  style={{
                    padding: "7px 14px", borderRadius: "20px", cursor: "pointer",
                    fontSize: "13px", fontWeight: "500",
                    border: active ? "1px solid #7c3aed" : "1px solid #2a2a3e",
                    background: active ? "rgba(124,58,237,0.2)" : "#12121a",
                    color: active ? "#a78bfa" : "#8888a0",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
        <input
          placeholder="Tags (ex: Trump, Midterms, Congrès — séparés par des virgules)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />
        <input
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />
        <input
          placeholder="Source de résolution"
          value={resolutionSource}
          onChange={(e) => setResolutionSource(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />

        {marketType === "multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "13px", color: "#6b6b8a" }}>Options</p>
            {options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setOptions([...options, ""])}
              style={{ padding: "8px", background: "#1a1a2e", color: "#7c3aed", borderRadius: "8px", border: "1px solid #7c3aed", cursor: "pointer" }}
            >
              + Ajouter une option
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addToQueue}
            style={{ flex: 1, padding: "12px", background: "#1a1a2e", color: "#7c3aed", borderRadius: "8px", border: "1px solid #7c3aed", cursor: "pointer", fontWeight: "600" }}
          >
            + Ajouter à la liste
          </button>
          <button
            onClick={createMarket}
            disabled={loading}
            style={{ flex: 1, padding: "12px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
          >
            {loading ? "Création..." : "Créer directement"}
          </button>
        </div>
        {success && <p style={{ color: "#7c3aed" }}>Marché(s) créé(s).</p>}
      </div>

      {queue.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>
            Liste d'attente ({queue.length})
          </h2>
          {queue.map((item) => (
            <div key={item._id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1px solid #2a2a3e", borderRadius: "10px", padding: "12px 16px", marginBottom: "8px",
            }}>
              <div>
                <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{item.question}</p>
                <p style={{ fontSize: "12px", color: "#6b6b8a" }}>
                  {item.marketType === "multi" ? `Multi-choix (${item.options.length} options)` : "Oui/Non"} · {item.categories.join(", ")}{item.tags?.length > 0 && ` · #${item.tags.join(" #")}`} · {item.resolutionDate}
                </p>
              </div>
              <button
                onClick={() => removeFromQueue(item._id)}
                style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0 }}
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            onClick={createQueuedMarkets}
            disabled={creatingQueue}
            style={{
              width: "100%", padding: "14px", marginTop: "8px",
              background: creatingQueue ? "#3a2066" : "#7c3aed", color: "#fff",
              borderRadius: "8px", border: "none", cursor: creatingQueue ? "not-allowed" : "pointer", fontWeight: "600",
            }}
          >
            {creatingQueue
              ? `Création en cours... (${queueProgress?.current ?? 0}/${queueProgress?.total ?? queue.length})`
              : `Créer les ${queue.length} marché(s) de la liste`}
          </button>
        </div>
      )}

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Marchés ouverts ({filteredMarkets.length}/{markets.length})</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={marketSearch}
          onChange={(e) => setMarketSearch(e.target.value)}
          placeholder="🔍 Rechercher un marché par titre..."
          style={{
            flex: "1 1 240px", padding: "10px 14px", background: "#1a1a2e",
            border: "1px solid #2a2a3e", borderRadius: "8px", color: "#e8e8f0", fontSize: "13px",
          }}
        />
        <select
          value={marketCatFilter}
          onChange={(e) => setMarketCatFilter(e.target.value)}
          style={{
            padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a3e",
            borderRadius: "8px", color: "#e8e8f0", fontSize: "13px", cursor: "pointer",
          }}
        >
          <option value="Toutes">Toutes catégories</option>
          {marketCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={marketSort}
          onChange={(e) => setMarketSort(e.target.value)}
          style={{
            padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a3e",
            borderRadius: "8px", color: "#e8e8f0", fontSize: "13px", cursor: "pointer",
          }}
        >
          <option value="pinned">Épinglés en premier</option>
          <option value="resolutionAsc">Résolution la plus proche</option>
        </select>
        {(marketSearch || marketCatFilter !== "Toutes" || marketSort !== "pinned") && (
          <button
            onClick={() => { setMarketSearch(""); setMarketCatFilter("Toutes"); setMarketSort("pinned"); }}
            style={{
              padding: "10px 14px", background: "transparent", color: "#8888a0",
              border: "1px solid #2a2a3e", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
            }}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>


      {selectedToDelete.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px" }}>
          <span style={{ fontSize: "13px", color: "#ef4444", fontWeight: "600" }}>
            {selectedToDelete.length} sélectionné(s)
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            style={{ padding: "6px 14px", background: deleting ? "#7a2a2a" : "#ef4444", color: "#fff", borderRadius: "6px", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px" }}
          >
            {deleting ? "Suppression..." : "Supprimer la sélection"}
          </button>
          <button
            onClick={() => setSelectedToDelete([])}
            style={{ padding: "6px 14px", background: "transparent", color: "#8888a0", borderRadius: "6px", border: "1px solid #2a2a3e", cursor: "pointer", fontSize: "13px" }}
          >
            Annuler la sélection
          </button>
        </div>
      )}

      {filteredMarkets.length === 0 && (
        <p style={{ color: "#6b6b8a", fontSize: "13px", textAlign: "center", padding: "30px 0" }}>
          Aucun marché ne correspond à ta recherche.
        </p>
      )}

      {filteredMarkets.map((market) => (
        <div key={market.id} style={{
          border: selectedToDelete.includes(market.id) ? "1px solid #ef4444" : "1px solid #2a2a3e",
          borderRadius: "12px", padding: "16px", marginBottom: "12px",
          background: selectedToDelete.includes(market.id) ? "rgba(239,68,68,0.05)" : "transparent",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "4px" }}>
            <input
              type="checkbox"
              checked={selectedToDelete.includes(market.id)}
              onChange={() => toggleSelectForDelete(market.id)}
              style={{ marginTop: "3px", cursor: "pointer", flexShrink: 0 }}
            />
            <p style={{ fontWeight: "600", marginBottom: "4px" }}>
              {market.pinnedFeatured && <span style={{ color: "#f59e0b" }}>★ </span>}
              {market.question}
            </p>
          </div>
          <p style={{ fontSize: "12px", color: "#6b6b8a", marginBottom: "12px", marginLeft: "26px" }}>
            {market.type === "multi" ? "Multi-choix" : "Oui/Non"} · Résolution : {market.resolutionDate}
            {toCatArray(market.categories).length > 0 && ` · ${toCatArray(market.categories).join(", ")}`}
          </p>
          {market.type === "binary" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleResolve(market.id, "yes")}
                style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Résoudre : Oui
              </button>
              <button
                onClick={() => handleResolve(market.id, "no")}
                style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Résoudre : Non
              </button>
            </div>
          )}
          {market.type === "multi" && (
  <MultiResolveButtons marketId={market.id} />
)}
          <FeaturedSettings market={market} />
        </div>
      ))}

      <h2 style={{ fontSize: "18px", marginBottom: "16px", marginTop: "32px" }}>
        Soumissions en attente ({submissions.length})
      </h2>
      {submissions.length === 0 && (
        <p style={{ color: "#6b6b8a" }}>Aucune soumission en attente.</p>
      )}
      {submissions.map((sub) => (
        <div key={sub.id} style={{ border: "1px solid #2a2a3e", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontWeight: "600", marginBottom: "8px" }}>{sub.question}</p>
          <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "4px" }}>Par : {sub.proposedByName}</p>
          <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "16px" }}>Résolution : {sub.resolutionDate}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => approveSubmission(sub)}
              style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              Approuver
            </button>
            <button
              onClick={() => rejectSubmission(sub.id)}
              style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}