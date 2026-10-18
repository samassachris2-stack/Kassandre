// Écrit une adresse d'image pour un `background` CSS. Les guillemets sont
// indispensables : une adresse contenant des parenthèses (ex. photo(1).jpg,
// courant sur Windows) rend `url(...)` invalide et l'image n'apparaît pas.
export const cssUrl = (u) =>
  `url("${String(u ?? "").replace(/\\/g, "%5C").replace(/"/g, "%22").replace(/[\r\n]/g, "")}")`;

// Nom de fichier sûr pour Firebase Storage : sans espaces, accents ni parenthèses.
export const safeFileName = (name) =>
  String(name ?? "image")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "image";
