/**
 * Aide « comment utiliser » — boutique & inventaire.
 */

export function itemActivationInfo(item) {
  const sku = item?.sku || "";
  const cat = item?.category;
  if (sku === "scroll_rename" || sku === "vip_scroll_rename") {
    return "Parchemin de renommage. Allez dans Paramètres › Compte › Pseudo pour l'utiliser.";
  }
  if (sku === "scroll_class_change" || sku === "vip_scroll_mutation") {
    return "Crédite des changements de classe. Ouvrez votre Carte de Héros › bouton « Changer » à côté de la classe.";
  }
  if (sku === "key_chest_cosmic" || sku === "vip_key_divine" || sku === "vip_relic_box") {
    return "S'ouvre à l'achat : coffre garanti avec reliques dans l'onglet Reliques.";
  }
  if (sku === "summon_rift" || sku === "vip_rift_catalyst") {
    return "Invoque une faille dimensionnelle. Récupérez-la depuis la page Héros ou le Fil d'actualité.";
  }
  if (sku === "kingdom_inventory_slot") {
    return "+10 emplacements d'inventaire appliqués immédiatement.";
  }
  if (sku === "kingdom_aether_mine" || sku === "kingdom_treasury") {
    return "Génère des Écus passivement chaque jour, crédités à la connexion. Voir page Royaume.";
  }
  if (sku === "kingdom_throne_room") {
    return "Trône affiché sur votre profil et Carte de Héros.";
  }
  if (cat === "boost") {
    return "Effet actif après achat. Suivez le compte à rebours dans l'onglet Élixirs actifs.";
  }
  if (cat === "chest") {
    return "S'ouvre à l'achat. Les reliques obtenues apparaissent dans l'onglet Reliques.";
  }
  if (cat === "mount") {
    return "Équipez depuis l'onglet Montures (bouton « Équiper »). Visible dans le Nexus Online.";
  }
  if (cat === "aura") {
    return "Équipez depuis l'onglet Auras. Visible autour de votre avatar dans le Nexus Online.";
  }
  if (cat === "title") {
    return "Titre débloqué. Modifiez-le dans Paramètres › Profil ou Carte de Héros › Personnaliser.";
  }
  if (cat === "pass") {
    return "Avantage saisonnier actif pendant la saison en cours. Récompenses de fin de saison doublées.";
  }
  if (cat === "kingdom") {
    return "Avantage permanent. Retrouvez le détail sur la page Royaume.";
  }
  if (cat === "cosmetic") {
    if (sku.startsWith("frame_")) {
      return "Cadre de profil. Équipez-le ici (onglet Cosmétiques) ou via Carte de Héros › Personnaliser.";
    }
    if (sku.startsWith("banner_")) {
      return "Bannière de profil. Équipez-la ici (onglet Cosmétiques) ou via Paramètres › Profil.";
    }
    return "Cosmétique débloqué. Équipez-le depuis l'onglet Cosmétiques ou votre Carte de Héros.";
  }
  if (item?.grant_xp) {
    return "Consommable instantané : l'XP est créditée dès l'achat en boutique.";
  }
  return "Article débloqué pour votre compte. Consultez l'onglet correspondant dans l'Inventaire.";
}

const RELIC_TYPE_HINTS = {
  weapon: "Arme de collection. Affichée sur votre Carte de Héros (onglet Inventaire). Cliquez sur la carte ici pour l'offrir ou l'échanger.",
  armor: "Armure de collection. Visible sur la Carte de Héros. Cliquez sur la carte pour offrir ou proposer un échange.",
  accessory: "Accessoire de collection. Montre votre progression sur la Carte de Héros. Offrable / échangeable ici.",
  material: "Matériau de craft. Utilisez-le à la Forge du Nexus (/craft) pour forger des reliques. Échangeable entre joueurs.",
  consumable: "Objet consommable de collection (coffres Nexus). Pas d'utilisation manuelle pour l'instant — trophée de collection.",
  tome: "Tome rare. Prestige sur la Carte de Héros. Peut servir aux quêtes de collection à venir.",
  relic: "Relique prestigieuse. Affichée sur la Carte de Héros et compte pour les badges de collection. Offrable / échangeable.",
};

