import { translateTitle } from "@/lib/translate-game";

/** @deprecated Use translateTitle(t, id) — kept for non-React callers without i18n. */
export const TITLE_NAMES = {
  novice: "Novice",
  voyageur: "Voyageur",
  veteran: "Vétéran",
  maitre_ombres: "Maître des Ombres",
  seigneur_temps: "Seigneur du Temps",
  roi_createurs: "Roi des Créateurs",
  legende_vivante: "Légende Vivante",
  elu_cosmique: "Élu Cosmique",
  starforged: "Forgé des Étoiles",
  void_walker: "Marcheur du Vide",
  ambassadeur_nexus: "Ambassadeur du Nexus",
  ascendant_nexus: "Ascendant du Nexus",
  beta_tester: "Beta Testeur",
};

/** Resolve a title ID (or user object) to a display label. Pass `t` from useI18n() when available. */
export function getTitleLabel(titleOrUser, resolvedName, t) {
  if (titleOrUser && typeof titleOrUser === "object") {
    const u = titleOrUser;
    if (u.active_title_name && !t) return u.active_title_name;
    if (u.active_title) return getTitleLabel(u.active_title, u.active_title_name, t);
    if (u.active_title_name) return u.active_title_name;
  }
  const id = typeof titleOrUser === "string" ? titleOrUser : "novice";
  if (t) return translateTitle(t, id, resolvedName);
  if (resolvedName) return resolvedName;
  return TITLE_NAMES[id] || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
