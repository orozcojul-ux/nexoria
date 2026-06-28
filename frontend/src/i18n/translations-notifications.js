import { T } from "./translations.js";

/** In-app notification bell — resolved from kind + params on the client. */
export const TRANSLATIONS_NOTIFICATIONS = {
  // ─── Bell UI ───
  "notif.clear_all": T("Effacer tout", "Clear all", { es: "Borrar todo", de: "Alle löschen", it: "Cancella tutto", pt: "Limpar tudo", nl: "Alles wissen", ja: "すべて削除" }),
  "notif.clear_confirm": T(
    "Effacer toutes les notifications définitivement ?",
    "Permanently clear all notifications?",
    { es: "¿Borrar todas las notificaciones permanentemente?", de: "Alle Benachrichtigungen dauerhaft löschen?", it: "Eliminare definitivamente tutte le notifiche?", pt: "Apagar todas as notificações permanentemente?", nl: "Alle meldingen permanent wissen?", ja: "すべての通知を完全に削除しますか？" },
  ),
  "notif.view": T("Voir", "View", { es: "Ver", de: "Ansehen", it: "Vedi", pt: "Ver", nl: "Bekijken", ja: "表示" }),
  "notif.new_toast": T("Nouvelle notification", "New notification", { es: "Nueva notificación", de: "Neue Benachrichtigung", it: "Nuova notifica", pt: "Nova notificação", nl: "Nieuwe melding", ja: "新しい通知" }),

  // ─── badge ───
  "notif.badge.title": T("Badge débloqué : {name}", "Badge unlocked: {name}", { es: "Insignia desbloqueada: {name}", de: "Abzeichen freigeschaltet: {name}", it: "Badge sbloccato: {name}", pt: "Emblema desbloqueado: {name}", nl: "Badge ontgrendeld: {name}", ja: "バッジ解除: {name}" }),
  "notif.badge.message": T("{description}", "{description}", { es: "{description}", de: "{description}", it: "{description}", pt: "{description}", nl: "{description}", ja: "{description}" }),

  // ─── vip variants ───
  "notif.vip.daily.title": T("Coffre quotidien VIP", "VIP daily chest", { es: "Cofre diario VIP", de: "VIP-Tageskiste", it: "Forziere giornaliero VIP", pt: "Baú diário VIP", nl: "VIP-dagkist", ja: "VIPデイリーチェスト" }),
  "notif.vip.daily.message": T(
    "+{amount} écus du Nexus offerts par ton Pass Ascendant.",
    "+{amount} Écus from the Nexus, courtesy of your Ascendant Pass.",
    { es: "+{amount} Écus del Nexus gracias a tu Pase Ascendente.", de: "+{amount} Écus vom Nexus — Ascendant-Pass.", it: "+{amount} Écus dal Nexus con il Passo Ascendente.", pt: "+{amount} Écus do Nexus com o Passe Ascendente.", nl: "+{amount} Écus van de Nexus via je Ascendant Pass.", ja: "アセンダントパス特典: ネクサスから+{amount} Écus。" },
  ),
  "notif.vip.activated.title": T("Pass Ascendant activé", "Ascendant Pass activated", { es: "Pase Ascendente activado", de: "Ascendant-Pass aktiviert", it: "Passo Ascendente attivato", pt: "Passe Ascendente ativado", nl: "Ascendant Pass geactiveerd", ja: "アセンダントパス有効化" }),
  "notif.vip.activated.message": T(
    "Ton statut VIP est actif jusqu'au {until}.",
    "Your VIP status is active until {until}.",
    { es: "Tu estado VIP está activo hasta el {until}.", de: "Dein VIP-Status ist aktiv bis {until}.", it: "Il tuo stato VIP è attivo fino al {until}.", pt: "O teu estado VIP está ativo até {until}.", nl: "Je VIP-status is actief tot {until}.", ja: "VIPステータスは {until} まで有効です。" },
  ),
  "notif.vip.expired.title": T("Pass Ascendant expiré", "Ascendant Pass expired", { es: "Pase Ascendente expirado", de: "Ascendant-Pass abgelaufen", it: "Passo Ascendente scaduto", pt: "Passe Ascendente expirado", nl: "Ascendant Pass verlopen", ja: "アセンダントパス期限切れ" }),
  "notif.vip.expired.message": T(
    "Ton statut VIP a pris fin. Renouvelle-le dans la boutique pour conserver tes avantages.",
    "Your VIP status has ended. Renew it in the shop to keep your perks.",
    { es: "Tu VIP ha terminado. Renuévalo en la tienda para conservar tus ventajas.", de: "Dein VIP-Status ist abgelaufen. Verlängere ihn im Shop.", it: "Il VIP è scaduto. Rinnovalo nel negozio.", pt: "O VIP terminou. Renova na loja.", nl: "VIP is afgelopen. Verleng in de winkel.", ja: "VIPが終了しました。ショップで更新してください。" },
  ),

  // ─── referral variants ───
  "notif.referral.reward.title": T("Récompense de parrainage", "Referral reward", { es: "Recompensa de referido", de: "Empfehlungsbelohnung", it: "Ricompensa referral", pt: "Recompensa de referência", nl: "Verwijzingsbeloning", ja: "紹介報酬" }),
  "notif.referral.reward.message": T("{label}", "{label}", { es: "{label}", de: "{label}", it: "{label}", pt: "{label}", nl: "{label}", ja: "{label}" }),
  "notif.referral.title_unlock.title": T("Titre débloqué", "Title unlocked", { es: "Título desbloqueado", de: "Titel freigeschaltet", it: "Titolo sbloccato", pt: "Título desbloqueado", nl: "Titel ontgrendeld", ja: "称号解除" }),
  "notif.referral.title_unlock.message": T("{label}", "{label}", { es: "{label}", de: "{label}", it: "{label}", pt: "{label}", nl: "{label}", ja: "{label}" }),
  "notif.referral.discord.title": T("Rôle Discord Ambassadeur", "Discord Ambassador role", { es: "Rol Embajador en Discord", de: "Discord-Botschafter-Rolle", it: "Ruolo Ambasciatore Discord", pt: "Cargo Embaixador Discord", nl: "Discord-ambassadeursrol", ja: "Discordアンバサダーロール" }),
  "notif.referral.discord.message": T(
    "Ton statut d'Ambassadeur t'a octroyé un rôle Discord exclusif.",
    "Your Ambassador status granted you an exclusive Discord role.",
    { es: "Tu estatus de Embajador te otorgó un rol exclusivo en Discord.", de: "Dein Botschafter-Status gewährt dir eine exklusive Discord-Rolle.", it: "Lo status Ambasciatore ti ha dato un ruolo Discord esclusivo.", pt: "O estatuto Embaixador deu-te um cargo exclusivo no Discord.", nl: "Je ambassadeursstatus gaf je een exclusieve Discord-rol.", ja: "アンバサダー特典でDiscord限定ロールを獲得しました。" },
  ),
  "notif.referral.legendary.title": T("Parrain Légendaire !", "Legendary sponsor!", { es: "¡Padrino legendario!", de: "Legendärer Sponsor!", it: "Sponsor leggendario!", pt: "Padrinho lendário!", nl: "Legendarische sponsor!", ja: "伝説のスポンサー！" }),
  "notif.referral.legendary.message": T("{label}", "{label}", { es: "{label}", de: "{label}", it: "{label}", pt: "{label}", nl: "{label}", ja: "{label}" }),
  "notif.referral.vip_bonus.title": T("💎 Bonus VIP de parrainage : +{amount} Écus, +{xp} XP", "💎 VIP referral bonus: +{amount} Écus, +{xp} XP", { es: "💎 Bono VIP de referido: +{amount} Écus, +{xp} XP", de: "💎 VIP-Empfehlungsbonus: +{amount} Écus, +{xp} XP", it: "💎 Bonus VIP referral: +{amount} Écus, +{xp} XP", pt: "💎 Bónus VIP de referência: +{amount} Écus, +{xp} XP", nl: "💎 VIP-verwijzingsbonus: +{amount} Écus, +{xp} XP", ja: "💎 VIP紹介ボーナス: +{amount} Écus, +{xp} XP" }),
  "notif.referral.vip_bonus.message": T(
    "Votre statut Ascendant récompense chaque filleul.",
    "Your Ascendant status rewards every referral.",
    { es: "Tu estatus Ascendente recompensa cada referido.", de: "Dein Ascendant-Status belohnt jede Empfehlung.", it: "Il tuo status Ascendente premia ogni referral.", pt: "O teu estatuto Ascendente recompensa cada referido.", nl: "Je Ascendant-status beloont elke verwijzing.", ja: "アセンダント特典で紹介ごとに報酬。" },
  ),

  // ─── founder / beta ───
  "notif.founder.title": T("Pionnier du Nexus", "Nexus Pioneer", { es: "Pionero del Nexus", de: "Nexus-Pionier", it: "Pioniere del Nexus", pt: "Pioneiro do Nexus", nl: "Nexus-pionier", ja: "ネクサスパイオニア" }),
  "notif.founder.message": T(
    "Tu fais partie des {max} premiers héros (n°{seq}) : badge exclusif + {xp} XP offerts !",
    "You're among the first {max} heroes (#{seq}): exclusive badge + {xp} XP!",
    { es: "Eres de los primeros {max} héroes (nº{seq}): ¡insignia exclusiva + {xp} XP!", de: "Du bist unter den ersten {max} Helden (Nr. {seq}): exklusives Abzeichen + {xp} XP!", it: "Sei tra i primi {max} eroi (n.{seq}): badge esclusivo + {xp} XP!", pt: "Estás entre os primeiros {max} heróis (n.º{seq}): emblema exclusivo + {xp} XP!", nl: "Je behoort tot de eerste {max} helden (#{seq}): exclusieve badge + {xp} XP!", ja: "最初の{max}人のヒーロー（#{seq}）: 限定バッジ + {xp} XP！" },
  ),
  "notif.beta_access.title": T("Accès beta activé", "Beta access activated", { es: "Acceso beta activado", de: "Beta-Zugang aktiviert", it: "Accesso beta attivato", pt: "Acesso beta ativado", nl: "Beta-toegang geactiveerd", ja: "ベータアクセス有効化" }),
  "notif.beta_access.message": T(
    "Bienvenue dans le Nexus — badge Beta Testeur, récompenses débloqués, et 1 changement de classe offert !",
    "Welcome to the Nexus — Beta Tester badge, rewards unlocked, and 1 free class change!",
    { es: "¡Bienvenido al Nexus — insignia Beta, recompensas y 1 cambio de clase gratis!", de: "Willkommen im Nexus — Beta-Abzeichen, Belohnungen und 1 kostenloser Klassenwechsel!", it: "Benvenuto nel Nexus — badge Beta, ricompense e 1 cambio classe gratis!", pt: "Bem-vindo ao Nexus — emblema Beta, recompensas e 1 mudança de classe grátis!", nl: "Welkom in de Nexus — Beta-badge, beloningen en 1 gratis klassewissel!", ja: "ネクサスへようこそ — ベータバッジ、報酬、クラス変更1回無料！" },
  ),

  // ─── craft / economy ───
  "notif.craft_milestone.title": T("Palier Forge débloqué", "Forge tier unlocked", { es: "Nivel de forja desbloqueado", de: "Schmiede-Stufe freigeschaltet", it: "Livello forgia sbloccato", pt: "Nível da forja desbloqueado", nl: "Smidse-niveau ontgrendeld", ja: "鍛冶ティア解除" }),
  "notif.craft_milestone.message": T("{label}", "{label}", { es: "{label}", de: "{label}", it: "{label}", pt: "{label}", nl: "{label}", ja: "{label}" }),
  "notif.ecus_received.title": T("💰 {username} vous a envoyé {amount} Écus", "💰 {username} sent you {amount} Écus", { es: "💰 {username} te envió {amount} Écus", de: "💰 {username} hat dir {amount} Écus gesendet", it: "💰 {username} ti ha inviato {amount} Écus", pt: "💰 {username} enviou-te {amount} Écus", nl: "💰 {username} stuurde je {amount} Écus", ja: "💰 {username} が {amount} Écus を送りました" }),
  "notif.ecus_received.message": T(
    "Un présent monétaire vient d'arriver dans votre bourse{note}",
    "A monetary gift just arrived in your purse{note}",
    { es: "Un regalo monetario acaba de llegar a tu bolsa{note}", de: "Ein Geldgeschenk ist in deiner Börse angekommen{note}", it: "Un regalo in denaro è arrivato nel tuo borsello{note}", pt: "Um presente monetário chegou à tua bolsa{note}", nl: "Een geldcadeau is in je beurs aangekomen{note}", ja: "通貨の贈り物が届きました{note}" },
  ),
  "notif.item_received.title": T("🎁 {username} vous a offert {name}", "🎁 {username} gifted you {name}", { es: "🎁 {username} te regaló {name}", de: "🎁 {username} schenkte dir {name}", it: "🎁 {username} ti ha regalato {name}", pt: "🎁 {username} ofereceu-te {name}", nl: "🎁 {username} gaf je {name}", ja: "🎁 {username} が {name} を贈りました" }),
  "notif.item_received.message": T(
    "x{quantity} {name} — déposé dans votre inventaire",
    "x{quantity} {name} — added to your inventory",
    { es: "x{quantity} {name} — añadido a tu inventario", de: "x{quantity} {name} — in dein Inventar gelegt", it: "x{quantity} {name} — aggiunto all'inventario", pt: "x{quantity} {name} — adicionado ao inventário", nl: "x{quantity} {name} — toegevoegd aan inventaris", ja: "x{quantity} {name} — インベントリに追加" },
  ),

  // ─── trades ───
  "notif.trade_offer.title": T("🤝 {username} vous propose un échange", "🤝 {username} proposes a trade", { es: "🤝 {username} propone un intercambio", de: "🤝 {username} schlägt einen Tausch vor", it: "🤝 {username} propone uno scambio", pt: "🤝 {username} propõe uma troca", nl: "🤝 {username} stelt een ruil voor", ja: "🤝 {username} が交換を提案しました" }),
  "notif.trade_offer.message": T(
    "Vous avez {hours}h pour répondre — voir dans Inventaire › Échanges.",
    "You have {hours}h to respond — see Inventory › Trades.",
    { es: "Tienes {hours}h para responder — ver Inventario › Intercambios.", de: "Du hast {hours}h zum Antworten — siehe Inventar › Tausch.", it: "Hai {hours}h per rispondere — vedi Inventario › Scambi.", pt: "Tens {hours}h para responder — ver Inventário › Trocas.", nl: "Je hebt {hours}h om te reageren — zie Inventaris › Ruil.", ja: "返答期限 {hours}時間 — インベントリ › 交換を確認。" },
  ),
  "notif.trade_expired.title": T("⌛ Votre échange avec {username} a expiré", "⌛ Your trade with {username} expired", { es: "⌛ Tu intercambio con {username} expiró", de: "⌛ Dein Tausch mit {username} ist abgelaufen", it: "⌛ Lo scambio con {username} è scaduto", pt: "⌛ A troca com {username} expirou", nl: "⌛ Je ruil met {username} is verlopen", ja: "⌛ {username} との交換が期限切れ" }),
  "notif.trade_expired.message": T(
    "Le délai de réponse est écoulé — vos objets et écus vous ont été restitués.",
    "The response window closed — your items and Écus were returned.",
    { es: "Plazo agotado — tus objetos y Écus fueron devueltos.", de: "Frist abgelaufen — Gegenstände und Écus wurden zurückgegeben.", it: "Tempo scaduto — oggetti e Écus restituiti.", pt: "Prazo esgotado — itens e Écus devolvidos.", nl: "Termijn verstreken — items en Écus teruggegeven.", ja: "期限切れ — アイテムとÉcusが返却されました。" },
  ),
  "notif.trade_accepted.title": T("✅ {username} a accepté votre échange", "✅ {username} accepted your trade", { es: "✅ {username} aceptó tu intercambio", de: "✅ {username} hat deinen Tausch angenommen", it: "✅ {username} ha accettato lo scambio", pt: "✅ {username} aceitou a troca", nl: "✅ {username} accepteerde je ruil", ja: "✅ {username} が交換を承認" }),
  "notif.trade_accepted.message": T(
    "Les objets et écus ont été échangés.",
    "Items and Écus have been exchanged.",
    { es: "Objetos y Écus intercambiados.", de: "Gegenstände und Écus wurden getauscht.", it: "Oggetti e Écus scambiati.", pt: "Itens e Écus trocados.", nl: "Items en Écus zijn geruild.", ja: "アイテムとÉcusが交換されました。" },
  ),
  "notif.trade_declined.title": T("❌ {username} a refusé votre échange", "❌ {username} declined your trade", { es: "❌ {username} rechazó tu intercambio", de: "❌ {username} lehnte deinen Tausch ab", it: "❌ {username} ha rifiutato lo scambio", pt: "❌ {username} recusou a troca", nl: "❌ {username} wees je ruil af", ja: "❌ {username} が交換を拒否" }),
  "notif.trade_declined.message": T(
    "Vos objets et écus vous ont été restitués.",
    "Your items and Écus were returned.",
    { es: "Tus objetos y Écus fueron devueltos.", de: "Deine Gegenstände und Écus wurden zurückgegeben.", it: "Oggetti e Écus restituiti.", pt: "Itens e Écus devolvidos.", nl: "Je items en Écus zijn teruggegeven.", ja: "アイテムとÉcusが返却されました。" },
  ),

  // ─── shop / season / challenges ───
  "notif.community_challenge.title": T("🏆 Défi accompli : {name}", "🏆 Challenge completed: {name}", { es: "🏆 Desafío completado: {name}", de: "🏆 Herausforderung abgeschlossen: {name}", it: "🏆 Sfida completata: {name}", pt: "🏆 Desafio concluído: {name}", nl: "🏆 Uitdaging voltooid: {name}", ja: "🏆 チャレンジ達成: {name}" }),
  "notif.community_challenge.message": T("{reward}", "{reward}", { es: "{reward}", de: "{reward}", it: "{reward}", pt: "{reward}", nl: "{reward}", ja: "{reward}" }),
  "notif.ecus_purchase.title": T("Recharge d'Écus", "Écus top-up", { es: "Recarga de Écus", de: "Écus-Aufladung", it: "Ricarica Écus", pt: "Recarga de Écus", nl: "Écus-opwaardering", ja: "Écusチャージ" }),
  "notif.ecus_purchase.message": T(
    "+{ecus} Écus crédités sur votre compte",
    "+{ecus} Écus credited to your account",
    { es: "+{ecus} Écus acreditados en tu cuenta", de: "+{ecus} Écus auf dein Konto gutgeschrieben", it: "+{ecus} Écus accreditati sul tuo account", pt: "+{ecus} Écus creditados na tua conta", nl: "+{ecus} Écus bijgeschreven op je account", ja: "アカウントに +{ecus} Écus 付与" },
  ),
  "notif.shop.title": T("Achat confirmé", "Purchase confirmed", { es: "Compra confirmada", de: "Kauf bestätigt", it: "Acquisto confermato", pt: "Compra confirmada", nl: "Aankoop bevestigd", ja: "購入完了" }),
  "notif.shop.message": T("« {itemName} » est à vous", "« {itemName} » is yours", { es: "« {itemName} » es tuyo", de: "« {itemName} » gehört dir", it: "« {itemName} » è tuo", pt: "« {itemName} » é teu", nl: "« {itemName} » is van jou", ja: "「{itemName}」を獲得" }),

  // ─── guild / forum ───
  "notif.guild_invite.title": T("L'ordre « {name} » vous invite", "Order « {name} » invites you", { es: "La orden « {name} » te invita", de: "Orden « {name} » lädt dich ein", it: "L'ordine « {name} » ti invita", pt: "A ordem « {name} » convida-te", nl: "Orde « {name} » nodigt je uit", ja: "ギルド「{name}」から招待" }),
  "notif.guild_invite.message": T("Tag [{tag}] — clique pour répondre", "Tag [{tag}] — tap to respond", { es: "Etiqueta [{tag}] — pulsa para responder", de: "Tag [{tag}] — tippen zum Antworten", it: "Tag [{tag}] — tocca per rispondere", pt: "Tag [{tag}] — toca para responder", nl: "Tag [{tag}] — tik om te reageren", ja: "タグ [{tag}] — タップして返答" }),
  "notif.guild_reward.title": T("Récompense de l'ordre « {name} »", "Reward from order « {name} »", { es: "Recompensa de la orden « {name} »", de: "Belohnung von Orden « {name} »", it: "Ricompensa dall'ordine « {name} »", pt: "Recompensa da ordem « {name} »", nl: "Beloning van orde « {name} »", ja: "ギルド「{name}」から報酬" }),
  "notif.guild_reward.message": T("+{amount} Écus", "+{amount} Écus", { es: "+{amount} Écus", de: "+{amount} Écus", it: "+{amount} Écus", pt: "+{amount} Écus", nl: "+{amount} Écus", ja: "+{amount} Écus" }),
  "notif.forum_reply.title": T("{username} a répondu à votre sujet", "{username} replied to your topic", { es: "{username} respondió a tu tema", de: "{username} antwortete auf dein Thema", it: "{username} ha risposto al tuo topic", pt: "{username} respondeu ao teu tópico", nl: "{username} reageerde op je topic", ja: "{username} がスレッドに返信" }),
  "notif.forum_reply.message": T("{threadTitle}", "{threadTitle}", { es: "{threadTitle}", de: "{threadTitle}", it: "{threadTitle}", pt: "{threadTitle}", nl: "{threadTitle}", ja: "{threadTitle}" }),

  // ─── seasons ───
  "notif.season_start.title": T("Saison « {name} » ouverte", "Season « {name} » is open", { es: "Temporada « {name} » abierta", de: "Saison « {name} » eröffnet", it: "Stagione « {name} » aperta", pt: "Temporada « {name} » aberta", nl: "Seizoen « {name} » geopend", ja: "シーズン「{name}」開始" }),
  "notif.season_start.message": T("{description}", "{description}", { es: "{description}", de: "{description}", it: "{description}", pt: "{description}", nl: "{description}", ja: "{description}" }),
  "notif.season_reward.rank.title": T("Récompense saison #{rank}", "Season reward #{rank}", { es: "Recompensa temporada #{rank}", de: "Saisonbelohnung #{rank}", it: "Ricompensa stagione #{rank}", pt: "Recompensa temporada #{rank}", nl: "Seizoensbeloning #{rank}", ja: "シーズン報酬 #{rank}" }),
  "notif.season_reward.rank.message": T("+{reward} Écus{passSuffix}", "+{reward} Écus{passSuffix}", { es: "+{reward} Écus{passSuffix}", de: "+{reward} Écus{passSuffix}", it: "+{reward} Écus{passSuffix}", pt: "+{reward} Écus{passSuffix}", nl: "+{reward} Écus{passSuffix}", ja: "+{reward} Écus{passSuffix}" }),
  "notif.season_reward.pass_suffix": T(" (Passe Saison ×2)", " (Season Pass ×2)", { es: " (Pase de temporada ×2)", de: " (Saisonpass ×2)", it: " (Pass stagionale ×2)", pt: " (Passe de temporada ×2)", nl: " (Seizoenspas ×2)", ja: " (シーズンパス×2)" }),
  "notif.season_reward.participation.title": T("Passe Saison", "Season Pass", { es: "Pase de temporada", de: "Saisonpass", it: "Pass stagionale", pt: "Passe de temporada", nl: "Seizoenspas", ja: "シーズンパス" }),
  "notif.season_reward.participation.message": T(
    "+500 Écus pour votre participation à la saison",
    "+500 Écus for your season participation",
    { es: "+500 Écus por tu participación en la temporada", de: "+500 Écus für deine Saison-Teilnahme", it: "+500 Écus per la partecipazione alla stagione", pt: "+500 Écus pela participação na temporada", nl: "+500 Écus voor je seizoensdeelname", ja: "シーズン参加報酬 +500 Écus" },
  ),

  // ─── friends ───
  "notif.friend_request.title": T("{username} souhaite vous lier", "{username} wants to connect", { es: "{username} quiere vincularse", de: "{username} möchte sich verbinden", it: "{username} vuole collegarsi", pt: "{username} quer ligar-se", nl: "{username} wil contact leggen", ja: "{username} からフレンド申請" }),
  "notif.friend_request.message": T(
    "Acceptez ou refusez le pacte d'amitié",
    "Accept or decline the friendship pact",
    { es: "Acepta o rechaza el pacto de amistad", de: "Freundschaftspakt annehmen oder ablehnen", it: "Accetta o rifiuta il patto di amicizia", pt: "Aceita ou recusa o pacto de amizade", nl: "Accepteer of weiger het vriendschapspact", ja: "フレンド申請を承認または拒否" },
  ),
  "notif.friend_accepted.title": T("{username} a accepté votre demande", "{username} accepted your request", { es: "{username} aceptó tu solicitud", de: "{username} hat deine Anfrage angenommen", it: "{username} ha accettato la tua richiesta", pt: "{username} aceitou o teu pedido", nl: "{username} accepteerde je verzoek", ja: "{username} が申請を承認" }),
  "notif.friend_accepted.message": T(
    "Un nouveau lien d'amitié est forgé",
    "A new friendship bond is forged",
    { es: "Se forja un nuevo vínculo de amistad", de: "Eine neue Freundschaft ist geschmiedet", it: "Si forgia un nuovo legame di amicizia", pt: "Um novo laço de amizade foi forjado", nl: "Een nieuwe vriendschapsband is gesmeed", ja: "新しい友情の絆が結ばれました" },
  ),
  "notif.friend_message.title": T("Message de {username}", "Message from {username}", { es: "Mensaje de {username}", de: "Nachricht von {username}", it: "Messaggio da {username}", pt: "Mensagem de {username}", nl: "Bericht van {username}", ja: "{username} からのメッセージ" }),
  "notif.friend_message.message": T("{preview}", "{preview}", { es: "{preview}", de: "{preview}", it: "{preview}", pt: "{preview}", nl: "{preview}", ja: "{preview}" }),

  // ─── tickets / reports / admin ───
  "notif.ticket_reply.title": T("Le Conseil a répondu à « {subject} »", "The Council replied to « {subject} »", { es: "El Consejo respondió a « {subject} »", de: "Der Rat antwortete auf « {subject} »", it: "Il Consiglio ha risposto a « {subject} »", pt: "O Conselho respondeu a « {subject} »", nl: "De Raad antwoordde op « {subject} »", ja: "評議会が「{subject}」に返信" }),
  "notif.ticket_reply.message": T("{preview}", "{preview}", { es: "{preview}", de: "{preview}", it: "{preview}", pt: "{preview}", nl: "{preview}", ja: "{preview}" }),
  "notif.ticket_status.title": T("Doléance « {subject} » → {statusLabel}", "Ticket « {subject} » → {statusLabel}", { es: "Ticket « {subject} » → {statusLabel}", de: "Ticket « {subject} » → {statusLabel}", it: "Ticket « {subject} » → {statusLabel}", pt: "Ticket « {subject} » → {statusLabel}", nl: "Ticket « {subject} » → {statusLabel}", ja: "チケット「{subject}」→ {statusLabel}" }),
  "notif.ticket_status.message": T(
    "Le Conseil a mis à jour votre dossier",
    "The Council updated your ticket",
    { es: "El Consejo actualizó tu ticket", de: "Der Rat hat dein Ticket aktualisiert", it: "Il Consiglio ha aggiornato il tuo ticket", pt: "O Conselho atualizou o teu ticket", nl: "De Raad heeft je ticket bijgewerkt", ja: "評議会がチケットを更新しました" },
  ),
  "notif.report_resolved.title": T("Signalement traité", "Report handled", { es: "Reporte tratado", de: "Meldung bearbeitet", it: "Segnalazione gestita", pt: "Denúncia tratada", nl: "Melding afgehandeld", ja: "通報を処理しました" }),
  "notif.report_resolved.message": T(
    "Les modérateurs ont validé votre signalement — merci pour votre vigilance.",
    "Moderators validated your report — thank you for your vigilance.",
    { es: "Los moderadores validaron tu reporte — gracias por tu vigilancia.", de: "Moderatoren haben deine Meldung bestätigt — danke für deine Wachsamkeit.", it: "I moderatori hanno validato la tua segnalazione — grazie per la vigilanza.", pt: "Os moderadores validaram a tua denúncia — obrigado pela vigilância.", nl: "Moderators hebben je melding bevestigd — bedankt voor je waakzaamheid.", ja: "モデレーターが通報を確認しました — ご協力ありがとうございます。" },
  ),
  "notif.aether_grant.title": T("{sign}{amount} Écus du Conseil", "{sign}{amount} Écus from the Council", { es: "{sign}{amount} Écus del Consejo", de: "{sign}{amount} Écus vom Rat", it: "{sign}{amount} Écus dal Consiglio", pt: "{sign}{amount} Écus do Conselho", nl: "{sign}{amount} Écus van de Raad", ja: "評議会から {sign}{amount} Écus" }),
  "notif.aether_grant.message": T("{reason}", "{reason}", { es: "{reason}", de: "{reason}", it: "{reason}", pt: "{reason}", nl: "{reason}", ja: "{reason}" }),
  "notif.aether_grant.default_reason": T("Don administratif", "Administrative grant", { es: "Don administrativo", de: "Administrative Gabe", it: "Dono amministrativo", pt: "Oferta administrativa", nl: "Administratieve gift", ja: "管理付与" }),
  "notif.aether.title": T("Le Conseil intervient", "The Council intervenes", { es: "El Consejo interviene", de: "Der Rat greift ein", it: "Il Consiglio interviene", pt: "O Conselho intervém", nl: "De Raad grijpt in", ja: "評議会が介入" }),
  "notif.aether.message": T(
    "Un Gardien a ajusté vos Écus de {amount}.",
    "A Guardian adjusted your Écus by {amount}.",
    { es: "Un Guardián ajustó tus Écus en {amount}.", de: "Ein Wächter hat deine Écus um {amount} angepasst.", it: "Un Guardiano ha modificato i tuoi Écus di {amount}.", pt: "Um Guardião ajustou os teus Écus em {amount}.", nl: "Een Wachter paste je Écus aan met {amount}.", ja: "ガーディアンがÉcusを {amount} 調整しました。" },
  ),
  "notif.item.title": T("Don du Conseil", "Gift from the Council", { es: "Regalo del Consejo", de: "Geschenk vom Rat", it: "Dono del Consiglio", pt: "Presente do Conselho", nl: "Geschenk van de Raad", ja: "評議会からの贈り物" }),
  "notif.item.message": T(
    "Vous recevez : {icon} {name} ({rarity}).",
    "You receive: {icon} {name} ({rarity}).",
    { es: "Recibes: {icon} {name} ({rarity}).", de: "Du erhältst: {icon} {name} ({rarity}).", it: "Ricevi: {icon} {name} ({rarity}).", pt: "Recebes: {icon} {name} ({rarity}).", nl: "Je ontvangt: {icon} {name} ({rarity}).", ja: "受け取り: {icon} {name} ({rarity})." },
  ),

  // ─── broadcast (admin custom text — shown as-is, may be any language) ───
  "notif.broadcast.title": T("{title}", "{title}", { es: "{title}", de: "{title}", it: "{title}", pt: "{title}", nl: "{title}", ja: "{title}" }),
  "notif.broadcast.message": T("{message}", "{message}", { es: "{message}", de: "{message}", it: "{message}", pt: "{message}", nl: "{message}", ja: "{message}" }),
};