export function relicUsageInfo(item) {
  const type = (item?.type || "relic").toLowerCase();
  const base = RELIC_TYPE_HINTS[type] || RELIC_TYPE_HINTS.relic;
  const sources = [];
  if (item?.quantity > 1) sources.push("Les doublons peuvent être compactés avec le bouton « Compacter ».");
  return [base, ...sources].join(" ");
}

export function shopOwnedUsageInfo(tab, sku, meta) {
  if (meta?.sku || meta?.category) return itemActivationInfo(meta);
  if (tab === "cosmetics") {
    if (sku?.startsWith("frame_")) {
      return "Cadre de profil. Bouton « Équiper » — visible sur la Carte de Héros et le profil public.";
    }
    if (sku?.startsWith("banner_")) {
      return "Bannière de profil. Bouton « Équiper » — fond décoratif du profil.";
    }
    return "Cosmétique possédé. Utilisez le bouton Équiper sur cette carte.";
  }
  if (tab === "boosts") return "Élixir actif en cours. L'effet (XP, loot…) s'applique automatiquement jusqu'à expiration.";
  if (tab === "consumables") return itemActivationInfo({ sku, category: "consumable", ...meta });
  if (tab === "perks") return "Avantage Royaume permanent. Détail sur la page Royaume — effet passif automatique.";
  if (tab === "mounts") return "Monture possédée. Bouton « Équiper la monture » — visible dans le Nexus Online.";
  if (tab === "auras") return "Aura possédée. Bouton « Équiper l'aura » — halo autour de vous dans le Nexus Online.";
  return "Objet possédé. Consultez les boutons d'action sur cette carte.";
}

export const INVENTORY_TAB_GUIDE = {
  relics: {
    title: "Reliques",
    summary: "Trophées obtenus via coffres, Nexus Online, quêtes et événements.",
    steps: [
      "Cliquez sur une relique → Offrir (don gratuit) ou Échanger (contrepartie négociée).",
      "« Briser un sceau » (50 Écus) ouvre un coffre aléatoire.",
      "« Compacter » fusionne les doublons identiques.",
      "Votre collection est visible sur la Carte de Héros (cliquez votre pseudo ou avatar Nexus).",
      "Certaines quêtes et badges demandent de collecter des reliques rares.",
    ],
  },
  cosmetics: {
    title: "Cosmétiques",
    summary: "Cadres et bannières de profil achetés en boutique.",
    steps: [
      "Bouton « Équiper » sur chaque carte — effet immédiat.",
      "Cadre : contour de votre Carte de Héros et profil public.",
      "Bannière : fond décoratif du profil (Paramètres › Profil).",
      "Alternative : Carte de Héros › onglet Personnaliser.",
    ],
  },
  boosts: {
    title: "Élixirs actifs",
    summary: "Bonus temporaires (XP, loot…) en cours d'effet.",
    steps: [
      "Appliqués automatiquement à l'achat — rien à cliquer.",
      "La date d'expiration s'affiche sur chaque carte.",
      "Pendant l'effet : bonus actif sur le site (XP, drops… selon l'élixir).",
    ],
  },
  consumables: {
    title: "Consommables",
    summary: "Parchemins, clés et objets à usage unique ou différé.",
    steps: [
      "Parchemin de renommage → Paramètres › Compte › Pseudo.",
      "Parchemin de classe → Carte de Héros › « Changer » (classe).",
      "Clé de coffre cosmique → s'ouvre à l'achat, reliques dans l'onglet Reliques.",
      "Faille invoquée → page Héros ou Fil pour la réclamer.",
      "Tomes VIP (XP instantanée) → crédités dès l'achat en boutique.",
    ],
  },
  perks: {
    title: "Royaume",
    summary: "Avantages permanents du Royaume (trésor, mine, trône…).",
    steps: [
      "Effets passifs automatiques (Écus/jour, emplacements inventaire…).",
      "Consultez la page Royaume pour le détail de chaque bâtiment.",
      "Le trône royal apparaît sur votre profil public.",
    ],
  },
  mounts: {
    title: "Montures",
    summary: "Compagnons visibles dans le Nexus Online.",
    steps: [
      "Bouton « Équiper la monture » sur la carte possédée.",
      "Visible aux autres joueurs quand vous êtes dans le Nexus Online.",
      "Une seule monture active à la fois.",
    ],
  },
  auras: {
    title: "Auras",
    summary: "Effets lumineux autour de votre avatar Nexus.",
    steps: [
      "Bouton « Équiper l'aura » sur la carte possédée.",
      "Visible en temps réel dans le Nexus Online pour les autres héros.",
      "Une seule aura active à la fois.",
    ],
  },
};

