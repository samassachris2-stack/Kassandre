// Génère une image carrée (1080x1080) représentant un pari Kassandre, puis
// propose de la partager sur Instagram Stories (mobile), Twitter, ou de la
// télécharger (desktop / fallback).
//
// Usage :
//   import { generateBetCardImage, shareToInstagramStories } from "../lib/shareCard.js";
//   const blob = await generateBetCardImage({ question, sideLabel, pct, sideColor });
//   shareToInstagramStories(blob);

const WIDTH = 1080;
const HEIGHT = 1080;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Génère une image carrée 1080x1080 du pari, retourne un Blob (image/png).
 *
 * @param {Object} params
 * @param {string} params.question - La question du marché
 * @param {string} params.sideLabel - "OUI" / "NON" / nom de l'option / nom de l'option multi
 * @param {number} params.pct - Pourcentage actuel (0-100)
 * @param {string} [params.sideColor] - Couleur hex pour le badge (défaut violet)
 * @param {string} [params.category] - Catégorie à afficher en haut (optionnel)
 */
export async function generateBetCardImage({ question, sideLabel, pct, sideColor = "#7c3aed", category }) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  // Fond sombre Kassandre
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Halo violet décoratif en haut à droite
  const gradient = ctx.createRadialGradient(WIDTH * 0.85, HEIGHT * 0.15, 0, WIDTH * 0.85, HEIGHT * 0.15, 500);
  gradient.addColorStop(0, "rgba(124,58,237,0.25)");
  gradient.addColorStop(1, "rgba(124,58,237,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Logo Kassandre (arc + point, comme la navbar)
  const logoX = 90;
  const logoY = 100;
  const logoR = 34;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(logoX, logoY, logoR, Math.PI * 0.15, Math.PI * 0.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(logoX, logoY, logoR, Math.PI * 1.15, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(logoX, logoY, 11, 0, Math.PI * 2);
  ctx.fill();

  // Wordmark "Kassandre"
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "600 44px -apple-system, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Kassandre", logoX + 55, logoY + 2);

  // Badge catégorie (optionnel)
  let cardTop = 280;
  if (category) {
    ctx.font = "600 26px -apple-system, system-ui, sans-serif";
    const catWidth = ctx.measureText(category).width;
    const catPadX = 24;
    ctx.fillStyle = "rgba(124,58,237,0.15)";
    roundRect(ctx, 90, 220, catWidth + catPadX * 2, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#a78bfa";
    ctx.fillText(category, 90 + catPadX, 220 + 26);
  }

  // Question (wrap automatique)
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "700 56px -apple-system, system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  const maxTextWidth = WIDTH - 180;
  const lines = wrapText(ctx, question, maxTextWidth).slice(0, 4);
  let textY = cardTop + 60;
  for (const line of lines) {
    ctx.fillText(line, 90, textY);
    textY += 68;
  }

  // Badge OUI/NON/option en grand, centré dans la partie basse
  const badgeY = 720;
  ctx.font = "800 200px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  const pctText = `${Math.round(pct)}%`;
  ctx.fillStyle = sideColor;
  ctx.fillText(pctText, 90, badgeY);

  ctx.font = "600 44px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#a8a8b8";
  ctx.fillText(`de chance que`, 90, badgeY + 60);

  ctx.font = "700 52px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = sideColor;
  ctx.fillText(sideLabel.toUpperCase(), 90, badgeY + 122);

  // Footer
  ctx.font = "500 32px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#6b6b80";
  ctx.fillText("kassandre.app", 90, HEIGHT - 70);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Tente d'ouvrir Instagram Stories avec l'image en arrière-plan (mobile uniquement).
 * Sur desktop ou si Instagram n'est pas installé, télécharge l'image avec des
 * instructions claires à la place.
 */
export function shareToInstagramStories(blob, { linkUrl } = {}) {
  if (!isMobileDevice()) {
    downloadImage(blob, "kassandre-pari.png");
    alert(
      "L'image a été téléchargée. Le partage direct vers Instagram Stories " +
      "n'est disponible que depuis un téléphone — ouvre cette page sur mobile, " +
      "ou ajoute l'image téléchargée manuellement à ta story."
    );
    return;
  }

  const file = new File([blob], "kassandre-pari.png", { type: "image/png" });

  // Web Share API niveau 2 : sur mobile, ça propose Instagram parmi les options
  // de partage natif si le navigateur et l'OS le supportent (Android Chrome,
  // iOS Safari récents). C'est le chemin le plus fiable aujourd'hui — le
  // protocole instagram-stories:// direct nécessite une app tierce native et
  // ne fonctionne pas correctement depuis un simple lien web.
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: "Mon pari sur Kassandre",
      text: linkUrl ? `Je parie sur Kassandre 👁 ${linkUrl}` : "Je parie sur Kassandre 👁",
    }).catch(() => {
      // L'utilisateur a annulé ou le partage a échoué : fallback téléchargement
      downloadImage(blob, "kassandre-pari.png");
    });
    return;
  }

  // Fallback : téléchargement + instructions
  downloadImage(blob, "kassandre-pari.png");
  alert(
    "L'image a été téléchargée dans tes fichiers. Ouvre Instagram, crée une " +
    "nouvelle story, et sélectionne cette image depuis ta galerie."
  );
}

function downloadImage(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
