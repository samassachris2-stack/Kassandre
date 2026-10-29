import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { prepareImageForUpload } from "./imageUtils";

// Remplace les images intégrées en base64 (collage depuis le clavier ou le
// presse-papiers d'un téléphone) par des fichiers envoyés vers Storage.
// Un article qui les garde dépasse vite la limite d'1 Mo de Firestore.
export async function externalizeDataImages(html) {
  const src = String(html || "");
  const re = /(<img\b[^>]*?\ssrc=)(["'])(data:image\/[^"']+)\2/gi;
  const found = [...src.matchAll(re)];
  if (!found.length) return src;
  const urls = new Map();
  for (const m of found) {
    const data = m[3];
    if (urls.has(data)) continue;
    const file = await (await fetch(data)).blob();
    const blob = await prepareImageForUpload(file).catch(() => file);
    const r = ref(storage, `blog-images/${Date.now()}_${urls.size}.jpg`);
    await uploadBytes(r, blob, { contentType: blob.type || "image/jpeg" });
    urls.set(data, await getDownloadURL(r));
  }
  return src.replace(re, (_, pre, q, data) => `${pre}${q}${urls.get(data)}${q}`);
}
