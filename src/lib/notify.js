// Notifications et confirmations intégrées au site, en remplacement de
// alert() et confirm() du navigateur. Utilisable partout (composants et
// modules JS) ; l'affichage est assuré par <NotificationHost /> (monté dans App).

let listeners = new Set();
let state = { toasts: [], confirm: null };
let nextId = 1;

const emit = () => listeners.forEach((l) => l(state));

export const subscribe = (fn) => {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
};

export function dismissToast(id) {
  state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
  emit();
}

// type : "success" | "error" | "warning" | "info"
export function notify(message, type = "info") {
  const id = nextId++;
  const text = String(message ?? "");
  // On évite d'empiler dix fois le même message (clics répétés)
  if (state.toasts.some((t) => t.message === text && t.type === type)) return;
  state = { ...state, toasts: [...state.toasts.slice(-3), { id, message: text, type }] };
  emit();
  setTimeout(() => dismissToast(id), type === "error" ? 8000 : 5000);
}

export const notifySuccess = (m) => notify(m, "success");
export const notifyError = (m) => notify(m, "error");
export const notifyWarning = (m) => notify(m, "warning");

// Renvoie une promesse : true si l'utilisateur confirme, false sinon.
export function askConfirm(message, { confirmLabel = "Confirmer", danger = false } = {}) {
  return new Promise((resolve) => {
    // Une seule confirmation à la fois : la précédente est annulée
    state.confirm?.resolve(false);
    state = { ...state, confirm: { message, confirmLabel, danger, resolve } };
    emit();
  });
}

export function answerConfirm(value) {
  const c = state.confirm;
  if (!c) return;
  state = { ...state, confirm: null };
  emit();
  c.resolve(value);
}
