// Bonus quotidien : logique pure (dates à l'heure de Paris), testable sans Firestore.

export const DAILY_BASE = 10;   // points le premier jour
export const DAILY_STEP = 5;    // points de plus par jour de série
export const DAILY_MAX = 50;    // plafond, atteint au 9e jour de suite

export function parisDate(ms = Date.now()) {
  // "en-CA" donne le format AAAA-MM-JJ
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(ms));
}

export function previousDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

// Renvoie { claimed:false, streak } si déjà pris aujourd'hui, sinon { claimed:true, streak, bonus, today }
export function computeDaily(user, today = parisDate()) {
  const last = user.lastDailyDate || null;
  if (last === today) return { claimed: false, streak: user.dailyStreak || 1 };
  const streak = last === previousDay(today) ? (user.dailyStreak || 0) + 1 : 1;
  const bonus = Math.min(DAILY_BASE + DAILY_STEP * (streak - 1), DAILY_MAX);
  return { claimed: true, streak, bonus, today };
}
