import { useEffect, useState } from "react";

// L'événement « beforeinstallprompt » n'est émis qu'une fois, très tôt : on le garde au niveau du module.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// État d'installation de l'app (PWA) : bouton direct si le navigateur le permet, sinon explication.
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const install = async () => {
    if (!deferred) return false;
    const ev = deferred;
    deferred = null;
    notify();
    ev.prompt();
    try {
      const { outcome } = await ev.userChoice;
      return outcome === "accepted";
    } catch {
      return false;
    }
  };

  return {
    standalone: isStandalone(),
    canPrompt: !!deferred,
    ios: isIOS(),
    install,
  };
}
