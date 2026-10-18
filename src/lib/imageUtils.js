// Prépare une image avant l'envoi : la décode dans le navigateur, la réduit
// (1600 px max) et la réencode en JPEG standard. Un fichier que le navigateur
// ne sait pas lire (HEIC renommé en .jpeg, format de téléphone) échoue ici,
// avec un message clair, au lieu de produire une image cassée sur le site.
export async function prepareImageForUpload(file, maxSide = 1600, quality = 0.85) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("IMAGE_UNREADABLE");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("IMAGE_UNREADABLE");
  return blob;
}
