import { T } from "./translations.js";

/** Auth, gate, page banners, admin UI — merged into I18nContext */
export const TRANSLATIONS_EXTENDED = {
  // ─── Nexus auth gate ───
  "gate.badge": T("Accès restreint", "Restricted access"),
  "gate.title": T("Connexion requise", "Login required"),
  "gate.body": T(
    "Le Nexus Online est un monde social réservé aux héros inscrits. Forge ton identité pour explorer les salles, rencontrer d'autres joueurs et progresser en temps réel.",
    "Nexus Online is a social world for registered heroes only. Forge your identity to explore rooms, meet other players and progress in real time."
  ),
  "gate.login": T("Se connecter", "Log in"),
  "gate.register": T("Créer un compte", "Create account"),
  "gate.close": T("Fermer", "Close"),

  // ─── Login ───
  "login.kicker": T("Portail du Héros", "Hero Portal"),
  "login.title": T("Connexion", "Login"),
  "login.subtitle": T("Reprenez le contrôle de votre destin.", "Reclaim control of your destiny."),
  "login.field_username": T("Nom d'utilisateur", "Username"),
  "login.submit": T("SE CONNECTER", "LOG IN"),
  "login.or": T("ou", "or"),
  "login.or_oauth": T("OU SE CONNECTER AVEC", "OR LOG IN WITH"),
  "login.no_account": T("Pas encore de héros ?", "No hero yet?"),
  "login.to_register": T("Forger mon personnage", "Forge my character"),
  "login.welcome_back": T("Bon retour, {name}", "Welcome back, {name}"),
  "login.discord_error": T("Discord OAuth non configuré", "Discord OAuth not configured"),

  "login.forgot.link": T("Mot de passe oublié ?", "Forgot password?"),
  "login.forgot.title": T("Mot de passe oublié", "Forgot password"),
  "login.forgot.subtitle": T("Entrez l'email de votre compte NEXORIA. Un lien de réinitialisation sera généré.", "Enter your NEXORIA account email. A reset link will be generated."),
  "login.forgot.submit": T("ENVOYER LE LIEN", "SEND RESET LINK"),
  "login.forgot.sent": T("Demande enregistrée", "Request received"),
  "login.forgot.sent_detail": T("Si votre compte possède un mot de passe, un lien de réinitialisation a été créé (valide 1 h).", "If your account has a password, a reset link was created (valid 1 hour)."),
  "login.forgot.oauth_hint": T("Compte Google ou Discord ? Connectez-vous via ces boutons sur la page de connexion.", "Google or Discord account? Sign in with those buttons on the login page."),
  "login.forgot.back": T("Retour à la connexion", "Back to login"),
  "login.forgot.dev_link": T("Lien de reset affiché en console (mode dev)", "Reset link logged to console (dev mode)"),

  "login.reset.title": T("Nouveau mot de passe", "New password"),
  "login.reset.new_password": T("Nouveau mot de passe", "New password"),
  "login.reset.confirm": T("Confirmer le mot de passe", "Confirm password"),
  "login.reset.submit": T("RÉINITIALISER", "RESET PASSWORD"),
  "login.reset.success": T("Mot de passe mis à jour", "Password updated"),
  "login.reset.mismatch": T("Les mots de passe ne correspondent pas", "Passwords do not match"),
  "login.reset.missing_token": T("Lien invalide — demandez un nouveau lien", "Invalid link — request a new one"),

  // ─── Register ───
  "register.step1.kicker": T("Étape 1/2 · Identité", "Step 1/2 · Identity"),
  "register.step1.title": T("Forger votre Héros", "Forge your Hero"),
  "register.step1.subtitle": T("Commencez par votre identité dans NEXORIA.", "Start with your identity in NEXORIA."),
  "register.step2.kicker": T("Étape 2/2 · Voie", "Step 2/2 · Path"),
  "register.step2.title": T("CHOISIS TA PERSONNALITÉ", "CHOOSE YOUR PERSONALITY"),
  "register.step2.subtitle": T(
    "Chaque classe débloque des bonus, badges et une histoire unique.",
    "Each class unlocks bonuses, badges and a unique story."
  ),
  "register.continue": T("SUIVANT →", "NEXT →"),
  "register.back": T("RETOUR", "BACK"),
  "register.submit": T("NAÎTRE À NEXORIA →", "BORN INTO NEXORIA →"),
  "register.has_account": T("Déjà un compte ?", "Already have an account?"),
  "register.to_login": T("Se connecter", "Log in"),
  "register.welcome": T("Bienvenue {name}, {class}", "Welcome {name}, {class}"),
  "register.err_fields": T("Vérifiez vos informations (mot de passe ≥ 6 caractères)", "Check your details (password ≥ 6 characters)"),
  "register.err_class": T("Choisissez une classe", "Choose a class"),
  "register.discord.title": T("Reste informé via Discord", "Stay informed on Discord"),
  "register.discord.body": T(
    "Nous recommandons fortement de lier ton compte Discord après l'inscription. Tu recevras les annonces, événements, saisons et mises à jour du jeu en temps réel.",
    "We strongly recommend linking your Discord account after sign-up. You'll receive announcements, events, seasons and game updates in real time."
  ),
  "register.discord.perks": T("Rôles synchronisés · Alertes staff · Communauté active", "Synced roles · Staff alerts · Active community"),
  "register.discord.cta": T("Lier Discord après inscription", "Link Discord after sign-up"),
  "register.discord.hint": T("Disponible dans Paramètres → Compte", "Available in Settings → Account"),
  "register.discord.note": T(
    "Nous vous conseillons de lier votre compte Discord pour une meilleure expérience (modifiable ultérieurement dans vos paramètres)",
    "We recommend linking your Discord account for a better experience (you can change this later in your settings)"
  ),
  "register.discord.bonus": T(
    "Bonus exclusif : +75 XP et le badge Héraut Discord à la première inscription via Discord (non cumulable avec l'inscription classique).",
    "Exclusive bonus: +75 XP and the Discord Herald badge on first sign-up via Discord (not available with classic registration)."
  ),
  "register.err_email_taken": T("Cet email est déjà utilisé", "This email is already in use"),
  "register.err_username_taken": T("Ce pseudo est déjà pris", "This username is already taken"),

  // ─── Discord OAuth ───
  "discord.callback.loading": T("Établissement du lien Discord…", "Linking Discord account…"),
  "discord.callback.denied": T("Connexion Discord annulée", "Discord sign-in cancelled"),
  "discord.callback.missing_code": T("Code Discord manquant — réessayez", "Missing Discord code — please try again"),
  "discord.callback.failed": T("Échec de la connexion Discord", "Discord sign-in failed"),
  "discord.callback.welcome_new": T("Bienvenue {name} — compte créé via Discord", "Welcome {name} — account created via Discord"),
  "discord.callback.welcome_back": T("Bon retour, {name}", "Welcome back, {name}"),
  "discord.callback.linked": T("Compte Discord lié avec succès", "Discord account linked successfully"),
  "discord.callback.xp_bonus": T("Bonus d'inscription : +{amount} XP", "Sign-up bonus: +{amount} XP"),
  "discord.callback.badge_unlocked": T("Badge débloqué : Héraut Discord", "Badge unlocked: Discord Herald"),
  "discord.settings.linked": T("Compte lié :", "Linked account:"),
  "discord.settings.not_linked": T("Aucun compte Discord lié pour le moment.", "No Discord account linked yet."),
  "discord.settings.last_sync": T("dernière sync", "last sync"),
  "discord.settings.sync_roles": T("Synchroniser mes rôles Discord", "Sync my Discord roles"),
  "discord.settings.syncing": T("Synchronisation…", "Syncing…"),
  "discord.settings.sync_ok": T("Rôles Discord synchronisés !", "Discord roles synced!"),
  "discord.settings.sync_uptodate": T("Vos rôles Discord sont déjà à jour", "Your Discord roles are already up to date"),
  "discord.settings.sync_skipped": T("Sync ignorée", "Sync skipped"),
  "discord.settings.sync_error": T("Erreur de synchronisation", "Sync error"),
  "discord.settings.not_in_guild": T("Vous n'êtes pas membre du serveur Discord NEXORIA", "You are not a member of the NEXORIA Discord server"),
  "discord.settings.unlink": T("Délier Discord", "Unlink Discord"),
  "discord.settings.unlinking": T("Déliaison…", "Unlinking…"),
  "discord.settings.unlink_confirm": T("Délier votre compte Discord de NEXORIA ?", "Unlink your Discord account from NEXORIA?"),
  "discord.settings.unlinked": T("Compte Discord délié", "Discord account unlinked"),
  "discord.settings.unlink_error": T("Impossible de délier Discord", "Could not unlink Discord"),
  "discord.beta_link.title": T("Liez votre Discord", "Link your Discord"),
  "discord.beta_link.lead": T(
    "Pour accéder au Nexus en tant que testeur bêta, vous devez lier votre compte Discord à votre profil NEXORIA.",
    "As a beta tester, you must link your Discord account to your NEXORIA profile to access the Nexus.",
  ),
  "discord.beta_link.reason_roles": T(
    "Synchronisation automatique de vos rôles et accès au serveur",
    "Automatic role sync and server access",
  ),
  "discord.beta_link.reason_community": T(
    "Communication avec la communauté et l'équipe",
    "Stay connected with the community and team",
  ),
  "discord.beta_link.reason_beta": T(
    "Attribution du rôle Beta Tester sur Discord",
    "Beta Tester role on Discord",
  ),
  "discord.beta_link.cta": T("Lier mon compte Discord", "Link my Discord account"),
  "discord.beta_link.linking": T("Redirection vers Discord…", "Redirecting to Discord…"),
  "discord.beta_link.account": T("Compte NEXORIA", "NEXORIA account"),
  "discord.beta_link.password_required": T(
    "Saisissez votre mot de passe pour confirmer la liaison Discord.",
    "Enter your password to confirm Discord linking.",
  ),
  "discord.beta_link.required": T(
    "Cette étape est obligatoire pour continuer.",
    "This step is required to continue.",
  ),

  // ─── Page banners ───
  "page.hero.kicker": T("Carte du héros", "Hero sheet"),
  "page.hero.title": T("Ma Fiche Héros", "My Hero Sheet"),
  "page.hero.subtitle": T(
    "Statistiques, titres et progression de combat — distinct du profil public.",
    "Stats, titles and combat progress — separate from your public profile."
  ),
  "page.shop.kicker": T("Bazar cosmique", "Cosmic bazaar"),
  "page.shop.title": T("Boutique d'Écus", "Écus Shop"),
  "page.shop.subtitle": T("Reliques, cosmétiques, montures et trésors du royaume.", "Relics, cosmetics, mounts and royal treasures."),
  "page.inventory.kicker": T("Cabinet de curiosités", "Curiosity cabinet"),
  "page.inventory.title": T("Vos Reliques", "Your Relics"),
  "page.inventory.subtitle": T(
    "{count} trésor(s) arraché(s) aux brumes oubliées.",
    "{count} treasure(s) torn from forgotten mists."
  ),
  "page.craft.kicker": T("Atelier des forgerons", "Smiths' workshop"),
  "page.craft.title": T("Forge du Nexus", "Nexus Forge"),
  "page.craft.subtitle": T(
    "Combinez vos ressources et forgez des reliques légendaires.",
    "Combine your resources and forge legendary relics."
  ),
  "page.quests.kicker": T("Avis aux braves", "Call to the brave"),
  "page.quests.title": T("Tableau de Chasse", "Hunting Board"),
  "page.quests.subtitle": T("Accomplis tes objectifs et récolte XP et Écus.", "Complete objectives and earn XP and Écus."),
  "page.oracle.kicker": T("Salle des Murmures", "Hall of Whispers"),
  "page.oracle.title": T("Le Sanctuaire", "The Sanctuary"),
  "page.oracle.subtitle": T("Une conscience ancienne lit dans la trame des âmes.", "An ancient consciousness reads the weave of souls."),
  "page.nexusWheel.kicker": T("Fortune du Royaume", "Realm Fortune"),
  "page.nexusWheel.title": T("Roue du Nexus", "Nexus Wheel"),
  "page.nexusWheel.subtitle": T("Une chance quotidienne offerte par les runes cosmiques.", "A daily chance granted by the cosmic runes."),
  "page.guilds.kicker": T("Ordres mystiques", "Mystic orders", {
    es: "Órdenes místicas", de: "Mystische Orden", it: "Ordini mistici", pt: "Ordens místicas", nl: "Mystieke ordes", ja: "神秘の騎士団",
  }),
  "page.guilds.title": T("Les Guildes", "Guilds", {
    es: "Gremios", de: "Gilden", it: "Gilde", pt: "Guildas", nl: "Gilden", ja: "ギルド",
  }),
  "page.guilds.subtitle": T(
    "Unissez-vous et fondez un ordre dont le nom résonnera dans l'éternité.",
    "Unite and found an order whose name will echo through eternity.",
    {
      es: "Únete y funda una orden cuyo nombre resonará por la eternidad.",
      de: "Vereint euch und gründet einen Orden, dessen Name durch die Ewigkeit hallt.",
      it: "Unisciti e fonda un ordine il cui nome risuonerà nell'eternità.",
      pt: "Una-se e funde uma ordem cujo nome ecoará pela eternidade.",
      nl: "Verenig je en sticht een orde waarvan de naam door de eeuwigheid galmt.",
      ja: "結束し、名が永遠に響く騎士団を設立しよう。",
    },
  ),
  "page.forum.kicker": T("Tribune", "Forum"),
  "page.forum.title": T("Forum des Héros", "Heroes Forum"),
  "page.forum.subtitle": T("Là où les voix s'élèvent et où les idées forgent l'histoire.", "Where voices rise and ideas forge history."),
  "page.friends.kicker": T("Liens de fraternité", "Bonds of fellowship", {
    es: "Lazos de fraternidad", de: "Bande der Kameradschaft", it: "Legami di fraternità", pt: "Laços de fraternidade", nl: "Banden van broederschap", ja: "兄弟の絆",
  }),
  "page.friends.title": T("Mes Compagnons", "My Companions", {
    es: "Mis Compañeros", de: "Meine Gefährten", it: "I miei Compagni", pt: "Meus Companheiros", nl: "Mijn Metgezellen", ja: "仲間たち",
  }),
  "page.friends.subtitle": T("Gère tes amis, accepte les demandes et échange en privé.", "Manage friends, accept requests and chat privately.", {
    es: "Gestiona amigos, acepta solicitudes y chatea en privado.", de: "Verwalte Freunde, nimm Anfragen an und chatte privat.", it: "Gestisci amici, accetta richieste e chatta in privato.", pt: "Gerencie amigos, aceite pedidos e converse em privado.", nl: "Beheer vrienden, accepteer verzoeken en chat privé.", ja: "友人を管理し、リクエストを承認してプライベートチャットしよう。",
  }),
  "page.tickets.kicker": T("Assistance", "Support"),
  "page.tickets.title": T("Service Client", "Customer Service"),
  "page.tickets.subtitle": T("Signale un bug, pose une question ou contacte l'équipe Nexoria.", "Report a bug, ask a question or contact the Nexoria team."),
  "page.nexus.kicker": T("Hub Social MMORPG", "Social MMORPG Hub"),
  "page.nexus.title": T("Nexus Online", "Nexus Online"),
  "page.nexus.subtitle": T("Monde isométrique social — amis, tchat et exploration.", "Social isometric world — friends, chat and exploration."),
  "page.classes.kicker": T("Sanctuaire des Héros", "Hero Sanctuary"),
  "page.classes.title": T("Codex des Voies", "Codex of Paths"),
  "page.classes.subtitle": T("12 archétypes — 8 affinités", "12 archetypes — 8 affinities"),
  "page.events.kicker": T("Chronique cosmique", "Cosmic chronicle"),
  "page.events.title": T("Événements du Royaume", "Realm Events"),
  "page.events.subtitle": T("Saisons, boss mondiaux, failles et rassemblements légendaires.", "Seasons, world bosses, rifts and legendary gatherings."),
  "page.kingdom.kicker": T("Domaine de {name}", "Domain of {name}"),
  "page.kingdom.title": T("Royaume Personnel", "Personal Kingdom"),
  "page.kingdom.subtitle": T("{aether} Écus disponibles pour ennoblir vos édifices.", "{aether} Écus available to upgrade your buildings."),
  "page.skills.kicker": T("Voûte céleste", "Celestial vault"),
  "page.skills.title": T("Votre Constellation", "Your Constellation"),
  "page.skills.subtitle": T("Chaque étoile que vous allumez sculpte votre destin.", "Every star you light shapes your destiny."),
  "page.leaderboards.kicker": T("Annales des héros", "Hero annals", {
    es: "Anales de héroes", de: "Heldenannalen", it: "Annali degli eroi", pt: "Anais dos heróis", nl: "Heldenannalen", ja: "英雄の年代記",
  }),
  "page.leaderboards.title": T("Hall des Légendes", "Hall of Legends", {
    es: "Salón de las Leyendas", de: "Halle der Legenden", it: "Sala delle Leggende", pt: "Salão das Lendas", nl: "Hal der Legendes", ja: "伝説の間",
  }),
  "page.leaderboards.subtitle": T(
    "Les noms gravés ici résonnent dans toutes les tavernes du royaume.",
    "Names carved here echo in every tavern of the realm.",
    {
      es: "Los nombres grabados aquí resuenan en todas las tabernas del reino.",
      de: "Die hier eingemeißelten Namen hallen in jeder Taverne des Reichs wider.",
      it: "I nomi incisi qui risuonano in ogni taverna del regno.",
      pt: "Os nomes gravados aqui ecoam em todas as tavernas do reino.",
      nl: "Namen die hier zijn gegraveerd galmen in elke taverne van het rijk.",
      ja: "ここに刻まれた名は王国のあらゆる酒場に響き渡る。",
    },
  ),
  "page.legends.kicker": T("Mémoire éternelle", "Eternal memory", {
    es: "Memoria eterna", de: "Ewige Erinnerung", it: "Memoria eterna", pt: "Memória eterna", nl: "Eeuwige herinnering", ja: "永遠の記憶",
  }),
  "page.legends.title": T("Panthéon", "Pantheon", {
    es: "Panteón", de: "Pantheon", it: "Pantheon", pt: "Panteão", nl: "Pantheon", ja: "パンテオン",
  }),
  "page.legends.subtitle": T(
    "Les héros dont les enfants chanteront les légendes.",
    "Heroes whose legends children will sing.",
    {
      es: "Héroes cuyas leyendas cantarán los niños.",
      de: "Helden, deren Legenden Kinder singen werden.",
      it: "Eroi di cui i bambini canteranno le leggende.",
      pt: "Heróis cujas lendas as crianças cantarão.",
      nl: "Helden waarvan kinderen de legendes zullen zingen.",
      ja: "子どもたちが伝説を語り継ぐ英雄たち。",
    },
  ),
  "page.world.kicker": T("Atlas éthérique", "Ethereal atlas"),
  "page.world.title": T("Carte du Monde", "World Map"),
  "page.world.subtitle": T("Chaque étoile est un héros. La pulsation indique ceux qui veillent encore.", "Each star is a hero. The pulse shows those still watching."),
  "page.settings.kicker": T("Configuration", "Configuration"),
  "page.profile.kicker": T("Profil public", "Public profile"),

  // ─── Shop categories ───
  "shop.cat.all": T("Tout", "All", { es: "Todo", de: "Alle", it: "Tutto", pt: "Tudo", nl: "Alles", ja: "すべて" }),
  "shop.cat.chest": T("Coffres", "Chests", { es: "Cofres", de: "Truhen", it: "Forzieri", pt: "Baús", nl: "Kisten", ja: "宝箱" }),
  "shop.cat.cosmetic": T("Cosmétiques", "Cosmetics", { es: "Cosméticos", de: "Kosmetik", it: "Cosmetici", pt: "Cosméticos", nl: "Cosmetica", ja: "コスメ" }),
  "shop.cat.mount": T("Montures", "Mounts", { es: "Monturas", de: "Reittiere", it: "Cavalcature", pt: "Montarias", nl: "Rijdieren", ja: "マウント" }),
  "shop.cat.title": T("Titres", "Titles", { es: "Títulos", de: "Titel", it: "Titoli", pt: "Títulos", nl: "Titels", ja: "称号" }),
  "shop.cat.aura": T("Auras", "Auras", { es: "Auras", de: "Auras", it: "Aura", pt: "Auras", nl: "Aura's", ja: "オーラ" }),
  "shop.cat.consumable": T("Consommables", "Consumables", { es: "Consumibles", de: "Verbrauchsgüter", it: "Consumabili", pt: "Consumíveis", nl: "Verbruiksitems", ja: "消耗品" }),
  "shop.cat.boost": T("Boosts", "Boosts", { es: "Potenciadores", de: "Boosts", it: "Potenziamenti", pt: "Boosts", nl: "Boosts", ja: "ブースト" }),
  "shop.cat.pass": T("Passe", "Pass", { es: "Pase", de: "Pass", it: "Pass", pt: "Passe", nl: "Pass", ja: "パス" }),
  "shop.cat.kingdom": T("Royaume", "Kingdom", { es: "Reino", de: "Königreich", it: "Regno", pt: "Reino", nl: "Koninkrijk", ja: "王国" }),

  // ─── Admin common ───
  "admin.mode.admin": T("Archonte", "Archon"),
  "admin.mode.mod": T("Modérateur", "Moderator"),
  "admin.access_denied": T("Accès refusé", "Access denied"),
  "admin.ban_lifted": T("Ban levé", "Ban lifted"),
  "admin.edit": T("Modifier", "Edit"),
  "admin.ban_user": T("Bannir", "Ban"),
  "admin.until": T("Jusqu'au", "Until"),
  "admin.ban_title": T("Bannir {name}", "Ban {name}"),
  "admin.col.hero": T("Héros", "Hero"),
  "admin.col.level": T("Niveau", "Level"),
  "admin.col.role": T("Rôle", "Role"),
  "admin.col.actions": T("Actions", "Actions"),
  "admin.maintenance_texts": T("Textes de la page maintenance", "Maintenance page texts"),
  "admin.systems_progress": T("Avancement des systèmes", "Systems progress"),
  "admin.status": T("Statut", "Status"),
  "admin.search_results": T("{count} résultat(s) pour « {q} »", "{count} result(s) for « {q} »"),
  "admin.clear_search": T("Effacer la recherche", "Clear search"),

  // ─── Common UI ───
  "common.or": T("ou", "or"),
  "common.back": T("Retour", "Back"),
  "common.error": T("Erreur", "Error"),
  "common.success": T("Succès", "Success"),
  "common.user": T("Joueur", "Player"),
  "common.hero": T("Héros", "Hero"),
  "common.online": T("En ligne", "Online", {
    es: "En línea", de: "Online", it: "Online", pt: "Online", nl: "Online", ja: "オンライン",
  }),
  "common.offline": T("Hors ligne", "Offline", {
    es: "Desconectado", de: "Offline", it: "Offline", pt: "Offline", nl: "Offline", ja: "オフライン",
  }),
  "presence.nexus_online": T("Nexus · Connecté", "Nexus · Connected", {
    es: "Nexus · Conectado", de: "Nexus · Verbunden", it: "Nexus · Connesso", pt: "Nexus · Conectado", nl: "Nexus · Verbonden", ja: "Nexus · 接続中",
  }),
  "presence.nexus_offline": T("Nexus · Absent", "Nexus · Away", {
    es: "Nexus · Ausente", de: "Nexus · Abwesend", it: "Nexus · Assente", pt: "Nexus · Ausente", nl: "Nexus · Afwezig", ja: "Nexus · 離席中",
  }),
};
