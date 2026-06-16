/** French display names for title IDs (mirrors backend/game_data.py TITLES). */
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
};

/** Resolve a title ID (or user object) to its French label. */
export function getTitleLabel(titleOrUser, resolvedName) {
  if (titleOrUser && typeof titleOrUser === "object") {
    const u = titleOrUser;
    if (u.active_title_name) return u.active_title_name;
    return getTitleLabel(u.active_title);
  }
  if (resolvedName) return resolvedName;
  const id = titleOrUser || "novice";
  return TITLE_NAMES[id] || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
