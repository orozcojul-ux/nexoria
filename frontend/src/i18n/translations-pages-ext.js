import { T } from "./translations.js";

/** Extended page UI strings — kingdom, guilds, craft, forum, tickets, etc. */
export const TRANSLATIONS_PAGES_EXT = {
  // ─── Kingdom ───
  "kingdom.buildingsTitle": T("Édifices", "Buildings"),
  "kingdom.buildingsSubtitle": T("Développez votre domaine", "Expand your domain"),
  "kingdom.rank": T("Rang", "Rank"),
  "kingdom.unlockedAt": T("Sceau levé au niveau {level}", "Unlocked at level {level}"),
  "kingdom.ennoble": T("Ennoblir ({cost} Écus)", "Upgrade ({cost} Écus)"),
  "kingdom.upgradeSuccess": T("Édifice ennobli au rang {level} (-{cost} Écus)", "Building upgraded to rank {level} (-{cost} Écus)"),
  "kingdom.upgradeFailed": T("Les fondations résistent...", "The foundations resist..."),

  // ─── Skills ───
  "skills.starsToLight": T("Étoiles à allumer", "Stars to light"),
  "skills.heart": T("Cœur", "Heart"),
  "skills.stars": T("Étoiles", "Stars"),
  "skills.lightStar": T("+ Allumer une étoile", "+ Light a star"),
  "skills.noPoints": T("Aucune étoile à allumer. Montez en niveau...", "No stars to light. Level up..."),
  "skills.allocated": T("Une étoile s'éveille dans votre constellation", "A star awakens in your constellation"),

  // ─── Leaderboards ───
  "leaderboards.activeRanking": T("Classement actif", "Active ranking", {
    es: "Clasificación activa", de: "Aktive Rangliste", it: "Classifica attiva", pt: "Ranking ativo", nl: "Actieve ranglijst", ja: "現在のランキング",
  }),
  "leaderboards.heroesCount": T("{count} héros", "{count} heroes", {
    es: "{count} héroes", de: "{count} Helden", it: "{count} eroi", pt: "{count} heróis", nl: "{count} helden", ja: "{count} 人の英雄",
  }),
  "leaderboards.heroesCount_one": T("{count} héros", "{count} hero", {
    es: "{count} héroe", de: "{count} Held", it: "{count} eroe", pt: "{count} herói", nl: "{count} held", ja: "{count} 人の英雄",
  }),
  "leaderboards.heroesCount_other": T("{count} héros", "{count} heroes", {
    es: "{count} héroes", de: "{count} Helden", it: "{count} eroi", pt: "{count} heróis", nl: "{count} helden", ja: "{count} 人の英雄",
  }),
  "leaderboards.topHero": T("N°1", "#1", {
    es: "N.º 1", de: "Nr. 1", it: "N. 1", pt: "N.º 1", nl: "Nr. 1", ja: "第1位",
  }),
  "leaderboards.ranked": T("{count} classés", "{count} ranked", {
    es: "{count} clasificados", de: "{count} platziert", it: "{count} classificati", pt: "{count} classificados", nl: "{count} gerangschikt", ja: "{count} 人ランクイン",
  }),
  "leaderboards.ranked_one": T("{count} classé", "{count} ranked", {
    es: "{count} clasificado", de: "{count} platziert", it: "{count} classificato", pt: "{count} classificado", nl: "{count} gerangschikt", ja: "{count} 人ランクイン",
  }),
  "leaderboards.ranked_other": T("{count} classés", "{count} ranked", {
    es: "{count} clasificados", de: "{count} platziert", it: "{count} classificati", pt: "{count} classificados", nl: "{count} gerangschikt", ja: "{count} 人ランクイン",
  }),
  "leaderboards.live": T("En direct", "Live", {
    es: "En vivo", de: "Live", it: "Live", pt: "Ao vivo", nl: "Live", ja: "ライブ",
  }),
  "leaderboards.podium": T("Podium", "Podium", {
    es: "Podio", de: "Podium", it: "Podio", pt: "Pódio", nl: "Podium", ja: "表彰台",
  }),
  "leaderboards.detailed": T("Classement détaillé", "Detailed ranking", {
    es: "Clasificación detallada", de: "Detaillierte Rangliste", it: "Classifica dettagliata", pt: "Ranking detalhado", nl: "Gedetailleerde ranglijst", ja: "詳細ランキング",
  }),
  "leaderboards.compiling": T("Compilation des annales...", "Compiling the annals...", {
    es: "Compilando anales...", de: "Annalen werden zusammengestellt...", it: "Compilazione degli annali...", pt: "Compilando anais...", nl: "Annalen worden samengesteld...", ja: "年代記を編纂中…",
  }),
  "leaderboards.onlyTopThree": T("Seuls les trois premiers trônent pour l'instant.", "Only the top three reign for now.", {
    es: "Por ahora solo reinan los tres primeros.", de: "Derzeit regieren nur die Top Drei.", it: "Per ora trionfano solo i primi tre.", pt: "Por agora apenas os três primeiros reinam.", nl: "Voorlopig regeren alleen de top drie.", ja: "現在は上位3名のみが君臨しています。",
  }),
  "leaderboards.emptyRanking": T("Le classement est vide.", "The ranking is empty.", {
    es: "La clasificación está vacía.", de: "Die Rangliste ist leer.", it: "La classifica è vuota.", pt: "O ranking está vazio.", nl: "De ranglijst is leeg.", ja: "ランキングは空です。",
  }),
  "leaderboards.noRanked": T("Aucun héros classé pour l'instant.", "No heroes ranked yet.", {
    es: "Ningún héroe clasificado por ahora.", de: "Noch keine Helden platziert.", it: "Nessun eroe classificato per ora.", pt: "Nenhum herói classificado ainda.", nl: "Nog geen helden gerangschikt.", ja: "まだランクインした英雄はいません。",
  }),
  "leaderboards.cat.xp": T("Expérience", "Experience", {
    es: "Experiencia", de: "Erfahrung", it: "Esperienza", pt: "Experiência", nl: "Ervaring", ja: "経験値",
  }),
  "leaderboards.cat.level": T("Rang", "Rank", {
    es: "Rango", de: "Rang", it: "Grado", pt: "Nível", nl: "Rang", ja: "ランク",
  }),
  "leaderboards.cat.reputation": T("Réputation", "Reputation", {
    es: "Reputación", de: "Ruf", it: "Reputazione", pt: "Reputação", nl: "Reputatie", ja: "評判",
  }),
  "leaderboards.cat.aether": T("Écus", "Écus", {
    es: "Écus", de: "Écus", it: "Écus", pt: "Écus", nl: "Écus", ja: "Écus",
  }),
  "leaderboards.suffix.level": T("Niv.", "Lv.", {
    es: "Nv.", de: "St.", it: "Lv.", pt: "Nv.", nl: "Niv.", ja: "Lv.",
  }),

  // ─── Nexus ───
  "nexusOnline.siteAccessible": T("Le reste du site reste accessible — feed, forum, boutique, etc.", "The rest of the site remains accessible — feed, forum, shop, etc."),
  "nexusOnline.connected": T("Connecté au royaume", "Connected to the realm"),
  "nexusOnline.connectingShort": T("Connexion...", "Connecting..."),
  "nexusOnline.serverError": T("Serveur inaccessible — vérifiez que le backend tourne sur :8000", "Server unreachable — check that the backend runs on :8000"),
  "nexusOnline.offline": T("Hors ligne", "Offline"),
  "nexusOnline.activeRooms": T("Salles actives", "Active rooms"),
  "nexusOnline.status": T("Statut", "Status"),
  "nexusOnline.closed": T("Fermé", "Closed"),
  "nexusOnline.isometricNote": T("Le monde isométrique s'ouvre en plein écran lors des événements. Le serveur Nexus n'est pas ouvert en permanence.", "The isometric world opens fullscreen during events. The Nexus server is not always open."),

  // ─── Guilds ───
  "guilds.founded": T("L'ordre « {name} » est fondé !", "The order « {name} » has been founded!"),
  "guilds.disbanded": T("L'ordre a été dissous", "The order has been disbanded"),
  "guilds.left": T("Vous avez quitté l'ordre", "You left the order"),
  "guilds.leaveConfirm": T("Quitter cet ordre ?", "Leave this order?"),
  "guilds.allOrders": T("Tous les ordres", "All orders"),
  "guilds.invite": T("Inviter", "Invite"),
  "guilds.abandon": T("Abandonner", "Abandon"),
  "guilds.level": T("Niveau {level}", "Level {level}"),
  "guilds.vault": T("Coffre : {amount} ✦", "Vault: {amount} ✦"),
  "guilds.kickSuccess": T("Membre exclu", "Member removed"),
  "guilds.kickTitle": T("Exclure", "Remove"),
  "guilds.promoted": T("Promu {role}", "Promoted to {role}"),
  "guilds.changeRole": T("Changer rôle", "Change role"),
  "guilds.role.chef": T("Chef", "Leader"),
  "guilds.role.officier": T("Officier", "Officer"),
  "guilds.role.membre": T("Membre", "Member"),
  "guilds.chatEmpty": T("Aucun message — entamez la conversation", "No messages — start the conversation"),
  "guilds.chatPlaceholder": T("Parler à l'ordre...", "Speak to the order..."),
  "guilds.depositSuccess": T("Dépôt effectué", "Deposit completed"),
  "guilds.chooseMember": T("Choisir un membre", "Choose a member"),
  "guilds.rewardSuccess": T("Récompense versée", "Reward sent"),
  "guilds.commonVault": T("Coffre commun", "Common vault"),
  "guilds.depositXp": T("Déposer (gagne de l'XP pour l'ordre)", "Deposit (earns XP for the order)"),
  "guilds.rewardMember": T("Récompenser un membre", "Reward a member"),
  "guilds.chooseMemberPlaceholder": T("Choisir un membre...", "Choose a member..."),
  "guilds.reward": T("Récompenser", "Reward"),
  "guilds.inviteTitle": T("Inviter un héros", "Invite a hero"),
  "guilds.exactUsername": T("Pseudo exact", "Exact username"),
  "guilds.inviteSent": T("Invitation envoyée à {name}", "Invitation sent to {name}"),
  "guilds.bannerSub": T("Unissez-vous et fondez un ordre dont le nom résonnera dans l'éternité.", "Unite and found an order whose name will echo through eternity."),
  "guilds.foundOrder": T("+ Fonder un Ordre", "+ Found an Order"),
  "guilds.pulseTitle": T("Pulse des Ordres", "Orders Pulse"),
  "guilds.pulseSub": T("Vue globale", "Global view"),
  "guilds.stat.founded": T("Ordres fondés", "Orders founded"),
  "guilds.stat.enrolled": T("Héros enrôlés", "Heroes enrolled"),
  "guilds.stat.dominant": T("Ordre dominant", "Dominant order"),
  "guilds.stat.invitations": T("Invitations", "Invitations"),
  "guilds.existingOrders": T("Ordres existants", "Existing orders"),
  "guilds.bannerCount": T("{count} bannière(s)", "{count} banner(s)"),
  "guilds.bannerCount_one": T("{count} bannière", "{count} banner"),
  "guilds.bannerCount_other": T("{count} bannière(s)", "{count} banners"),
  "guilds.noOrdersYet": T("Aucun ordre n'a encore été fondé…", "No order has been founded yet…"),
  "guilds.beFirst": T("Sois le premier à hisser ta bannière.", "Be the first to raise your banner."),
  "guilds.myOrder": T("Mon ordre", "My order"),
  "guilds.heroCount": T("{count} héros", "{count} heroes"),
  "guilds.heroCount_one": T("{count} héros", "{count} hero"),
  "guilds.heroCount_other": T("{count} héros", "{count} heroes"),

  // ─── Craft ───
  "craft.ecus": T("Écus", "Écus"),
  "craft.category": T("Catégorie", "Category"),
  "craft.cat.all": T("Toutes", "All"),
  "craft.cat.weapon": T("Armes", "Weapons"),
  "craft.cat.accessory": T("Accessoires", "Accessories"),
  "craft.cat.consumable": T("Consommables", "Consumables"),
  "craft.rarity.all": T("Toutes", "All"),
  "craft.rarity.rare": T("Rare", "Rare"),
  "craft.rarity.epic": T("Épique", "Epic"),
  "craft.rarity.legendary": T("Légendaire", "Legendary"),
  "craft.forgeSuccess": T("Forge réussie — « {name} » créé !", "Forge successful — « {name} » created!"),
  "craft.forgeFail": T("Échec de forge — {name} ×{qty} en compensation", "Forge failed — {name} ×{qty} as compensation"),
  "craft.cosmicDust": T("Poussière cosmique", "Cosmic dust"),
  "craft.forgeImpossible": T("Forge impossible", "Cannot forge"),
  "craft.resultSuccess": T("Succès — {name} ajouté à votre inventaire.", "Success — {name} added to your inventory."),
  "craft.resultFail": T("Échec — ressources consommées. Compensation : {name} ×{qty}", "Failed — resources consumed. Compensation: {name} ×{qty}"),
  "craft.noRecipes": T("Aucune recette pour ces filtres.", "No recipes for these filters."),
  "craft.recentForge": T("Forge récente", "Recent forges"),
  "craft.noHistory": T("Aucun craft pour le moment.", "No crafts yet."),
  "craft.resourcesLabel": T("Ressources", "Resources"),
  "craft.successRate": T("{rate}% réussite", "{rate}% success rate"),
  "craft.insufficientEcus": T("Écus insuffisants", "Insufficient Écus"),
  "craft.missingResources": T("Ressources manquantes", "Missing resources"),
  "craft.forging": T("Forge en cours…", "Forging…"),
  "craft.tierLabel": T("Palier forge", "Forge tier"),
  "craft.nextTier": T("Prochain : {label} ({current}/{min} tentatives)", "Next: {label} ({current}/{min} attempts)"),
  "craft.attempts": T("Tentatives", "Attempts"),
  "craft.successes": T("Réussites", "Successes"),
  "craft.failures": T("Échecs", "Failures"),
  "craft.milestones": T("Paliers & récompenses", "Tiers & rewards"),
  "craft.metric.attempts": T("tentatives", "attempts"),
  "craft.metric.successes": T("réussites", "successes"),
  "craft.metric.legendary_successes": T("forges légendaires", "legendary forges"),
  "craft.milestone.obtained": T("Obtenu", "Obtained"),
  "craft.milestone.unlocked": T("Débloqué", "Unlocked"),
  "craft.guide.title": T("Comment fonctionne la Forge ?", "How does the Forge work?"),
  "craft.guide.fullTitle": T("Guide complet", "Full guide"),
  "craft.guide.collapse": T("Replier le guide", "Collapse guide"),
  "craft.guide.expand": T("Déplier le guide", "Expand guide"),
  "craft.guide.modalTitle": T("Guide de la Forge du Nexus", "Nexus Forge guide"),
  "craft.guide.steps": T("Étapes", "Steps"),
  "craft.guide.rates": T("Taux de réussite", "Success rates"),
  "craft.guide.failNote": T("En cas d'échec, ressources et Écus sont perdus. Compensation : 2× Poussière cosmique.", "On failure, resources and Écus are lost. Compensation: 2× Cosmic dust."),
  "craft.guide.sources": T("Où obtenir les ressources", "Where to get resources"),
  "craft.guide.resourceSources": T("Sources de ressources", "Resource sources"),
  "craft.guide.tips": T("Bon à savoir", "Good to know"),
  "craft.guide.intro": T("La Forge du Nexus transforme vos matériaux en reliques. Chaque tentative coûte des ressources et des Écus. Le résultat dépend du taux de réussite de la recette.", "The Nexus Forge transforms your materials into relics. Each attempt costs resources and Écus. The outcome depends on the recipe's success rate."),
  "craft.guide.step0": T("Vérifiez vos ressources en haut de page et votre solde d'Écus.", "Check your resources at the top and your Écus balance."),
  "craft.guide.step1": T("Choisissez une recette : les lignes rouges indiquent les matériaux manquants.", "Choose a recipe: red lines indicate missing materials."),
  "craft.guide.step2": T("Consultez le taux de réussite (%) affiché sur la carte.", "Check the success rate (%) shown on the card."),
  "craft.guide.step3": T("Cliquez sur « Forger » — le serveur valide tout côté backend.", "Click « Craft » — the server validates everything on the backend."),
  "craft.guide.step4": T("Succès : l'objet apparaît dans votre Inventaire (onglet Reliques).", "Success: the item appears in your Inventory (Relics tab)."),
  "craft.guide.step5": T("Échec : ressources et Écus sont consommés ; vous recevez 2× Poussière cosmique en compensation.", "Failure: resources and Écus are consumed; you receive 2× Cosmic dust as compensation."),
  "craft.guide.tip0": T("Les matériaux obtenus en combat ou à la roue sont aussi visibles dans l'Inventaire (type matériau).", "Materials from combat or the wheel are also visible in Inventory (material type)."),
  "craft.guide.tip1": T("L'historique en bas de page liste vos dernières tentatives.", "History at the bottom lists your recent attempts."),
  "craft.guide.tip2": T("Certaines recettes ont un délai entre deux forgements (cooldown).", "Some recipes have a cooldown between forges."),
  "craft.guide.tip3": T("Tout est calculé côté serveur : impossible de forger sans ressources ou Écus suffisants.", "Everything is server-side: you cannot forge without enough resources or Écus."),
  "craft.guide.tip4": T("Progression : paliers (Apprenti → Grand Maître), badges forge et quêtes quotidiennes/hebdo/mensuelles.", "Progression: tiers (Apprentice → Grand Master), forge badges and daily/weekly/monthly quests."),
  "craft.guide.tip5": T("Les paliers récompensent Écus, XP et badges — consultez la section « Paliers & récompenses » sur /craft.", "Tiers reward Écus, XP and badges — see « Tiers & rewards » on /craft."),
  "craft.guide.res.dust": T("Coffres (Briser un sceau, boutique, roue), combat Rat d'ombre, roue, échec de forge.", "Chests (Break seal, shop, wheel), Shadow Rat combat, wheel, forge failure."),
  "craft.guide.res.crystal": T("Cristal du Nexus", "Nexus Crystal"),
  "craft.guide.res.crystalSrc": T("Coffres (épique+), Roue du Nexus.", "Chests (epic+), Nexus Wheel."),
  "craft.guide.res.steel": T("Acier sombre", "Dark Steel"),
  "craft.guide.res.steelSrc": T("Coffres (rare+), combat Garde corrompu, Roue du Nexus.", "Chests (rare+), Corrupted Guard combat, Nexus Wheel."),
  "craft.guide.res.essence": T("Essence arcanique", "Arcane Essence"),
  "craft.guide.res.essenceSrc": T("Coffres (rare+), combat Spectre mineur.", "Chests (rare+), Minor Specter combat."),
  "craft.guide.res.fragment": T("Fragment ancien", "Ancient Fragment"),
  "craft.guide.res.fragmentSrc": T("Coffres (épique+), combat Golem fissuré.", "Chests (epic+), Cracked Golem combat."),
  "craft.guide.res.heart": T("Cœur d'ombre", "Shadow Heart"),
  "craft.guide.res.heartSrc": T("Coffres (légendaire+), combat Garde/Golem, Roue du Nexus.", "Chests (legendary+), Guard/Golem combat, Nexus Wheel."),

  // ─── Tickets ───
  "tickets.count": T("{count} ticket", "{count} ticket"),
  "tickets.count_one": T("{count} ticket", "{count} ticket"),
  "tickets.count_other": T("{count} tickets", "{count} tickets"),
  "tickets.inProgress": T("{count} en cours", "{count} in progress"),
  "tickets.inProgress_one": T("{count} en cours", "{count} in progress"),
  "tickets.inProgress_other": T("{count} en cours", "{count} in progress"),
  "tickets.emptyHint": T("Ouvre un ticket si tu as besoin d'aide.", "Open a ticket if you need help."),
  "tickets.createTitle": T("Ouvrir un ticket", "Open a ticket"),
  "tickets.category": T("Catégorie", "Category"),
  "tickets.cat.general": T("Général", "General"),
  "tickets.cat.bug": T("Anomalie / Bug", "Issue / Bug"),
  "tickets.cat.account": T("Compte", "Account"),
  "tickets.cat.other": T("Autre", "Other"),
  "tickets.subjectPlaceholder": T("Décrivez brièvement votre demande...", "Briefly describe your request..."),
  "tickets.bodyPlaceholder": T("Détaillez votre problème ou question...", "Detail your issue or question..."),
  "tickets.submit": T("Envoyer le ticket", "Submit ticket"),
  "tickets.sent": T("Ticket envoyé — l'équipe te répondra bientôt", "Ticket sent — the team will reply soon"),
  "tickets.status.in_progress": T("En cours", "In progress"),
  "tickets.status.resolved": T("Résolu", "Resolved"),
  "tickets.statusChanged": T("Statut : {status}", "Status: {status}"),
  "tickets.loading": T("Chargement...", "Loading..."),
  "tickets.myTickets": T("Mes tickets", "My tickets"),
  "tickets.support": T("Support", "Support"),
  "tickets.replyPlaceholder": T("Ajouter un message...", "Add a message..."),
  "tickets.markResolved": T("Marquer comme résolu", "Mark as resolved"),

  // ─── Friends ───
  "friends.companionCount": T("{count} compagnon", "{count} companion", {
    es: "{count} compañero", de: "{count} Gefährte", it: "{count} compagno", pt: "{count} companheiro", nl: "{count} metgezel", ja: "{count} 人の仲間",
  }),
  "friends.companionCount_one": T("{count} compagnon", "{count} companion", {
    es: "{count} compañero", de: "{count} Gefährte", it: "{count} compagno", pt: "{count} companheiro", nl: "{count} metgezel", ja: "{count} 人の仲間",
  }),
  "friends.companionCount_other": T("{count} compagnons", "{count} companions", {
    es: "{count} compañeros", de: "{count} Gefährten", it: "{count} compagni", pt: "{count} companheiros", nl: "{count} metgezellen", ja: "{count} 人の仲間",
  }),
  "friends.onlineCount": T("{count} en ligne", "{count} online", {
    es: "{count} en línea", de: "{count} online", it: "{count} online", pt: "{count} online", nl: "{count} online", ja: "{count} 人オンライン",
  }),
  "friends.onlineCount_one": T("{count} en ligne", "{count} online", {
    es: "{count} en línea", de: "{count} online", it: "{count} online", pt: "{count} online", nl: "{count} online", ja: "{count} 人オンライン",
  }),
  "friends.onlineCount_other": T("{count} en ligne", "{count} online", {
    es: "{count} en línea", de: "{count} online", it: "{count} online", pt: "{count} online", nl: "{count} online", ja: "{count} 人オンライン",
  }),
  "friends.receivedCount": T("{count} reçue", "{count} received", {
    es: "{count} recibida", de: "{count} erhalten", it: "{count} ricevuta", pt: "{count} recebida", nl: "{count} ontvangen", ja: "{count} 件受信",
  }),
  "friends.receivedCount_one": T("{count} reçue", "{count} received", {
    es: "{count} recibida", de: "{count} erhalten", it: "{count} ricevuta", pt: "{count} recebida", nl: "{count} ontvangen", ja: "{count} 件受信",
  }),
  "friends.receivedCount_other": T("{count} reçues", "{count} received", {
    es: "{count} recibidas", de: "{count} erhalten", it: "{count} ricevute", pt: "{count} recebidas", nl: "{count} ontvangen", ja: "{count} 件受信",
  }),
  "friends.sentCount": T("{count} envoyée", "{count} sent", {
    es: "{count} enviada", de: "{count} gesendet", it: "{count} inviata", pt: "{count} enviada", nl: "{count} verzonden", ja: "{count} 件送信",
  }),
  "friends.sentCount_one": T("{count} envoyée", "{count} sent", {
    es: "{count} enviada", de: "{count} gesendet", it: "{count} inviata", pt: "{count} enviada", nl: "{count} verzonden", ja: "{count} 件送信",
  }),
  "friends.sentCount_other": T("{count} envoyées", "{count} sent", {
    es: "{count} enviadas", de: "{count} gesendet", it: "{count} inviate", pt: "{count} enviadas", nl: "{count} verzonden", ja: "{count} 件送信",
  }),
  "friends.unreadCount": T("{count} non lu", "{count} unread", {
    es: "{count} no leído", de: "{count} ungelesen", it: "{count} non letto", pt: "{count} não lido", nl: "{count} ongelezen", ja: "{count} 件未読",
  }),
  "friends.unreadCount_one": T("{count} non lu", "{count} unread", {
    es: "{count} no leído", de: "{count} ungelesen", it: "{count} non letto", pt: "{count} não lido", nl: "{count} ongelezen", ja: "{count} 件未読",
  }),
  "friends.unreadCount_other": T("{count} non lus", "{count} unread", {
    es: "{count} no leídos", de: "{count} ungelesen", it: "{count} non letti", pt: "{count} não lidos", nl: "{count} ongelezen", ja: "{count} 件未読",
  }),
  "friends.addBtn": T("Ajouter", "Add", {
    es: "Añadir", de: "Hinzufügen", it: "Aggiungi", pt: "Adicionar", nl: "Toevoegen", ja: "追加",
  }),
  "friends.sentRequests": T("Demandes envoyées ({count})", "Sent requests ({count})", {
    es: "Solicitudes enviadas ({count})", de: "Gesendete Anfragen ({count})", it: "Richieste inviate ({count})", pt: "Pedidos enviados ({count})", nl: "Verzonden verzoeken ({count})", ja: "送信済みリクエスト ({count})",
  }),
  "friends.receivedRequests": T("Demandes reçues ({count})", "Incoming requests ({count})", {
    es: "Solicitudes recibidas ({count})", de: "Eingehende Anfragen ({count})", it: "Richieste ricevute ({count})", pt: "Pedidos recebidos ({count})", nl: "Ontvangen verzoeken ({count})", ja: "受信リクエスト ({count})",
  }),
  "friends.pending": T("En attente", "Pending", {
    es: "Pendiente", de: "Ausstehend", it: "In attesa", pt: "Pendente", nl: "In afwachting", ja: "保留中",
  }),
  "friends.cancelRequest": T("Annuler la demande", "Cancel request", {
    es: "Cancelar solicitud", de: "Anfrage abbrechen", it: "Annulla richiesta", pt: "Cancelar pedido", nl: "Verzoek annuleren", ja: "リクエストをキャンセル",
  }),
  "friends.requestCancelled": T("Demande annulée", "Request cancelled", {
    es: "Solicitud cancelada", de: "Anfrage abgebrochen", it: "Richiesta annullata", pt: "Pedido cancelado", nl: "Verzoek geannuleerd", ja: "リクエストをキャンセルしました",
  }),
  "friends.pactForged": T("Pacte d'amitié forgé", "Friendship pact forged", {
    es: "Pacto de amistad forjado", de: "Freundschaftspakt geschmiedet", it: "Patto d'amicizia forgiato", pt: "Pacto de amizade forjado", nl: "Vriendschapspact gesmeed", ja: "友情の契約が結ばれました",
  }),
  "friends.acceptFailed": T("Acceptation impossible", "Could not accept", {
    es: "No se pudo aceptar", de: "Annahme nicht möglich", it: "Impossibile accettare", pt: "Não foi possível aceitar", nl: "Kon niet accepteren", ja: "承認できませんでした",
  }),
  "friends.breakLinkConfirm": T("Rompre ce lien d'amitié ?", "Break this friendship?", {
    es: "¿Romper este vínculo de amistad?", de: "Diese Freundschaft beenden?", it: "Rompere questo legame d'amicizia?", pt: "Romper este vínculo de amizade?", nl: "Deze vriendschap verbreken?", ja: "この友情を解消しますか？",
  }),
  "friends.linkBroken": T("Lien rompu", "Link broken", {
    es: "Vínculo roto", de: "Verbindung getrennt", it: "Legame rotto", pt: "Vínculo rompido", nl: "Band verbroken", ja: "友情を解消しました",
  }),
  "friends.privateEchoes": T("Échos privés", "Private echoes", {
    es: "Ecos privados", de: "Private Echos", it: "Echi privati", pt: "Ecos privados", nl: "Privé echo's", ja: "プライベートエコー",
  }),
  "friends.list": T("Liste ({count})", "List ({count})", {
    es: "Lista ({count})", de: "Liste ({count})", it: "Lista ({count})", pt: "Lista ({count})", nl: "Lijst ({count})", ja: "リスト ({count})",
  }),
  "friends.emptyHint": T("Aucun compagnon — ajoute des héros pour commencer.", "No companions — add heroes to get started.", {
    es: "Sin compañeros — añade héroes para empezar.", de: "Keine Gefährten — füge Helden hinzu.", it: "Nessun compagno — aggiungi eroi per iniziare.", pt: "Sem companheiros — adicione heróis para começar.", nl: "Geen metgezellen — voeg helden toe om te beginnen.", ja: "仲間がいません — 英雄を追加して始めましょう。",
  }),
  "friends.sendMessage": T("Envoyer un message", "Send a message", {
    es: "Enviar un mensaje", de: "Nachricht senden", it: "Invia un messaggio", pt: "Enviar mensagem", nl: "Bericht sturen", ja: "メッセージを送る",
  }),
  "friends.breakLink": T("Rompre le lien", "Break link", {
    es: "Romper vínculo", de: "Verbindung trennen", it: "Rompi legame", pt: "Romper vínculo", nl: "Band verbreken", ja: "友情を解消",
  }),
  "friends.requestSentTo": T("Demande envoyée à {name}", "Request sent to {name}", {
    es: "Solicitud enviada a {name}", de: "Anfrage an {name} gesendet", it: "Richiesta inviata a {name}", pt: "Pedido enviado para {name}", nl: "Verzoek verstuurd naar {name}", ja: "{name} にリクエストを送信しました",
  }),
  "friends.levelShort": T("Niv. {level}", "Lv. {level}", {
    es: "Nv. {level}", de: "St. {level}", it: "Lv. {level}", pt: "Nv. {level}", nl: "Niv. {level}", ja: "Lv.{level}",
  }),

  // ─── Friend chat (UI labels only — not message content) ───
  "friendChat.selectCompanion": T("Sélectionne un compagnon", "Select a companion", {
    es: "Selecciona un compañero", de: "Gefährten auswählen", it: "Seleziona un compagno", pt: "Selecione um companheiro", nl: "Selecteer een metgezel", ja: "仲間を選択",
  }),
  "friendChat.noThreads": T("Aucune conversation — discute avec un compagnon.", "No conversations — chat with a companion.", {
    es: "Sin conversaciones — chatea con un compañero.", de: "Keine Unterhaltungen — chatte mit einem Gefährten.", it: "Nessuna conversazione — chatta con un compagno.", pt: "Sem conversas — converse com um companheiro.", nl: "Geen gesprekken — chat met een metgezel.", ja: "会話がありません — 仲間とチャットしましょう。",
  }),
  "friendChat.placeholder": T("Écrire un message…", "Write a message…", {
    es: "Escribir un mensaje…", de: "Nachricht schreiben…", it: "Scrivi un messaggio…", pt: "Escrever uma mensagem…", nl: "Schrijf een bericht…", ja: "メッセージを入力…",
  }),
  "friendChat.sendFailed": T("Envoi impossible", "Could not send", {
    es: "No se pudo enviar", de: "Senden nicht möglich", it: "Invio impossibile", pt: "Não foi possível enviar", nl: "Kon niet verzenden", ja: "送信できませんでした",
  }),
  "friendChat.back": T("Retour", "Back", {
    es: "Volver", de: "Zurück", it: "Indietro", pt: "Voltar", nl: "Terug", ja: "戻る",
  }),
  "friendChat.sanctuary": T("Sanctuaire : {username}", "Sanctuary: {username}", {
    es: "Santuario: {username}", de: "Heiligtum: {username}", it: "Santuario: {username}", pt: "Santuário: {username}", nl: "Heiligdom: {username}", ja: "聖域: {username}",
  }),
  "friendChat.noConversations": T("Aucune conversation — liez-vous à un compagnon pour échanger.", "No conversations — connect with a companion to chat.", {
    es: "Sin conversaciones — conéctate con un compañero para chatear.", de: "Keine Unterhaltungen — verbinde dich mit einem Gefährten.", it: "Nessuna conversazione — collegati a un compagno per chattare.", pt: "Sem conversas — conecte-se a um companheiro para conversar.", nl: "Geen gesprekken — maak contact met een metgezel.", ja: "会話がありません — 仲間とつながってチャットしましょう。",
  }),
  "friendChat.startConversation": T("Commencer la conversation…", "Start the conversation…", {
    es: "Iniciar la conversación…", de: "Unterhaltung beginnen…", it: "Inizia la conversazione…", pt: "Iniciar a conversa…", nl: "Gesprek beginnen…", ja: "会話を始める…",
  }),
  "friendChat.selectChannel": T("Sélectionnez un compagnon pour ouvrir un canal privé entre vos sanctuaires.", "Select a companion to open a private channel between your sanctuaries.", {
    es: "Selecciona un compañero para abrir un canal privado entre vuestros santuarios.", de: "Wähle einen Gefährten, um einen privaten Kanal zwischen euren Heiligtümern zu öffnen.", it: "Seleziona un compagno per aprire un canale privato tra i vostri santuari.", pt: "Selecione um companheiro para abrir um canal privado entre vossos santuários.", nl: "Selecteer een metgezel om een privékanaal tussen jullie heiligdommen te openen.", ja: "仲間を選んで、聖域間のプライベートチャンネルを開きましょう。",
  }),
  "friendChat.syncing": T("Synchronisation des échos…", "Syncing echoes…", {
    es: "Sincronizando ecos…", de: "Echos werden synchronisiert…", it: "Sincronizzazione echi…", pt: "Sincronizando ecos…", nl: "Echo's synchroniseren…", ja: "エコーを同期中…",
  }),
  "friendChat.noMessages": T("Aucun message — forgez le premier lien verbal.", "No messages — forge the first verbal link.", {
    es: "Sin mensajes — forja el primer vínculo verbal.", de: "Keine Nachrichten — schmiede die erste verbale Verbindung.", it: "Nessun messaggio — forgia il primo legame verbale.", pt: "Sem mensagens — forje o primeiro vínculo verbal.", nl: "Geen berichten — smeed de eerste verbale band.", ja: "メッセージはありません — 最初の言葉の絆を築きましょう。",
  }),
  "friendChat.placeholderCompanion": T("Écrire à votre compagnon…", "Write to your companion…", {
    es: "Escribir a tu compañero…", de: "An deinen Gefährten schreiben…", it: "Scrivi al tuo compagno…", pt: "Escrever ao seu companheiro…", nl: "Schrijf aan je metgezel…", ja: "仲間にメッセージを入力…",
  }),
  "friendChat.offlineHint": T("— message en attente à la connexion", "— message pending until online", {
    es: "— mensaje en espera hasta la conexión", de: "— Nachricht wartet auf Verbindung", it: "— messaggio in attesa della connessione", pt: "— mensagem aguardando conexão", nl: "— bericht wacht tot online", ja: "— オンラインになるまでメッセージ保留",
  }),
  "friendChat.inaccessible": T("Conversation inaccessible", "Conversation unavailable", {
    es: "Conversación no disponible", de: "Unterhaltung nicht verfügbar", it: "Conversazione non disponibile", pt: "Conversa indisponível", nl: "Gesprek niet beschikbaar", ja: "会話にアクセスできません",
  }),

  // ─── Forum ───
  "forum.kicker": T("Tribune de NEXORIA", "NEXORIA Forum"),
  "forum.categoriesCount": T("{cats} catégories · {threads} sujets", "{cats} categories · {threads} topics"),
  "forum.noSearchResults": T("Aucun sujet ne correspond à votre recherche.", "No topics match your search."),
  "forum.noRecentTopics": T("Aucun sujet récent — ouvrez le premier débat.", "No recent topics — start the first debate."),
  "forum.defaultCategory": T("Tribune", "Forum"),
  "forum.filterTopics": T("Filtrer les sujets...", "Filter topics..."),
  "forum.rulesTitle": T("Règles de la Tribune", "Forum rules"),
  "forum.rule.respect": T("Respecter les autres héros", "Respect other heroes"),
  "forum.rule.onTopic": T("Rester dans le thème de la catégorie", "Stay on category topic"),
  "forum.rule.noSpam": T("Pas de spam", "No spam"),
  "forum.rule.noOffensive": T("Pas de contenu offensant", "No offensive content"),
  "forum.rule.clearTitle": T("Utiliser un titre clair", "Use a clear title"),
  "forum.defaultDescription": T("Espace de discussion de la Tribune de NEXORIA.", "Discussion space of the NEXORIA Forum."),
  "forum.loginToCreate": T("Connecte-toi pour créer un sujet dans le Nexus.", "Log in to create a topic in the Nexus."),
  "forum.filter.all": T("Tous", "All"),
  "forum.filter.pinned": T("Épinglés", "Pinned"),
  "forum.filter.recent": T("Récents", "Recent"),
  "forum.filter.unanswered": T("Sans réponse", "Unanswered"),
  "forum.breadcrumb": T("Fil d'Ariane", "Breadcrumb"),
  "forum.noTopicsInSection": T("Aucun sujet n'a encore été ouvert dans cette section du Nexus.", "No topics have been opened in this Nexus section yet."),
  "forum.newTopic": T("Nouveau sujet", "New topic"),
  "forum.messageTooShort": T("Le message doit contenir au moins 10 caractères", "Message must be at least 10 characters"),
  "forum.topicCreated": T("Sujet créé (+30 XP)", "Topic created (+30 XP)"),
  "forum.createFailed": T("Erreur lors de la création du sujet", "Error creating topic"),
  "forum.openDebate": T("Ouvrir un débat", "Open a debate"),
  "forum.eloquentTitle": T("Titre éloquent...", "Eloquent title..."),
  "forum.topicContent": T("Contenu du sujet", "Topic content"),
  "forum.contentHint": T("Mise en forme, émojis :sword: :crown:, images et liens", "Formatting, emojis :sword: :crown:, images and links"),
  "forum.deleteTopicConfirm": T("Supprimer ce sujet ?", "Delete this topic?"),
  "forum.topicRemoved": T("Sujet retiré", "Topic removed"),
  "forum.deleteReplyConfirm": T("Supprimer cette réponse ?", "Delete this reply?"),
  "forum.replyRemoved": T("Réponse supprimée", "Reply removed"),
  "forum.contentTooShort": T("Contenu trop court", "Content too short"),
  "forum.replyEdited": T("Réponse modifiée", "Reply edited"),
  "forum.replyPosted": T("Réponse publiée (+10 XP)", "Reply posted (+10 XP)"),
  "forum.cat.salle-commune": T("La Salle commune est l'espace principal d'échange entre les héros du Nexus.", "The Common Hall is the main exchange space between Nexus heroes."),
  "forum.cat.strategies": T("Partagez vos tactiques, compositions, conseils de classes et théories de combat.", "Share tactics, compositions, class tips and combat theories."),
  "forum.cat.mythes": T("Explorez le lore de NEXORIA, les récits anciens, les prophéties et les chroniques.", "Explore NEXORIA lore, ancient tales, prophecies and chronicles."),
  "forum.cat.comptoir": T("Discutez des objets, badges, reliques, valeurs et échanges du Nexus.", "Discuss items, badges, relics, values and Nexus trades."),
  "forum.cat.recrutement": T("Présentez votre ordre, recrutez ou trouvez une guilde.", "Present your order, recruit or find a guild."),
  "forum.cat.conseil": T("Posez vos questions, trouvez de l'aide et accompagnez les nouveaux héros.", "Ask questions, find help and guide new heroes."),
  "forum.mutedUntilCreate": T("Vous êtes réduit au silence jusqu'au {date}. Vous ne pouvez pas créer de sujet.", "You are muted until {date}. You cannot create a topic."),
  "forum.mutedUntilReply": T("Vous êtes réduit au silence jusqu'au {date}. Vous ne pouvez pas répondre.", "You are muted until {date}. You cannot reply."),
  "forum.mutedCreateFailed": T("Vous êtes réduit au silence jusqu'au {date}. Création impossible.", "You are muted until {date}. Cannot create."),
  "forum.mutedReadOnly": T("Vous êtes en mute forum — lecture seule jusqu'au {date}.", "You are forum-muted — read-only until {date}."),
  "forum.muteActive": T("Mute actif", "Mute active"),
  "forum.mutedUntil": T("Publication désactivée jusqu'au {date}", "Posting disabled until {date}"),
  "forum.muteReason": T("Motif : {reason}", "Reason: {reason}"),
  "forum.portalBack": T("← Portail communautaire", "← Community portal"),
  "forum.createTopic": T("Créer un sujet", "Create a topic"),
  "forum.recentTopics": T("Sujets récents", "Recent topics"),
  "forum.topicCount_one": T("{count} sujet", "{count} topic"),
  "forum.topicCount_other": T("{count} sujets", "{count} topics"),
  "forum.about": T("À propos", "About"),
  "forum.rules": T("Règles", "Rules"),
  "forum.stats": T("Statistiques", "Statistics"),
  "forum.stat.topics": T("Sujets", "Topics"),
  "forum.stat.messages": T("Messages", "Messages"),
  "forum.stat.heroes": T("Héros actifs", "Active heroes"),
  "forum.stat.rooms": T("Salles", "Rooms"),
  "forum.pinnedTopics": T("Sujets épinglés", "Pinned topics"),
  "forum.badge.new": T("Nouveau", "New"),
  "forum.badge.closed": T("Fermé", "Closed"),
  "forum.statsPanelTitle": T("Tribune en chiffres", "Forum at a glance"),
  "forum.searchLabel": T("Recherche", "Search"),
  "forum.popularRooms": T("Salles populaires", "Popular rooms"),
  "forum.charterTitle": T("Charte de la Tribune", "Forum charter"),
  "forum.charter.respect": T("Respect et courtoisie entre héros.", "Respect and courtesy among heroes."),
  "forum.charter.noSpam": T("Pas de spam ni contenu hors-sujet.", "No spam or off-topic content."),
  "forum.charter.exclusion": T("Exclusion forum ≠ ban du site (Conseil).", "Forum exclusion ≠ site ban (Council)."),
  "forum.publishWithXp": T("Publier (+30 XP)", "Publish (+30 XP)"),
  "forum.topicEdited": T("Sujet modifié", "Topic edited"),
  "forum.messageTooShortEdit": T("Message trop court", "Message too short"),
  "forum.loadingThread": T("Chargement...", "Loading..."),
  "forum.viewsWithCount": T("{count} vues", "{count} views"),
  "forum.repliesWithCount": T("{count} réponses", "{count} replies"),
  "forum.pinAction": T("Épingler", "Pin"),
  "forum.lockAction": T("Verrouiller", "Lock"),
  "forum.firstToReply": T("Soyez le premier à réagir", "Be the first to reply"),
  "forum.yourReply": T("Votre réponse", "Your reply"),
  "forum.xpPerReply": T("+10 XP par contribution", "+10 XP per contribution"),
  "forum.editReplyTitle": T("Modifier la réponse", "Edit reply"),
  "forum.editTopicTitle": T("Modifier le sujet", "Edit topic"),
  "forum.contentLabel": T("Contenu", "Content"),
  "forum.replyReportContext": T("Réponse de {username}", "Reply by {username}"),
  "forum.errorGeneric": T("Erreur", "Error"),

  // ─── Banishment ───
  "ban.site.kicker": T("Édit du Conseil", "Council Edict"),
  "ban.site.title": T("Exil du Royaume", "Banished from the Realm"),
  "ban.site.subtitle": T("Votre accès à Nexoria a été suspendu par le Conseil.", "Your access to Nexoria has been suspended by the Council."),
  "ban.forum.kicker": T("Sceau de la Tribune", "Forum Seal"),
  "ban.forum.title": T("Exclusion du Forum", "Forum Exclusion"),
  "ban.forum.subtitle": T("Vous ne pouvez pas accéder à la Tribune des Héros pour le moment.", "You cannot access the Heroes Forum for now."),
  "ban.reasonLabel": T("Motif de la sanction", "Sanction reason"),
  "ban.reasonUnknown": T("Non précisé", "Not specified"),
  "ban.durationLabel": T("Durée de l'exclusion", "Exclusion duration"),
  "ban.timeRemaining": T("Temps restant", "Time remaining"),
  "ban.expiresSoon": T("Expire bientôt…", "Expires soon…"),
  "ban.logout": T("Quitter", "Leave"),
  "ban.backHome": T("Retour à l'accueil", "Back to home"),

  // ─── Community ───
  "community.kicker": T("Le cœur du royaume", "The heart of the realm", {
    es: "El corazón del reino", de: "Das Herz des Reichs", it: "Il cuore del regno", pt: "O coração do reino", nl: "Het hart van het rijk", ja: "王国の心臓",
  }),
  "community.title": T("Communauté", "Community", {
    es: "Comunidad", de: "Community", it: "Community", pt: "Comunidade", nl: "Community", ja: "コミュニティ",
  }),
  "community.subtitle": T("L'équipe, le flux du royaume et les ordres en recrutement", "The team, realm pulse and recruiting orders", {
    es: "El equipo, el pulso del reino y las órdenes en reclutamiento", de: "Das Team, der Puls des Reichs und rekrutierende Orden", it: "Il team, il polso del regno e gli ordini in reclutamento", pt: "A equipa, o pulso do reino e ordens a recrutar", nl: "Het team, de puls van het rijk en wervende ordes", ja: "チーム、王国の鼓動、募集中の騎士団",
  }),
  "community.joinDiscord": T("Rejoindre Discord", "Join Discord", {
    es: "Unirse a Discord", de: "Discord beitreten", it: "Unisciti a Discord", pt: "Entrar no Discord", nl: "Discord joinen", ja: "Discordに参加",
  }),
  "community.team": T("L'équipe NEXORIA", "The NEXORIA team", {
    es: "El equipo NEXORIA", de: "Das NEXORIA-Team", it: "Il team NEXORIA", pt: "A equipa NEXORIA", nl: "Het NEXORIA-team", ja: "NEXORIAチーム",
  }),
  "community.recruiting": T("Ordres en recrutement", "Recruiting orders", {
    es: "Órdenes en reclutamiento", de: "Rekrutierende Orden", it: "Ordini in reclutamento", pt: "Ordens a recrutar", nl: "Wervende ordes", ja: "募集中の騎士団",
  }),
  "community.noRecruiting": T("Aucun ordre ne recrute pour le moment.", "No orders recruiting right now.", {
    es: "Ninguna orden recluta por ahora.", de: "Derzeit rekrutiert kein Orden.", it: "Nessun ordine recluta al momento.", pt: "Nenhuma ordem recruta por agora.", nl: "Geen orde wervt momenteel.", ja: "現在募集中の騎士団はありません。",
  }),
  "community.realmPulse": T("Pulse du royaume", "Realm pulse", {
    es: "Pulso del reino", de: "Puls des Reichs", it: "Polso del regno", pt: "Pulso do reino", nl: "Puls van het rijk", ja: "王国の鼓動",
  }),
  "community.viewAll": T("Voir tout", "View all", {
    es: "Ver todo", de: "Alle ansehen", it: "Vedi tutto", pt: "Ver tudo", nl: "Alles bekijken", ja: "すべて見る",
  }),
  "community.stat.heroes": T("Héros", "Heroes", {
    es: "Héroes", de: "Helden", it: "Eroi", pt: "Heróis", nl: "Helden", ja: "英雄",
  }),
  "community.stat.online": T("En ligne", "Online", {
    es: "En línea", de: "Online", it: "Online", pt: "Online", nl: "Online", ja: "オンライン",
  }),
  "community.stat.orders": T("Ordres", "Orders", {
    es: "Órdenes", de: "Orden", it: "Ordini", pt: "Ordens", nl: "Orden", ja: "騎士団",
  }),
  "community.stat.team": T("Équipe", "Team", {
    es: "Equipo", de: "Team", it: "Team", pt: "Equipa", nl: "Team", ja: "チーム",
  }),
  "community.discordKicker": T("Le Nexus social", "The social Nexus", {
    es: "El Nexus social", de: "Der soziale Nexus", it: "Il Nexus social", pt: "O Nexus social", nl: "De sociale Nexus", ja: "ソーシャルNexus",
  }),
  "community.discordTitle": T("Rejoins la communauté sur Discord", "Join the community on Discord", {
    es: "Únete a la comunidad en Discord", de: "Tritt der Community auf Discord bei", it: "Unisciti alla community su Discord", pt: "Junta-te à comunidade no Discord", nl: "Word lid van de community op Discord", ja: "Discordでコミュニティに参加",
  }),
  "community.discordBody": T("Événements live, entraide, annonces et rencontres entre héros.", "Live events, help, announcements and hero meetups.", {
    es: "Eventos en vivo, ayuda, anuncios y encuentros entre héroes.", de: "Live-Events, Hilfe, Ankündigungen und Treffen zwischen Helden.", it: "Eventi live, aiuto, annunci e incontri tra eroi.", pt: "Eventos ao vivo, ajuda, anúncios e encontros entre heróis.", nl: "Live-evenementen, hulp, aankondigingen en ontmoetingen tussen helden.", ja: "ライブイベント、相互支援、お知らせ、英雄同士の交流。",
  }),
  "community.discordBtn": T("Rejoindre le Discord", "Join Discord", {
    es: "Unirse a Discord", de: "Discord beitreten", it: "Unisciti a Discord", pt: "Entrar no Discord", nl: "Discord joinen", ja: "Discordに参加",
  }),
  "community.teamDefault": T("L'Équipe", "The Team", {
    es: "El Equipo", de: "Das Team", it: "Il Team", pt: "A Equipa", nl: "Het Team", ja: "チーム",
  }),
  "community.teamSubtitle": T("Les gardiens du Nexus", "Guardians of the Nexus", {
    es: "Los guardianes del Nexus", de: "Die Hüter des Nexus", it: "I guardiani del Nexus", pt: "Os guardiões do Nexus", nl: "De bewakers van de Nexus", ja: "ネクサスの守護者",
  }),
  "community.teamIntro": T(
    "Sages, Sentinelles et artisans du royaume — ceux qui façonnent l'expérience NEXORIA.",
    "Sages, Sentinels and realm artisans — those who shape the NEXORIA experience.",
    {
      es: "Sabios, centinelas y artesanos del reino — quienes dan forma a la experiencia NEXORIA.",
      de: "Weise, Sentinels und Handwerker des Reichs — die das NEXORIA-Erlebnis gestalten.",
      it: "Saggi, sentinelle e artigiani del regno — coloro che plasmano l'esperienza NEXORIA.",
      pt: "Sábios, sentinelas e artesãos do reino — quem molda a experiência NEXORIA.",
      nl: "Wijzen, sentinels en ambachtslieden van het rijk — zij die de NEXORIA-ervaring vormgeven.",
      ja: "賢者、センチネル、王国の職人 — NEXORIAの体験を形作る者たち。",
    },
  ),
  "community.teamSoon": T("L'équipe sera bientôt présentée ici.", "The team will be presented here soon.", {
    es: "El equipo se presentará aquí pronto.", de: "Das Team wird hier bald vorgestellt.", it: "Il team sarà presto presentato qui.", pt: "A equipa será apresentada aqui em breve.", nl: "Het team wordt hier binnenkort gepresenteerd.", ja: "チームは近日ここに掲載されます。",
  }),
  "community.recruitment": T("Recrutement", "Recruitment", {
    es: "Reclutamiento", de: "Rekrutierung", it: "Reclutamento", pt: "Recrutamento", nl: "Werving", ja: "募集",
  }),
  "community.allOrders": T("Tous les ordres", "All orders", {
    es: "Todas las órdenes", de: "Alle Orden", it: "Tutti gli ordini", pt: "Todas as ordens", nl: "Alle ordes", ja: "すべての騎士団",
  }),
  "community.noGuilds": T("Aucun ordre n'est encore fondé — créez le vôtre !", "No order founded yet — create yours!", {
    es: "Aún no hay órdenes fundadas — ¡crea la tuya!", de: "Noch kein Orden gegründet — gründe deinen!", it: "Nessun ordine fondato — crea il tuo!", pt: "Nenhuma ordem fundada — crie a sua!", nl: "Nog geen orde opgericht — sticht de jouwe!", ja: "まだ騎士団がありません — 設立しよう！",
  }),
  "community.joinOrder": T("Rejoindre cet ordre", "Join this order", {
    es: "Unirse a esta orden", de: "Diesem Orden beitreten", it: "Unisciti a questo ordine", pt: "Entrar nesta ordem", nl: "Deze orde joinen", ja: "この騎士団に参加",
  }),
  "community.memberCount": T("Niveau {level} · {count} membre", "Level {level} · {count} member", {
    es: "Nivel {level} · {count} miembro", de: "Stufe {level} · {count} Mitglied", it: "Livello {level} · {count} membro", pt: "Nível {level} · {count} membro", nl: "Niveau {level} · {count} lid", ja: "Lv.{level} · {count} 人",
  }),
  "community.memberCount_one": T("Niveau {level} · {count} membre", "Level {level} · {count} member", {
    es: "Nivel {level} · {count} miembro", de: "Stufe {level} · {count} Mitglied", it: "Livello {level} · {count} membro", pt: "Nível {level} · {count} membro", nl: "Niveau {level} · {count} lid", ja: "Lv.{level} · {count} 人",
  }),
  "community.memberCount_other": T("Niveau {level} · {count} membres", "Level {level} · {count} members", {
    es: "Nivel {level} · {count} miembros", de: "Stufe {level} · {count} Mitglieder", it: "Livello {level} · {count} membri", pt: "Nível {level} · {count} membros", nl: "Niveau {level} · {count} leden", ja: "Lv.{level} · {count} 人",
  }),
  "community.feed": T("Le Flux", "The Feed", {
    es: "El Flujo", de: "Der Feed", it: "Il Feed", pt: "O Feed", nl: "De Feed", ja: "フィード",
  }),
  "community.viewFeed": T("Voir le fil", "View feed", {
    es: "Ver el feed", de: "Feed ansehen", it: "Vedi feed", pt: "Ver feed", nl: "Feed bekijken", ja: "フィードを見る",
  }),
  "community.noNews": T("Pas encore d'actualité — rendez-vous sur le fil du royaume.", "No news yet — check the realm feed.", {
    es: "Sin noticias aún — consulta el feed del reino.", de: "Noch keine Neuigkeiten — schau im Reichs-Feed vorbei.", it: "Nessuna notizia — visita il feed del regno.", pt: "Sem notícias — consulte o feed do reino.", nl: "Nog geen nieuws — bekijk de feed van het rijk.", ja: "まだニュースはありません — 王国フィードをご覧ください。",
  }),
  "community.newsDefault": T("Actualité", "News", {
    es: "Noticia", de: "Neuigkeit", it: "Notizia", pt: "Notícia", nl: "Nieuws", ja: "ニュース",
  }),
  "community.adventurer": T("Aventurier", "Adventurer", {
    es: "Aventurero", de: "Abenteurer", it: "Avventuriero", pt: "Aventureiro", nl: "Avonturier", ja: "冒険者",
  }),

  // ─── Hall of Legends ───
  "legends.globalTop": T("Top 10 mondial", "Global top 10"),
  "legends.pantheonChosen": T("Élu du Panthéon", "Chosen of the Pantheon"),
};