export const INVENTORY_ACTIONS_GUIDE = [
  {
    title: "Briser un sceau (50 Écus)",
    text: "Ouvre un coffre aléatoire. Les reliques obtenues apparaissent dans l'onglet Reliques. Si vous possédez déjà tout le pool, les Écus vous sont restitués.",
  },
  {
    title: "Compacter",
    text: "Fusionne les reliques en double (même objet, plusieurs exemplaires) en une seule pile avec compteur ×N.",
  },
  {
    title: "Envoyer des Écus",
    text: "Transfert direct de monnaie à un autre joueur (par pseudo). Instantané et irréversible.",
  },
  {
    title: "Échanges",
    text: "Proposez ou acceptez des échanges reliques ↔ reliques / Écus. Les objets sont mis en réserve jusqu'à acceptation ou refus (48 h max).",
  },
];

export const INVENTORY_SOURCES_GUIDE = [
  { title: "Boutique des Écus", text: "Coffres, cosmétiques, montures, consommables." },
  { title: "Nexus Online", text: "Ramassez les reliques au sol (clic) dans les salles du monde." },
  { title: "Roue du Nexus", text: "Tours quotidiens — Poussière cosmique, Cristal du Nexus, etc." },
  { title: "Forge du Nexus", text: "Page /craft — combinez vos matériaux pour forger des objets uniques." },
  { title: "Quêtes & événements", text: "Récompenses de quêtes journalières, hebdo et événements staff." },
  { title: "Combat (Arène)", text: "XP, Écus et ressources de craft en vainquant les ennemis de l'Arène du Nexus." },
  { title: "Failles dimensionnelles", text: "Réclamez-les depuis la page Héros quand une faille est active." },
];

/** Guide Forge du Nexus — affiché sur /craft */
export const CRAFT_GUIDE = {
  intro: "La Forge du Nexus transforme vos matériaux en reliques. Chaque tentative coûte des ressources et des Écus. Le résultat dépend du taux de réussite de la recette.",
  steps: [
    "Vérifiez vos ressources en haut de page et votre solde d'Écus.",
    "Choisissez une recette : les lignes rouges indiquent les matériaux manquants.",
    "Consultez le taux de réussite (%) affiché sur la carte.",
    "Cliquez sur « Forger » — le serveur valide tout côté backend.",
    "Succès : l'objet apparaît dans votre Inventaire (onglet Reliques).",
    "Échec : ressources et Écus sont consommés ; vous recevez 2× Poussière cosmique en compensation.",
  ],
  resources: [
    { name: "Poussière cosmique", source: "Coffres (Briser un sceau, boutique, roue), combat Rat d'ombre, roue, échec de forge." },
    { name: "Cristal du Nexus", source: "Coffres (épique+), Roue du Nexus." },
    { name: "Acier sombre", source: "Coffres (rare+), combat Garde corrompu, Roue du Nexus." },
    { name: "Essence arcanique", source: "Coffres (rare+), combat Spectre mineur." },
    { name: "Fragment ancien", source: "Coffres (épique+), combat Golem fissuré." },
    { name: "Cœur d'ombre", source: "Coffres (légendaire+), combat Garde/Golem, Roue du Nexus." },
  ],
  successRates: [
    { rarity: "Commun", rate: "100%", color: "#9CA3AF" },
    { rarity: "Rare", rate: "80%", color: "#3B82F6" },
    { rarity: "Épique", rate: "55%", color: "#9D4CDD" },
    { rarity: "Légendaire", rate: "25%", color: "#F97316" },
  ],
  tips: [
    "Les matériaux obtenus en combat ou à la roue sont aussi visibles dans l'Inventaire (type matériau).",
    "L'historique en bas de page liste vos dernières tentatives.",
    "Certaines recettes ont un délai entre deux forgements (cooldown).",
    "Tout est calculé côté serveur : impossible de forger sans ressources ou Écus suffisants.",
    "Progression : paliers (Apprenti → Grand Maître), badges forge et quêtes quotidiennes/hebdo/mensuelles.",
    "Les paliers récompensent Écus, XP et badges — consultez la section « Paliers & récompenses » sur /craft.",
  ],
};
