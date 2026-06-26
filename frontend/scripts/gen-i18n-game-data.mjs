/**
 * One-shot generator for game-data i18n modules.
 * Run: node scripts/gen-i18n-game-data.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "i18n");

function langs(obj) {
  return obj;
}

function emitModule(exportName, rows) {
  const lines = rows.map(([key, l]) => {
    const parts = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"]
      .map((lang) => `${lang}: ${JSON.stringify(l[lang])}`)
      .join(", ");
    return `  [${JSON.stringify(key)}, { ${parts} }],`;
  });
  return `import { packEntries } from "./multi.js";

export const ${exportName} = packEntries([
${lines.join("\n")}
]);
`;
}

// ─── QUESTS (32 × name + description = 64 keys) ───
const quests = [
  ["daily_login", "Présence Quotidienne", "Connecte-toi aujourd'hui (sur n'importe quelle page).",
    "Daily Presence", "Log in today (on any page).",
    "Presencia Diaria", "Inicia sesión hoy (en cualquier página).",
    "Tägliche Präsenz", "Melde dich heute an (auf einer beliebigen Seite).",
    "Presenza Quotidiana", "Accedi oggi (su qualsiasi pagina).",
    "Presença Diária", "Entre hoje (em qualquer página).",
    "Dagelijkse Aanwezigheid", "Log vandaag in (op elke pagina).",
    "日々の参拝", "今日ログインする（どのページでも可）。"],
  ["daily_forum_reply", "Voix du Conseil", "Réponds à 2 sujets dans le Forum (onglet Forum › ouvre un sujet › Répondre).",
    "Voice of the Council", "Reply to 2 forum threads (Forum tab › open a thread › Reply).",
    "Voz del Consejo", "Responde en 2 hilos del foro (pestaña Foro › abre un hilo › Responder).",
    "Stimme des Rates", "Antworte in 2 Forum-Themen (Forum › Thema öffnen › Antworten).",
    "Voce del Consiglio", "Rispondi in 2 discussioni del forum (Forum › apri un topic › Rispondi).",
    "Voz do Conselho", "Responda em 2 tópicos do fórum (aba Fórum › abra um tópico › Responder).",
    "Stem van de Raad", "Reageer op 2 forumonderwerpen (Forum › open een topic › Reageren).",
    "評議会の声", "フォーラムで2件のスレッドに返信する（フォーラム › スレッドを開く › 返信）。"],
  ["daily_oracle", "Murmures de l'Oracle", "Consulte l'Oracle une fois (onglet Oracle).",
    "Whispers of the Oracle", "Consult the Oracle once (Oracle tab).",
    "Susurros del Oráculo", "Consulta el Oráculo una vez (pestaña Oráculo).",
    "Flüstern des Orakels", "Konsultiere das Orakel einmal (Oracle-Tab).",
    "Sussurri dell'Oracolo", "Consulta l'Oracolo una volta (scheda Oracolo).",
    "Sussurros do Oráculo", "Consulte o Oráculo uma vez (aba Oráculo).",
    "Fluisteringen van het Orakel", "Raadpleeg het Orakel eenmaal (Oracle-tab).",
    "神託の囁き", "オラクルを1回Consultする（オラクルタブ）。"],
  ["daily_nexus", "Marche du Nexus", "Entre dans le Nexus Online (onglet Online).",
    "Nexus Walk", "Enter Nexus Online (Online tab).",
    "Camino del Nexus", "Entra en Nexus Online (pestaña Online).",
    "Nexus-Weg", "Betritt Nexus Online (Online-Tab).",
    "Cammino del Nexus", "Entra in Nexus Online (scheda Online).",
    "Caminho do Nexus", "Entre no Nexus Online (aba Online).",
    "Nexus-pad", "Ga Nexus Online binnen (Online-tab).",
    "ネクサスの歩み", "ネクサスオンラインに入る（オンラインタブ）。"],
  ["daily_chest", "Briseur de Sceau", "Ouvre 1 coffre (Inventaire › Ouvrir le coffre — coûte 50 Écus, remboursés par la récompense).",
    "Seal Breaker", "Open 1 chest (Inventory › Open chest — costs 50 Écus, refunded by the reward).",
    "Rompe-Sellos", "Abre 1 cofre (Inventario › Abrir cofre — cuesta 50 Écus, reembolsados con la recompensa).",
    "Siegelbrecher", "Öffne 1 Truhe (Inventar › Truhe öffnen — kostet 50 Écus, durch Belohnung erstattet).",
    "Spezzasigilli", "Apri 1 forziere (Inventario › Apri forziere — costa 50 Écus, rimborsati dalla ricompensa).",
    "Quebra-Selos", "Abra 1 baú (Inventário › Abrir baú — custa 50 Écus, reembolsados pela recompensa).",
    "Zegelbreker", "Open 1 kist (Inventaris › Kist openen — kost 50 Écus, terugbetaald via beloning).",
    "封印破り", "宝箱を1つ開ける（インベントリ › 宝箱を開く — 50エキュー、報酬で返金）。"],
  ["daily_nexus_wheel", "Fortune du Nexus", "Tourne la Roue du Nexus une fois (Accueil ou Boutique › Roue du Nexus).",
    "Nexus Fortune", "Spin the Nexus Wheel once (Home or Shop › Nexus Wheel).",
    "Fortuna del Nexus", "Gira la Rueda del Nexus una vez (Inicio o Tienda › Rueda del Nexus).",
    "Nexus-Glück", "Drehe das Nexus-Rad einmal (Start oder Shop › Nexus-Rad).",
    "Fortuna del Nexus", "Gira la Ruota del Nexus una volta (Home o Negozio › Ruota del Nexus).",
    "Fortuna do Nexus", "Gire a Roda do Nexus uma vez (Início ou Loja › Roda do Nexus).",
    "Nexus-fortuin", "Draai het Nexus-wiel eenmaal (Home of Winkel › Nexus-wiel).",
    "ネクサスの運命", "ネクサスの輪を1回回す（ホームまたはショップ › ネクサスの輪）。"],
  ["daily_combat", "Chasseur de l'Arène", "Vaincs 3 créatures dans l'Arène du Nexus (Nexus Online › Arène du Nexus).",
    "Arena Hunter", "Defeat 3 creatures in the Nexus Arena (Nexus Online › Nexus Arena).",
    "Cazador de la Arena", "Derrota 3 criaturas en la Arena del Nexus (Nexus Online › Arena del Nexus).",
    "Arenajäger", "Besiege 3 Kreaturen in der Nexus-Arena (Nexus Online › Nexus-Arena).",
    "Cacciatore dell'Arena", "Sconfiggi 3 creature nell'Arena del Nexus (Nexus Online › Arena del Nexus).",
    "Caçador da Arena", "Derrote 3 criaturas na Arena do Nexus (Nexus Online › Arena do Nexus).",
    "Arena-jager", "Versla 3 wezens in de Nexus-arena (Nexus Online › Nexus-arena).",
    "闘技場の狩人", "ネクサス闘技場で3体のクリーチャーを倒す（ネクサスオンライン › 闘技場）。"],
  ["daily_craft", "Étincelle du Forge", "Tente 1 forge à la Forge du Nexus (Inventaire › Forge du Nexus).",
    "Forge Spark", "Attempt 1 forge at the Nexus Forge (Inventory › Nexus Forge).",
    "Chispa de la Forja", "Intenta 1 forja en la Forja del Nexus (Inventario › Forja del Nexus).",
    "Schmiedefunken", "Versuche 1 Schmiedevorgang in der Nexus-Schmiede (Inventar › Nexus-Schmiede).",
    "Scintilla della Forgia", "Tenta 1 forgiatura alla Forgia del Nexus (Inventario › Forgia del Nexus).",
    "Faísca da Forja", "Tente 1 forja na Forja do Nexus (Inventário › Forja do Nexus).",
    "Smeedvonk", "Probeer 1 smeding in de Nexus-smederij (Inventaris › Nexus-smederij).",
    "鍛冶の火花", "ネクサス鍛冶場で1回鍛造を試みる（インベントリ › ネクサス鍛冶場）。"],
  ["daily_craft_success", "Relique Forgée", "Réussis 1 forge aujourd'hui à la Forge du Nexus.",
    "Forged Relic", "Successfully forge 1 item today at the Nexus Forge.",
    "Reliquia Forjada", "Completa 1 forja hoy en la Forja del Nexus.",
    "Geschmiedete Reliquie", "Schmiede heute 1 erfolgreiches Item in der Nexus-Schmiede.",
    "Reliquia Forgiata", "Completa 1 forgiatura oggi alla Forgia del Nexus.",
    "Relíquia Forjada", "Conclua 1 forja hoje na Forja do Nexus.",
    "Gesmede relikwie", "Voltooi vandaag 1 succesvolle smeding in de Nexus-smederij.",
    "鍛えられた遺物", "今日ネクサス鍛冶場で1回鍛造に成功する。"],
  ["weekly_forum_threads", "Chroniqueur", "Ouvre 3 nouveaux sujets dans le Forum (onglet Forum › Nouveau sujet).",
    "Chronicler", "Open 3 new forum threads (Forum tab › New thread).",
    "Cronista", "Abre 3 nuevos hilos en el foro (pestaña Foro › Nuevo hilo).",
    "Chronist", "Eröffne 3 neue Forum-Themen (Forum › Neues Thema).",
    "Cronista", "Apri 3 nuove discussioni nel forum (Forum › Nuovo topic).",
    "Cronista", "Abra 3 novos tópicos no fórum (aba Fórum › Novo tópico).",
    "Kroniekschrijver", "Open 3 nieuwe forumtopics (Forum › Nieuw topic).",
    "年代記作者", "フォーラムで新規スレッドを3件作成する（フォーラム › 新規スレッド）。"],
  ["weekly_forum_replies", "Orateur des Salles", "Poste 15 réponses dans les sujets du Forum (onglet Forum › Répondre).",
    "Hall Orator", "Post 15 replies in forum threads (Forum tab › Reply).",
    "Orador de las Salas", "Publica 15 respuestas en el foro (pestaña Foro › Responder).",
    "Saalredner", "Schreibe 15 Antworten in Forum-Themen (Forum › Antworten).",
    "Oratore delle Sale", "Pubblica 15 risposte nel forum (Forum › Rispondi).",
    "Orador dos Salões", "Publique 15 respostas no fórum (aba Fórum › Responder).",
    "Zaalspreker", "Plaats 15 reacties in forumtopics (Forum › Reageren).",
    "大広間の雄弁家", "フォーラムで15件返信する（フォーラム › 返信）。"],
  ["weekly_guild_chat", "Fraternité d'Ordre", "Envoie 10 messages dans le chat de ton ordre (onglet Guildes › ton ordre › Discussion).",
    "Order Brotherhood", "Send 10 messages in your order chat (Guilds tab › your order › Chat).",
    "Fraternidad de la Orden", "Envía 10 mensajes en el chat de tu orden (pestaña Gremios › tu orden › Chat).",
    "Ordensbruderschaft", "Sende 10 Nachrichten im Ordens-Chat (Gilden › deine Orden › Chat).",
    "Fratellanza dell'Ordine", "Invia 10 messaggi nella chat del tuo ordine (Gilde › il tuo ordine › Chat).",
    "Fraternidade da Ordem", "Envie 10 mensagens no chat da sua ordem (Guildas › sua ordem › Chat).",
    "Ordebroederschap", "Stuur 10 berichten in je ordeschat (Gilden › je orde › Chat).",
    "騎士団の結束", "騎士団チャットで10件メッセージを送る（ギルド › 自分の騎士団 › チャット）。"],
  ["weekly_oracle", "Sagesse de l'Oracle", "Consulte l'Oracle 3 fois (onglet Oracle).",
    "Oracle Wisdom", "Consult the Oracle 3 times (Oracle tab).",
    "Sabiduría del Oráculo", "Consulta el Oráculo 3 veces (pestaña Oráculo).",
    "Weisheit des Orakels", "Konsultiere das Orakel 3 Mal (Oracle-Tab).",
    "Saggezza dell'Oracolo", "Consulta l'Oracolo 3 volte (scheda Oracolo).",
    "Sabedoria do Oráculo", "Consulte o Oráculo 3 vezes (aba Oráculo).",
    "Wijsheid van het Orakel", "Raadpleeg het Orakel 3 keer (Oracle-tab).",
    "神託の叡智", "オラクルを3回Consultする（オラクルタブ）。"],
  ["weekly_friends", "Liens d'Amitié", "Envoie 5 messages privés à un ami (onglet Amis › ouvre une discussion).",
    "Bonds of Friendship", "Send 5 private messages to a friend (Friends tab › open a chat).",
    "Lazos de Amistad", "Envía 5 mensajes privados a un amigo (pestaña Amigos › abre un chat).",
    "Freundschaftsbande", "Sende 5 private Nachrichten an einen Freund (Freunde › Chat öffnen).",
    "Legami di Amicizia", "Invia 5 messaggi privati a un amico (Amici › apri una chat).",
    "Laços de Amizade", "Envie 5 mensagens privadas a um amigo (Amigos › abra um chat).",
    "Vriendschapsbanden", "Stuur 5 privéberichten naar een vriend (Vrienden › chat openen).",
    "友情の絆", "友人にプライベートメッセージを5件送る（フレンド › チャットを開く）。"],
  ["weekly_parrainage", "Messager du Royaume", "Parraine 1 nouvel héros cette semaine (Settings › Parrainage › partage ton lien).",
    "Realm Messenger", "Refer 1 new hero this week (Settings › Referrals › share your link).",
    "Mensajero del Reino", "Patrocina 1 nuevo héroe esta semana (Ajustes › Referidos › comparte tu enlace).",
    "Boten des Reiches", "Wirb diese Woche 1 neuen Helden (Einstellungen › Empfehlungen › Link teilen).",
    "Messaggero del Regno", "Invita 1 nuovo eroe questa settimana (Impostazioni › Referral › condividi il link).",
    "Mensageiro do Reino", "Indique 1 novo herói esta semana (Configurações › Indicações › compartilhe seu link).",
    "Boodschapper van het Rijk", "Verwijs deze week 1 nieuwe held (Instellingen › Verwijzingen › deel je link).",
    "王国の使者", "今週新しい英雄を1人紹介する（設定 › 紹介 › リンクを共有）。"],
  ["weekly_shop", "Mécène de la Boutique", "Effectue 1 achat à la Boutique cette semaine (l'article le moins cher coûte 50 Écus — remboursés par la récompense).",
    "Shop Patron", "Make 1 shop purchase this week (cheapest item costs 50 Écus — refunded by the reward).",
    "Mecenas de la Tienda", "Realiza 1 compra en la tienda esta semana (el artículo más barato cuesta 50 Écus — reembolsados con la recompensa).",
    "Shop-Mäzen", "Tätige diese Woche 1 Kauf im Shop (günstigster Artikel: 50 Écus — durch Belohnung erstattet).",
    "Mecenate del Negozio", "Effettua 1 acquisto nel negozio questa settimana (l'articolo più economico costa 50 Écus — rimborsati).",
    "Mecenas da Loja", "Faça 1 compra na loja esta semana (item mais barato: 50 Écus — reembolsados pela recompensa).",
    "Winkelmecenas", "Doe deze week 1 aankoop in de winkel (goedkoopste item: 50 Écus — terugbetaald via beloning).",
    "商店の後援者", "今週ショップで1回購入する（最安50エキュー — 報酬で返金）。"],
  ["weekly_nexus_wheel", "Habitant de la Roue", "Tourne la Roue du Nexus 5 fois cette semaine.",
    "Wheel Dweller", "Spin the Nexus Wheel 5 times this week.",
    "Habitante de la Rueda", "Gira la Rueda del Nexus 5 veces esta semana.",
    "Rad-Bewohner", "Drehe diese Woche das Nexus-Rad 5 Mal.",
    "Abitante della Ruota", "Gira la Ruota del Nexus 5 volte questa settimana.",
    "Habitante da Roda", "Gire a Roda do Nexus 5 vezes esta semana.",
    "Wielbewoner", "Draai deze week het Nexus-wiel 5 keer.",
    "運命の輪の住人", "今週ネクサスの輪を5回回す。"],
  ["weekly_craft", "Semaine à l'Enclume", "Forge 5 fois cette semaine (réussite ou échec).",
    "Anvil Week", "Forge 5 times this week (success or failure).",
    "Semana en el Yunque", "Forja 5 veces esta semana (éxito o fracaso).",
    "Amboss-Woche", "Schmiede diese Woche 5 Mal (Erfolg oder Misserfolg).",
    "Settimana all'Incudine", "Forgia 5 volte questa settimana (successo o fallimento).",
    "Semana na Bigorna", "Forje 5 vezes esta semana (sucesso ou falha).",
    "Aambeeldweek", "Smeed deze week 5 keer (succes of mislukking).",
    "金床の一週間", "今週5回鍛造を試みる（成功・失敗問わず）。"],
  ["weekly_craft_success", "Artisan du Royaume", "Réussis 3 forges cette semaine.",
    "Realm Artisan", "Successfully forge 3 items this week.",
    "Artesano del Reino", "Completa 3 forjas esta semana.",
    "Reichshandwerker", "Schmiede diese Woche 3 erfolgreiche Items.",
    "Artigiano del Regno", "Completa 3 forgiature questa settimana.",
    "Artesão do Reino", "Conclua 3 forjas esta semana.",
    "Rijksambachtsman", "Voltooi deze week 3 succesvolle smedingen.",
    "王国の職人", "今週3回鍛造に成功する。"],
  ["monthly_grind", "Marathonien", "Gagne 5000 XP ce mois (en publiant, réagissant et participant partout sur le site).",
    "Marathoner", "Earn 5000 XP this month (by posting, reacting, and participating across the site).",
    "Maratonista", "Gana 5000 XP este mes (publicando, reaccionando y participando en todo el sitio).",
    "Marathonläufer", "Verdiene diesen Monat 5000 XP (durch Beiträge, Reaktionen und Teilnahme).",
    "Maratoneta", "Guadagna 5000 XP questo mese (pubblicando, reagendo e partecipando).",
    "Maratonista", "Ganhe 5000 XP este mês (publicando, reagindo e participando no site).",
    "Marathonloper", "Verdien deze maand 5000 XP (door te posten, reageren en deelnemen).",
    "マラソンランナー", "今月5000XPを獲得する（投稿・リアクション・サイト全体での参加）。"],
  ["monthly_parrainage", "Seigneur des Alliances", "Parraine 3 nouveaux héros ce mois (Settings › Parrainage › partage ton lien).",
    "Lord of Alliances", "Refer 3 new heroes this month (Settings › Referrals › share your link).",
    "Señor de las Alianzas", "Patrocina 3 nuevos héroes este mes (Ajustes › Referidos › comparte tu enlace).",
    "Herr der Bündnisse", "Wirb diesen Monat 3 neue Helden (Einstellungen › Empfehlungen › Link teilen).",
    "Signore delle Alleanze", "Invita 3 nuovi eroi questo mese (Impostazioni › Referral › condividi il link).",
    "Senhor das Alianças", "Indique 3 novos heróis este mês (Configurações › Indicações › compartilhe seu link).",
    "Heer der Allianties", "Verwijs deze maand 3 nieuwe helden (Instellingen › Verwijzingen › deel je link).",
    "同盟の領主", "今月新しい英雄を3人紹介する（設定 › 紹介 › リンクを共有）。"],
  ["monthly_vip", "Ascension Royale", "Active le Pass Ascendant ce mois (Boutique › Pass Ascendant).",
    "Royal Ascension", "Activate the Ascendant Pass this month (Shop › Ascendant Pass).",
    "Ascensión Real", "Activa el Pase Ascendente este mes (Tienda › Pase Ascendente).",
    "Königliche Ascension", "Aktiviere diesen Monat den Ascendant-Pass (Shop › Ascendant-Pass).",
    "Ascensione Reale", "Attiva il Pass Ascendente questo mese (Negozio › Pass Ascendente).",
    "Ascensão Real", "Ative o Passe Ascendente este mês (Loja › Passe Ascendente).",
    "Koninklijke ascensie", "Activeer deze maand de Ascendant Pass (Winkel › Ascendant Pass).",
    "王家の昇天", "今月アセンダントパスを有効化する（ショップ › アセンダントパス）。"],
  ["monthly_nexus_wheel", "Légende de la Roue", "Tourne la Roue du Nexus 20 fois ce mois.",
    "Wheel Legend", "Spin the Nexus Wheel 20 times this month.",
    "Leyenda de la Rueda", "Gira la Rueda del Nexus 20 veces este mes.",
    "Rad-Legende", "Drehe diesen Monat das Nexus-Rad 20 Mal.",
    "Leggenda della Ruota", "Gira la Ruota del Nexus 20 volte questo mese.",
    "Lenda da Roda", "Gire a Roda do Nexus 20 vezes este mês.",
    "Wiellegende", "Draai deze maand het Nexus-wiel 20 keer.",
    "運命の輪の伝説", "今月ネクサスの輪を20回回す。"],
  ["monthly_craft", "Légende de la Forge", "Forge 20 fois ce mois à la Forge du Nexus.",
    "Forge Legend", "Forge 20 times this month at the Nexus Forge.",
    "Leyenda de la Forja", "Forja 20 veces este mes en la Forja del Nexus.",
    "Schmiede-Legende", "Schmiede diesen Monat 20 Mal in der Nexus-Schmiede.",
    "Leggenda della Forgia", "Forgia 20 volte questo mese alla Forgia del Nexus.",
    "Lenda da Forja", "Forje 20 vezes este mês na Forja do Nexus.",
    "Smeedlegende", "Smeed deze maand 20 keer in de Nexus-smederij.",
    "鍛冶の伝説", "今月ネクサス鍛冶場で20回鍛造する。"],
  ["monthly_craft_epic", "Maître des Runes", "Réussis 2 forges épiques ou supérieures ce mois.",
    "Rune Master", "Successfully forge 2 epic or higher items this month.",
    "Maestro de Runas", "Completa 2 forjas épicas o superiores este mes.",
    "Runenmeister", "Schmiede diesen Monat 2 epische oder höherwertige Items.",
    "Maestro delle Rune", "Completa 2 forgiature epiche o superiori questo mese.",
    "Mestre das Runas", "Conclua 2 forjas épicas ou superiores este mês.",
    "Runenmeester", "Voltooi deze maand 2 epische of hogere smedingen.",
    "ルーンの達人", "今月エピック以上の鍛造に2回成功する。"],
  ["vip_daily_oracle", "Faveur de l'Ascendant", "VIP : consulte l'Oracle aujourd'hui pour une récompense renforcée.",
    "Ascendant's Favor", "VIP: consult the Oracle today for an enhanced reward.",
    "Favor del Ascendente", "VIP: consulta el Oráculo hoy para una recompensa mejorada.",
    "Gunst des Ascendant", "VIP: konsultiere heute das Orakel für eine verstärkte Belohnung.",
    "Favore dell'Ascendente", "VIP: consulta l'Oracolo oggi per una ricompensa potenziata.",
    "Favor do Ascendente", "VIP: consulte o Oráculo hoje para uma recompensa reforçada.",
    "Gunst van de Ascendant", "VIP: raadpleeg vandaag het Orakel voor een versterkte beloning.",
    "昇天者の恩寵", "VIP：今日オラクルをConsultして強化報酬を得る。"],
  ["vip_daily_chest", "Trésor de l'Ascendant", "VIP : ouvre 2 coffres aujourd'hui.",
    "Ascendant's Treasure", "VIP: open 2 chests today.",
    "Tesoro del Ascendente", "VIP: abre 2 cofres hoy.",
    "Schatz des Ascendant", "VIP: öffne heute 2 Truhen.",
    "Tesoro dell'Ascendente", "VIP: apri 2 forzieri oggi.",
    "Tesouro do Ascendente", "VIP: abra 2 baús hoje.",
    "Schat van de Ascendant", "VIP: open vandaag 2 kisten.",
    "昇天者の宝箱", "VIP：今日宝箱を2つ開ける。"],
  ["vip_daily_wheel", "Triple Fortune Ascendante", "VIP : tourne la Roue du Nexus 3 fois aujourd'hui.",
    "Triple Ascendant Fortune", "VIP: spin the Nexus Wheel 3 times today.",
    "Triple Fortuna Ascendente", "VIP: gira la Rueda del Nexus 3 veces hoy.",
    "Dreifaches Ascendant-Glück", "VIP: drehe heute das Nexus-Rad 3 Mal.",
    "Tripla Fortuna Ascendente", "VIP: gira la Ruota del Nexus 3 volte oggi.",
    "Tripla Fortuna Ascendente", "VIP: gire a Roda do Nexus 3 vezes hoje.",
    "Drievoudig Ascendant-fortuin", "VIP: draai vandaag het Nexus-wiel 3 keer.",
    "三重の昇天運", "VIP：今日ネクサスの輪を3回回す。"],
  ["vip_daily_craft", "Forge Ascendante", "VIP : réussis 2 forges aujourd'hui.",
    "Ascendant Forge", "VIP: successfully forge 2 items today.",
    "Forja Ascendente", "VIP: completa 2 forjas hoy.",
    "Ascendant-Schmiede", "VIP: schmiede heute 2 erfolgreiche Items.",
    "Forgia Ascendente", "VIP: completa 2 forgiature oggi.",
    "Forja Ascendente", "VIP: conclua 2 forjas hoje.",
    "Ascendant-smederij", "VIP: voltooi vandaag 2 succesvolle smedingen.",
    "昇天の鍛冶", "VIP：今日2回鍛造に成功する。"],
  ["vip_weekly_forum", "Voix Souveraine", "VIP : poste 20 réponses sur la Tribune cette semaine.",
    "Sovereign Voice", "VIP: post 20 replies on the Tribune this week.",
    "Voz Soberana", "VIP: publica 20 respuestas en la Tribuna esta semana.",
    "Souveräne Stimme", "VIP: schreibe diese Woche 20 Antworten auf der Tribune.",
    "Voce Sovrana", "VIP: pubblica 20 risposte sulla Tribune questa settimana.",
    "Voz Soberana", "VIP: publique 20 respostas na Tribuna esta semana.",
    "Soevereine stem", "VIP: plaats deze week 20 reacties op het Tribune.",
    "主権の声", "VIP：今週トリビューンで20件返信する。"],
  ["vip_weekly_referral", "Ambassade de l'Ascendant", "VIP : parraine 2 nouveaux héros cette semaine.",
    "Ascendant Embassy", "VIP: refer 2 new heroes this week.",
    "Embajada del Ascendente", "VIP: patrocina 2 nuevos héroes esta semana.",
    "Ascendant-Botschaft", "VIP: wirb diese Woche 2 neue Helden.",
    "Ambasciata dell'Ascendente", "VIP: invita 2 nuovi eroi questa settimana.",
    "Embaixada do Ascendente", "VIP: indique 2 novos heróis esta semana.",
    "Ascendant-ambassade", "VIP: verwijs deze week 2 nieuwe helden.",
    "昇天者の使節", "VIP：今週新しい英雄を2人紹介する。"],
  ["vip_monthly_grind", "Légende Ascendante", "VIP : gagne 12000 XP ce mois.",
    "Ascendant Legend", "VIP: earn 12000 XP this month.",
    "Leyenda Ascendente", "VIP: gana 12000 XP este mes.",
    "Ascendant-Legende", "VIP: verdiene diesen Monat 12000 XP.",
    "Leggenda Ascendente", "VIP: guadagna 12000 XP questo mese.",
    "Lenda Ascendente", "VIP: ganhe 12000 XP este mês.",
    "Ascendant-legende", "VIP: verdien deze maand 12000 XP.",
    "昇天の伝説", "VIP：今月12000XPを獲得する。"],
];

const questRows = [];
for (const [id, frN, frD, enN, enD, esN, esD, deN, deD, itN, itD, ptN, ptD, nlN, nlD, jaN, jaD] of quests) {
  questRows.push([`quest.${id}.name`, langs({ fr: frN, en: enN, es: esN, de: deN, it: itN, pt: ptN, nl: nlN, ja: jaN })]);
  questRows.push([`quest.${id}.description`, langs({ fr: frD, en: enD, es: esD, de: deD, it: itD, pt: ptD, nl: nlD, ja: jaD })]);
}

writeFileSync(join(ROOT, "translations-quests-data.js"), emitModule("TRANSLATIONS_QUESTS_DATA", questRows));
console.log("quests:", questRows.length, "keys");

// ─── CHALLENGES (6 × 4 = 24 keys) ───
const challenges = [
  ["forum_echoes", "Échos du Conseil", "La communauté doit échanger 500 réponses sur les forums pour réveiller l'Oracle collectif.",
    "Réponses forum", "+200 XP · +100 Écus pour tous les héros",
    "Echoes of the Council", "The community must exchange 500 forum replies to awaken the collective Oracle.",
    "Forum replies", "+200 XP · +100 Écus for all heroes",
    "Ecos del Consejo", "La comunidad debe intercambiar 500 respuestas en los foros para despertar al Oráculo colectivo.",
    "Respuestas del foro", "+200 XP · +100 Écus para todos los héroes",
    "Echos des Rates", "Die Community muss 500 Forum-Antworten austauschen, um das kollektive Orakel zu erwecken.",
    "Forum-Antworten", "+200 XP · +100 Écus für alle Helden",
    "Echi del Consiglio", "La community deve scambiare 500 risposte nei forum per risvegliare l'Oracolo collettivo.",
    "Risposte forum", "+200 XP · +100 Écus per tutti gli eroi",
    "Ecos do Conselho", "A comunidade deve trocar 500 respostas nos fóruns para despertar o Oráculo coletivo.",
    "Respostas no fórum", "+200 XP · +100 Écus para todos os heróis",
    "Echo's van de Raad", "De community moet 500 forumreacties uitwisselen om het collectieve Orakel te wekken.",
    "Forumreacties", "+200 XP · +100 Écus voor alle helden",
    "評議会の反響", "コミュニティがフォーラムで500件の返信を交わし、集合オラクルを目覚めさせる。",
    "フォーラム返信", "全英雄に+200 XP · +100 エキュー"],
  ["forum_chronicles", "Chroniques du Royaume", "Ouvrir 80 nouveaux débats pour alimenter la mémoire vivante de NEXORIA.",
    "Sujets ouverts", "+150 XP · +75 Écus pour tous les héros",
    "Kingdom Chronicles", "Open 80 new debates to feed NEXORIA's living memory.",
    "Threads opened", "+150 XP · +75 Écus for all heroes",
    "Crónicas del Reino", "Abrir 80 nuevos debates para alimentar la memoria viva de NEXORIA.",
    "Hilos abiertos", "+150 XP · +75 Écus para todos los héroes",
    "Chroniken des Reiches", "Eröffne 80 neue Debatten, um NEXORIAs lebendiges Gedächtnis zu nähren.",
    "Eröffnete Themen", "+150 XP · +75 Écus für alle Helden",
    "Cronache del Regno", "Apri 80 nuovi dibattiti per alimentare la memoria vivente di NEXORIA.",
    "Topic aperti", "+150 XP · +75 Écus per tutti gli eroi",
    "Crônicas do Reino", "Abra 80 novos debates para alimentar a memória viva de NEXORIA.",
    "Tópicos abertos", "+150 XP · +75 Écus para todos os heróis",
    "Kronieken van het Rijk", "Open 80 nieuwe debatten om NEXORIA's levende geheugen te voeden.",
    "Geopende topics", "+150 XP · +75 Écus voor alle helden",
    "王国の年代記", "80件の新しい議論を開始し、NEXORIAの生きた記憶を育む。",
    "開かれたスレッド", "全英雄に+150 XP · +75 エキュー"],
  ["oracle_convergence", "Convergence Mystique", "300 consultations de l'Oracle pour percer le voile entre les mondes.",
    "Consultations", "+250 XP · +120 Écus pour tous les héros",
    "Mystic Convergence", "300 Oracle consultations to pierce the veil between worlds.",
    "Consultations", "+250 XP · +120 Écus for all heroes",
    "Convergencia Mística", "300 consultas al Oráculo para traspasar el velo entre los mundos.",
    "Consultas", "+250 XP · +120 Écus para todos los héroes",
    "Mystische Konvergenz", "300 Orakel-Konsultationen, um den Schleier zwischen den Welten zu durchdringen.",
    "Konsultationen", "+250 XP · +120 Écus für alle Helden",
    "Convergenza Mistica", "300 consultazioni dell'Oracolo per squarciare il velo tra i mondi.",
    "Consultazioni", "+250 XP · +120 Écus per tutti gli eroi",
    "Convergência Mística", "300 consultas ao Oráculo para perfurar o véu entre os mundos.",
    "Consultas", "+250 XP · +120 Écus para todos os heróis",
    "Mystieke convergentie", "300 Orakel-consultaties om de sluier tussen werelden te doorbreken.",
    "Consultaties", "+250 XP · +120 Écus voor alle helden",
    "神秘の収束", "オラクルを300回Consultし、世界間のベールを貫く。",
    "Consult回数", "全英雄に+250 XP · +120 エキュー"],
  ["guild_banners", "Bannières Unies", "200 messages échangés dans les guildes pour sceller l'alliance des ordres.",
    "Messages de guilde", "+300 XP · +150 Écus pour tous les héros",
    "United Banners", "200 messages exchanged in guilds to seal the alliance of orders.",
    "Guild messages", "+300 XP · +150 Écus for all heroes",
    "Estandartes Unidos", "200 mensajes intercambiados en gremios para sellar la alianza de las órdenes.",
    "Mensajes de gremio", "+300 XP · +150 Écus para todos los héroes",
    "Vereinte Banner", "200 Nachrichten in Gilden, um das Bündnis der Orden zu besiegeln.",
    "Gilden-Nachrichten", "+300 XP · +150 Écus für alle Helden",
    "Stendardi Uniti", "200 messaggi scambiati nelle gilde per sigillare l'alleanza degli ordini.",
    "Messaggi di gilda", "+300 XP · +150 Écus per tutti gli eroi",
    "Estandartes Unidas", "200 mensagens trocadas nas guildas para selar a aliança das ordens.",
    "Mensagens de guilda", "+300 XP · +150 Écus para todos os heróis",
    "Verenigde banieren", "200 berichten in gilden om het bondgenootschap der ordes te bezegelen.",
    "Gildeberichten", "+300 XP · +150 Écus voor alle helden",
    "団旗の結集", "ギルドで200件のメッセージを交わし、騎士団の同盟を固める。",
    "ギルドメッセージ", "全英雄に+300 XP · +150 エキュー"],
  ["fellowship_bonds", "Tisserands d'Amitié", "150 missives entre compagnons pour renforcer les liens du royaume.",
    "Missives envoyées", "+200 XP · +100 Écus pour tous les héros",
    "Friendship Weavers", "150 missives between companions to strengthen the kingdom's bonds.",
    "Missives sent", "+200 XP · +100 Écus for all heroes",
    "Tejedores de Amistad", "150 misivas entre compañeros para reforzar los lazos del reino.",
    "Misivas enviadas", "+200 XP · +100 Écus para todos los héroes",
    "Freundschaftsweber", "150 Boten zwischen Gefährten, um die Bande des Reiches zu stärken.",
    "Gesendete Boten", "+200 XP · +100 Écus für alle Helden",
    "Tessitori di Amicizia", "150 missive tra compagni per rafforzare i legami del regno.",
    "Missive inviate", "+200 XP · +100 Écus per tutti gli eroi",
    "Tecelões de Amizade", "150 missivas entre companheiros para fortalecer os laços do reino.",
    "Missivas enviadas", "+200 XP · +100 Écus para todos os heróis",
    "Vriendschapswevers", "150 boodschappen tussen metgezellen om de banden van het rijk te versterken.",
    "Verzonden boodschappen", "+200 XP · +100 Écus voor alle helden",
    "友情の織り手", "仲間間で150通の書簡を交わし、王国の絆を強める。",
    "送られた書簡", "全英雄に+200 XP · +100 エキュー"],
  ["forge_awakening", "Éveil des Forgerons", "500 forges collectives pour réveiller l'enclume cosmique du royaume.",
    "Forges réalisées", "+250 XP · +125 Écus pour tous les héros",
    "Forge Awakening", "500 collective forges to awaken the kingdom's cosmic anvil.",
    "Forges completed", "+250 XP · +125 Écus for all heroes",
    "Despertar de los Forjadores", "500 forjas colectivas para despertar el yunque cósmico del reino.",
    "Forjas realizadas", "+250 XP · +125 Écus para todos los héroes",
    "Erwachen der Schmiede", "500 kollektive Schmiedevorgänge, um den kosmischen Amboss des Reiches zu erwecken.",
    "Schmiedevorgänge", "+250 XP · +125 Écus für alle Helden",
    "Risveglio dei Forgiatori", "500 forgiature collettive per risvegliare l'incudine cosmica del regno.",
    "Forgiature completate", "+250 XP · +125 Écus per tutti gli eroi",
    "Despertar dos Forjadores", "500 forjas coletivas para despertar a bigorna cósmica do reino.",
    "Forjas realizadas", "+250 XP · +125 Écus para todos os heróis",
    "Smeedontwaking", "500 collectieve smedingen om de kosmische aambeeld van het rijk te wekken.",
    "Smedingen voltooid", "+250 XP · +125 Écus voor alle helden",
    "鍛冶師の覚醒", "500回の集合鍛造で、王国の宇宙の金床を目覚めさせる。",
    "完了した鍛造", "全英雄に+250 XP · +125 エキュー"],
];

const challengeRows = [];
for (const [id, frN, frD, frA, frR, enN, enD, enA, enR, esN, esD, esA, esR, deN, deD, deA, deR, itN, itD, itA, itR, ptN, ptD, ptA, ptR, nlN, nlD, nlA, nlR, jaN, jaD, jaA, jaR] of challenges) {
  const base = { fr: frN, en: enN, es: esN, de: deN, it: itN, pt: ptN, nl: nlN, ja: jaN };
  challengeRows.push([`challenge.${id}.name`, { ...base }]);
  challengeRows.push([`challenge.${id}.description`, { fr: frD, en: enD, es: esD, de: deD, it: itD, pt: ptD, nl: nlD, ja: jaD }]);
  challengeRows.push([`challenge.${id}.action_label`, { fr: frA, en: enA, es: esA, de: deA, it: itA, pt: ptA, nl: nlA, ja: jaA }]);
  challengeRows.push([`challenge.${id}.reward_label`, { fr: frR, en: enR, es: esR, de: deR, it: itR, pt: ptR, nl: nlR, ja: jaR }]);
}

writeFileSync(join(ROOT, "translations-challenges-data.js"), emitModule("TRANSLATIONS_CHALLENGES_DATA", challengeRows));
console.log("challenges:", challengeRows.length, "keys");

// ─── CLASSES ───
const classRows = [];

// page.classes UI
classRows.push(["page.classes.bannerTitle", langs({
  fr: "CLASSES HÉROÏQUES", en: "HEROIC CLASSES", es: "CLASES HEROICAS", de: "HELDENKLASSEN",
  it: "CLASSI EROICHE", pt: "CLASSES HEROICAS", nl: "HELDENKLASSEN", ja: "英雄のクラス",
})]);
classRows.push(["page.classes.bannerSub", langs({
  fr: "12 archétypes — 6 affinités", en: "12 archetypes — 6 affinities", es: "12 arquetipos — 6 afinidades",
  de: "12 Archetypen — 6 Affinitäten", it: "12 archetipi — 6 affinità", pt: "12 arquétipos — 6 afinidades",
  nl: "12 archetypen — 6 affiniteiten", ja: "12のアーキタイプ — 6の親和性",
})]);
classRows.push(["page.classes.currentBadge", langs({
  fr: "Ta classe", en: "Your class", es: "Tu clase", de: "Deine Klasse",
  it: "La tua classe", pt: "Sua classe", nl: "Jouw klasse", ja: "あなたのクラス",
})]);
classRows.push(["page.classes.currentLabel", langs({
  fr: "Ta classe actuelle :", en: "Your current class:", es: "Tu clase actual:", de: "Deine aktuelle Klasse:",
  it: "La tua classe attuale:", pt: "Sua classe atual:", nl: "Je huidige klasse:", ja: "現在のクラス：",
})]);
classRows.push(["page.classes.viewGrimoire", langs({
  fr: "Voir le grimoire", en: "View grimoire", es: "Ver el grimorio", de: "Grimoire ansehen",
  it: "Vedi il grimorio", pt: "Ver o grimório", nl: "Grimoire bekijken", ja: "グリモワールを見る",
})]);
classRows.push(["page.classes.codexTitle", langs({
  fr: "Codex des Voies", en: "Codex of Paths", es: "Códice de las Vías", de: "Kodex der Pfade",
  it: "Codex delle Vie", pt: "Codex dos Caminhos", nl: "Codex der Paden", ja: "道のコーデックス",
})]);
classRows.push(["page.classes.codexSub", langs({
  fr: "14 archétypes — 8 affinités", en: "14 archetypes — 8 affinities", es: "14 arquetipos — 8 afinidades",
  de: "14 Archetypen — 8 Affinitäten", it: "14 archetipi — 8 affinità", pt: "14 arquétipos — 8 afinidades",
  nl: "14 archetypen — 8 affiniteiten", ja: "14のアーキタイプ — 8の親和性",
})]);
classRows.push(["page.classes.filterAll", langs({
  fr: "TOUTES", en: "ALL", es: "TODAS", de: "ALLE", it: "TUTTE", pt: "TODAS", nl: "ALLE", ja: "すべて",
})]);

// grimoire UI
classRows.push(["grimoire.affinitiesTitle", langs({
  fr: "Affinités cosmiques", en: "Cosmic affinities", es: "Afinidades cósmicas", de: "Kosmische Affinitäten",
  it: "Affinità cosmiche", pt: "Afinidades cósmicas", nl: "Kosmische affiniteiten", ja: "宇宙の親和性",
})]);
classRows.push(["grimoire.powersTitle", langs({
  fr: "Pouvoirs de la Voie", en: "Path Powers", es: "Poderes del Camino", de: "Kräfte des Pfades",
  it: "Poteri della Via", pt: "Poderes do Caminho", nl: "Krachten van het Pad", ja: "道の力",
})]);
classRows.push(["grimoire.gmTitle", langs({
  fr: "Conseils du Maître de Jeu", en: "Game Master Advice", es: "Consejos del Master", de: "Rat des Spielleiters",
  it: "Consigli del Master", pt: "Conselhos do Mestre", nl: "Advies van de Spelleider", ja: "ゲームマスターの助言",
})]);
classRows.push(["grimoire.gmAdvice", langs({
  fr: "Les héros de la voie {{className}} excellent dans les actions liées à leurs affinités cosmiques. Investis tes points de talent dans l'Arbre des Voies pour multiplier ces bonus, et grave ton nom dans le Hall des Légendes.",
  en: "Heroes of the {{className}} path excel in actions tied to their cosmic affinities. Invest talent points in the Path Tree to multiply these bonuses, and carve your name in the Hall of Legends.",
  es: "Los héroes del camino {{className}} destacan en acciones ligadas a sus afinidades cósmicas. Invierte puntos de talento en el Árbol de las Vías para multiplicar estos bonos y graba tu nombre en el Salón de las Leyendas.",
  de: "Helden des Pfades {{className}} glänzen bei Aktionen, die an ihre kosmischen Affinitäten gebunden sind. Investiere Talentpunkte in den Pfad-Baum, um diese Boni zu vervielfachen, und verewige deinen Namen in der Halle der Legenden.",
  it: "Gli eroi della via {{className}} eccellono nelle azioni legate alle loro affinità cosmiche. Investi punti talento nell'Albero delle Vie per moltiplicare questi bonus e incidi il tuo nome nella Sala delle Leggende.",
  pt: "Heróis do caminho {{className}} se destacam em ações ligadas às suas afinidades cósmicas. Invista pontos de talento na Árvore dos Caminhos para multiplicar esses bônus e grave seu nome no Salão das Lendas.",
  nl: "Helden van het {{className}}-pad blinken uit in acties gekoppeld aan hun kosmische affiniteiten. Investeer talentpunten in de Padenboom om deze bonussen te vermenigvuldigen en graveer je naam in de Hal der Legendes.",
  ja: "{{className}}の道の英雄は、宇宙の親和性に結びついた行動で卓越します。道の樹にタレントポイントを投資してボーナスを増幅し、伝説の殿堂に名を刻みましょう。",
})]);

// affinities
const affinities = [
  ["creativity", "Créativité", "Creativity", "Creatividad", "Kreativität", "Creatività", "Criatividade", "Creativiteit", "創造性"],
  ["persistence", "Persévérance", "Persistence", "Perseverancia", "Ausdauer", "Perseveranza", "Perseverança", "Volharding", "忍耐"],
  ["curiosity", "Curiosité", "Curiosity", "Curiosidad", "Neugier", "Curiosità", "Curiosidade", "Nieuwsgierigheid", "好奇心"],
  ["leadership", "Leadership", "Leadership", "Liderazgo", "Führung", "Leadership", "Liderança", "Leiderschap", "リーダーシップ"],
  ["sociability", "Sociabilité", "Sociability", "Sociabilidad", "Geselligkeit", "Socievolezza", "Sociabilidade", "Gezelligheid", "社交性"],
  ["ambition", "Ambition", "Ambition", "Ambición", "Ambition", "Ambizione", "Ambição", "Ambitie", "野心"],
  ["expertise", "Expertise", "Expertise", "Pericia", "Expertise", "Competenza", "Perícia", "Vakmanschap", "専門性"],
  ["discovery", "Découverte", "Discovery", "Descubrimiento", "Entdeckung", "Scoperta", "Descoberta", "Ontdekking", "発見"],
];
for (const [id, fr, en, es, de, it, pt, nl, ja] of affinities) {
  classRows.push([`affinity.${id}`, langs({ fr, en, es, de, it, pt, nl, ja })]);
}

// classes + powers from game_data.py
const classes = {
  mage: {
    tagline: ["Maître des arcanes et des éléments", "Master of arcana and the elements", "Maestro de los arcanos y los elementos", "Meister der Arkana und Elemente", "Maestro degli arcani e degli elementi", "Mestre dos arcanos e dos elementos", "Meester van arcanen en elementen", "秘術と元素の達人"],
    powers: {
      arcane_surge: ["Surtension Arcane", "+25% XP gagné depuis l'Oracle des Quêtes", "Arcane Surge", "+25% XP earned from the Quest Oracle", "Sobrecarga Arcana", "+25% XP ganado desde el Oráculo de Misiones", "Arkaner Überschuss", "+25% XP vom Quest-Orakel", "Sovraccarico Arcano", "+25% XP dall'Oracolo delle Missioni", "Surto Arcano", "+25% XP do Oráculo de Missões", "Arcane Overspanning", "+25% XP van het Quest-Orakel", "秘術の過負荷", "クエストオラクルから+25% XP"],
      spell_mastery: ["Maîtrise des Sorts", "Double XP sur toutes les quêtes de type oracle_log", "Spell Mastery", "Double XP on all oracle_log quest types", "Maestría de Hechizos", "Doble XP en misiones tipo oracle_log", "Zaubermeisterschaft", "Doppelte XP bei allen oracle_log-Quests", "Maestria degli Incantesimi", "Doppio XP su tutte le missioni oracle_log", "Maestria de Feitiços", "Dobro de XP em missões oracle_log", "Spreukbeheersing", "Dubbele XP op alle oracle_log-quests", "呪文の熟練", "oracle_log系クエストでXP2倍"],
      mana_resonance: ["Résonance Mana", "+10 DNA Créativité bonus à chaque niveau", "Mana Resonance", "+10 Creativity DNA bonus per level", "Resonancia de Maná", "+10 ADN Creatividad bonus por nivel", "Mana-Resonanz", "+10 Kreativitäts-DNA-Bonus pro Stufe", "Risonanza del Mana", "+10 DNA Creatività bonus per livello", "Ressonância de Mana", "+10 DNA Criatividade bônus por nível", "Mana-resonantie", "+10 Creativiteit-DNA-bonus per level", "マナ共鳴", "レベルごとに創造性DNA+10"],
    },
  },
  warrior: {
    tagline: ["Force brute et honneur du combat", "Raw strength and combat honor", "Fuerza bruta y honor de combate", "Rohe Kraft und Kampfehre", "Forza bruta e onore del combattimento", "Força bruta e honra de combate", "Ruwe kracht en gevechtseer", "蛮力と戦の名誉"],
    powers: {
      iron_will: ["Volonté de Fer", "+15% XP gagné depuis les quêtes forum_thread", "Iron Will", "+15% XP from forum_thread quests", "Voluntad de Hierro", "+15% XP de misiones forum_thread", "Eiserner Wille", "+15% XP von forum_thread-Quests", "Volontà di Ferro", "+15% XP dalle missioni forum_thread", "Vontade de Ferro", "+15% XP de missões forum_thread", "IJzeren Wil", "+15% XP van forum_thread-quests", "鉄の意志", "forum_threadクエストから+15% XP"],
      rally_cry: ["Cri de Ralliement", "+2 Réputation pour chaque membre invité en guilde", "Rally Cry", "+2 Reputation for each guild member invited", "Grito de Ralliement", "+2 Reputación por cada miembro invitado a la gremio", "Ruf zum Sammeln", "+2 Ruf pro eingeladenem Gildenmitglied", "Grido di Raduno", "+2 Reputazione per ogni membro invitato in gilda", "Grito de Rali", "+2 Reputação por membro convidado na guilda", "Oproep tot Verzameling", "+2 Reputatie per uitgenodigd gildelid", "集結の叫び", "ギルド招待メンバー1人につき評判+2"],
      unbreakable: ["Inébranlable", "+10 DNA Persévérance bonus à chaque niveau", "Unbreakable", "+10 Persistence DNA bonus per level", "Inquebrantable", "+10 ADN Perseverancia bonus por nivel", "Unzerbrechlich", "+10 Ausdauer-DNA-Bonus pro Stufe", "Infrangibile", "+10 DNA Perseveranza bonus per livello", "Inquebrável", "+10 DNA Perseverança bônus por nível", "Onverwoestbaar", "+10 Volharding-DNA-bonus per level", "不屈", "レベルごとに忍耐DNA+10"],
    },
  },
  assassin: {
    tagline: ["Ombre silencieuse, lame précise", "Silent shadow, precise blade", "Sombra silenciosa, hoja precisa", "Stille Schatten, präzise Klinge", "Ombra silenziosa, lama precisa", "Sombra silenciosa, lâmina precisa", "Stille schaduw, precieze kling", "静かな影、精密な刃"],
    powers: {
      shadow_step: ["Pas de l'Ombre", "Détecte les failles dimensionnelles avec 2× plus de chances", "Shadow Step", "Detect dimensional rifts with 2× higher chance", "Paso de Sombra", "Detecta grietas dimensionales con 2× más probabilidad", "Schattenschritt", "Erkennt Dimensionsrisse mit 2× höherer Chance", "Passo d'Ombra", "Rileva fenditure dimensionali con probabilità 2×", "Passo das Sombras", "Detecta fendas dimensionais com 2× mais chance", "Schaduwstap", "Detecteert dimensionale scheuren met 2× kans", "影歩き", "次元の亀裂を2倍の確率で発見"],
      precision: ["Précision", "+20% Écus gagnés lors de l'exploration du Nexus", "Precision", "+20% Écus earned while exploring the Nexus", "Precisión", "+20% Écus ganados al explorar el Nexus", "Präzision", "+20% Écus bei Nexus-Erkundung", "Precisione", "+20% Écus esplorando il Nexus", "Precisão", "+20% Écus ao explorar o Nexus", "Precisie", "+20% Écus bij Nexus-verkenning", "精密", "ネクサス探索で+20% エキュー"],
      vanish: ["Disparition", "+10 DNA Curiosité bonus à chaque niveau", "Vanish", "+10 Curiosity DNA bonus per level", "Desaparición", "+10 ADN Curiosidad bonus por nivel", "Verschwinden", "+10 Neugier-DNA-Bonus pro Stufe", "Scomparsa", "+10 DNA Curiosità bonus per livello", "Desaparecer", "+10 DNA Curiosidade bônus por nível", "Verdwijnen", "+10 Nieuwsgierigheid-DNA-bonus per level", "消失", "レベルごとに好奇心DNA+10"],
    },
  },
  paladin: {
    tagline: ["Gardien de la lumière et de la justice", "Guardian of light and justice", "Guardián de la luz y la justicia", "Hüter des Lichts und der Gerechtigkeit", "Guardiano della luce e della giustizia", "Guardião da luz e da justiça", "Bewaker van licht en rechtvaardigheid", "光と正義の守護者"],
    powers: {
      divine_aura: ["Aura Divine", "+30 XP bonus pour chaque nouveau héros parrainé", "Divine Aura", "+30 XP bonus for each new hero referred", "Aura Divina", "+30 XP bonus por cada héroe referido", "Göttliche Aura", "+30 XP-Bonus pro geworbenem Helden", "Aura Divina", "+30 XP bonus per ogni eroe invitato", "Aura Divina", "+30 XP bônus por herói indicado", "Goddelijke Aura", "+30 XP-bonus per nieuwe held", "神聖なるオーラ", "紹介した新英雄1人につき+30 XP"],
      holy_shield: ["Bouclier Sacré", "+2 Réputation reçue sur chaque post du fil", "Holy Shield", "+2 Reputation received on each thread post", "Escudo Sagrado", "+2 Reputación por cada post en el hilo", "Heiliger Schild", "+2 Ruf pro Beitrag im Thema", "Scudo Sacro", "+2 Reputazione per ogni post nel topic", "Escudo Sagrado", "+2 Reputação por post no tópico", "Heilig Schild", "+2 Reputatie per bericht in topic", "聖なる盾", "スレッド投稿1件につき評判+2"],
      oath: ["Serment", "+10 DNA Leadership bonus à chaque niveau", "Oath", "+10 Leadership DNA bonus per level", "Juramento", "+10 ADN Liderazgo bonus por nivel", "Eid", "+10 Führungs-DNA-Bonus pro Stufe", "Giuramento", "+10 DNA Leadership bonus per livello", "Juramento", "+10 DNA Liderança bônus por nível", "Eed", "+10 Leiderschap-DNA-bonus per level", "誓い", "レベルごとにリーダーシップDNA+10"],
    },
  },
  alchemist: {
    tagline: ["Transmuteur des éléments oubliés", "Transmuter of forgotten elements", "Transmutador de elementos olvidados", "Transmutator vergessener Elemente", "Trasmutatore degli elementi dimenticati", "Transmutador dos elementos esquecidos", "Transmutator van vergeten elementen", "忘れられた元素の錬金術師"],
    powers: {
      transmutation: ["Transmutation", "Coffres ouverts garantissent au moins 1 objet Rare", "Transmutation", "Opened chests guarantee at least 1 Rare item", "Transmutación", "Los cofres abiertos garantizan al menos 1 objeto Raro", "Transmutation", "Geöffnete Truhen garantieren mindestens 1 Seltenes Item", "Trasmutazione", "I forzieri aperti garantiscono almeno 1 oggetto Raro", "Transmutação", "Baús abertos garantem pelo menos 1 item Raro", "Transmutatie", "Geopende kisten garanderen minstens 1 Zeldzaam item", "変換", "開いた宝箱は最低1つのレアアイテムを保証"],
      elixir_craft: ["Élixir Maître", "+25% durée des boosts achetés en boutique", "Master Elixir", "+25% duration of shop-purchased boosts", "Elixir Maestro", "+25% duración de potenciadores comprados en tienda", "Meisterelixier", "+25% Dauer gekaufter Shop-Boosts", "Elixir Maestro", "+25% durata dei potenziamenti acquistati", "Elixir Mestre", "+25% duração de boosts comprados na loja", "Meesterelixer", "+25% duur van gekochte shop-boosts", "極意のエリクサー", "ショップ購入ブーストの持続+25%"],
      catalyst: ["Catalyseur", "+10 DNA Expertise bonus à chaque niveau", "Catalyst", "+10 Expertise DNA bonus per level", "Catalizador", "+10 ADN Pericia bonus por nivel", "Katalysator", "+10 Expertise-DNA-Bonus pro Stufe", "Catalizzatore", "+10 DNA Competenza bonus per livello", "Catalisador", "+10 DNA Perícia bônus por nível", "Katalysator", "+10 Vakmanschap-DNA-bonus per level", "触媒", "レベルごとに専門性DNA+10"],
    },
  },
  explorer: {
    tagline: ["Cartographe des mondes inconnus", "Cartographer of unknown worlds", "Cartógrafo de mundos desconocidos", "Kartograph unbekannter Welten", "Cartografo dei mondi ignoti", "Cartógrafo dos mundos desconhecidos", "Cartograaf van onbekende werelden", "未知の世界の地図製作者"],
    powers: {
      pathfinder: ["Éclaireur", "Révèle les failles 2× plus souvent (cooldown réduit)", "Pathfinder", "Reveals rifts 2× more often (reduced cooldown)", "Explorador", "Revela grietas 2× más a menudo (enfriamiento reducido)", "Pfadfinder", "Enthüllt Risse 2× häufiger (kürzere Abklingzeit)", "Esploratore", "Rivela fenditure 2× più spesso (cooldown ridotto)", "Desbravador", "Revela fendas 2× mais (cooldown reduzido)", "Padvinder", "Onthult scheuren 2× vaker (kortere cooldown)", "開拓者", "亀裂を2倍の頻度で発見（クールダウン短縮）"],
      treasure_sense: ["Sens du Trésor", "+10% chance d'objet Épique dans les coffres", "Treasure Sense", "+10% chance of Epic item in chests", "Sentido del Tesoro", "+10% probabilidad de objeto Épico en cofres", "Schatzsinn", "+10% Chance auf Episches Item in Truhen", "Senso del Tesoro", "+10% probabilità oggetto Epico nei forzieri", "Senso do Tesouro", "+10% chance de item Épico em baús", "Schatzgevoel", "+10% kans op Episch item in kisten", "宝の嗅覚", "宝箱でエピックアイテム+10%"],
      wanderlust: ["Soif d'Aventure", "+10 DNA Curiosité bonus à chaque niveau", "Wanderlust", "+10 Curiosity DNA bonus per level", "Sed de Aventura", "+10 ADN Curiosidad bonus por nivel", "Fernweh", "+10 Neugier-DNA-Bonus pro Stufe", "Sete di Avventura", "+10 DNA Curiosità bonus per livello", "Sede de Aventura", "+10 DNA Curiosidade bônus por nível", "Reislust", "+10 Nieuwsgierigheid-DNA-bonus per level", "冒険心", "レベルごとに好奇心DNA+10"],
    },
  },
  necromancer: {
    tagline: ["Maître des âmes et des cycles", "Master of souls and cycles", "Maestro de almas y ciclos", "Meister der Seelen und Zyklen", "Maestro delle anime e dei cicli", "Mestre das almas e dos ciclos", "Meester van zielen en cycli", "魂と輪廻の支配者"],
    powers: {
      soul_harvest: ["Moisson des Âmes", "+30 XP bonus pour chaque quête réactivée (relancée)", "Soul Harvest", "+30 XP bonus for each reactivated (restarted) quest", "Cosecha de Almas", "+30 XP bonus por cada misión reactivada", "Seelenernte", "+30 XP-Bonus pro reaktivierter Quest", "Mietitura delle Anime", "+30 XP bonus per ogni missione riattivata", "Colheita de Almas", "+30 XP bônus por missão reativada", "Zielenoogst", "+30 XP-bonus per gereactiveerde quest", "魂の収穫", "再開したクエスト1件につき+30 XP"],
      undying_will: ["Volonté Impérissable", "Récupère 50% de l'XP perdue sur les quêtes expirées", "Undying Will", "Recovers 50% of XP lost on expired quests", "Voluntad Imperecedera", "Recupera 50% del XP perdido en misiones expiradas", "Unsterblicher Wille", "Stellt 50% verlorener XP bei abgelaufenen Quests wieder her", "Volontà Imperitura", "Recupera il 50% dell'XP perso sulle missioni scadute", "Vontade Imperecedora", "Recupera 50% do XP perdido em missões expiradas", "Onsterfelijke Wil", "Herstelt 50% verloren XP bij verlopen quests", "不滅の意志", "期限切れクエストで失ったXPの50%を回復"],
      dark_mastery: ["Maîtrise Obscure", "+10 DNA Ambition bonus à chaque niveau", "Dark Mastery", "+10 Ambition DNA bonus per level", "Maestría Oscura", "+10 ADN Ambición bonus por nivel", "Dunkle Meisterschaft", "+10 Ambitions-DNA-Bonus pro Stufe", "Maestria Oscura", "+10 DNA Ambizione bonus per livello", "Maestria Sombria", "+10 DNA Ambição bônus por nível", "Duistere Meesterschap", "+10 Ambitie-DNA-bonus per level", "闇の熟練", "レベルごとに野心DNA+10"],
    },
  },
  architect: {
    tagline: ["Bâtisseur des cités éternelles", "Builder of eternal cities", "Constructor de ciudades eternas", "Erbauer ewiger Städte", "Costruttore di città eternelle", "Construtor de cidades eternas", "Bouwer van eeuwige steden", "永遠の都市の建築家"],
    powers: {
      blueprint: ["Plans du Maître", "-10% coût Écus sur toutes les améliorations du Royaume", "Master Blueprint", "-10% Écus cost on all Kingdom upgrades", "Planos del Maestro", "-10% costo en Écus en mejoras del Reino", "Meisterplan", "-10% Écus-Kosten bei allen Königreich-Upgrades", "Progetto del Maestro", "-10% costo Écus su tutti gli upgrade del Regno", "Plantas do Mestre", "-10% custo em Écus em melhorias do Reino", "Meesterplan", "-10% Écus-kosten op alle Koninkrijk-upgrades", "匠の設計図", "王国アップグレードのエキュー費用-10%"],
      grand_design: ["Grand Dessein", "+50% revenus passifs des bâtiments du Royaume", "Grand Design", "+50% passive income from Kingdom buildings", "Gran Diseño", "+50% ingresos pasivos de edificios del Reino", "Großer Entwurf", "+50% passives Einkommen von Königreich-Gebäuden", "Grande Disegno", "+50% entrate passive dagli edifici del Regno", "Grande Desenho", "+50% renda passiva dos edifícios do Reino", "Groot Ontwerp", "+50% passief inkomen van Koninkrijk-gebouwen", "壮大な設計", "王国建物のパッシブ収入+50%"],
      legacy: ["Héritage", "+10 DNA Créativité bonus à chaque niveau", "Legacy", "+10 Creativity DNA bonus per level", "Legado", "+10 ADN Creatividad bonus por nivel", "Vermächtnis", "+10 Kreativitäts-DNA-Bonus pro Stufe", "Eredità", "+10 DNA Creatività bonus per livello", "Legado", "+10 DNA Criatividade bônus por nível", "Nalatenschap", "+10 Creativiteit-DNA-bonus per level", "遺産", "レベルごとに創造性DNA+10"],
    },
  },
  chronomancer: {
    tagline: ["Tisseur du temps et des destinées", "Weaver of time and destinies", "Tejedor del tiempo y los destinos", "Weber von Zeit und Schicksalen", "Tessitore del tempo e dei destini", "Tecelão do tempo e dos destinos", "Wever van tijd en lot", "時間と運命の織り手"],
    powers: {
      time_warp: ["Distorsion Temporelle", "Étend la durée des quêtes journalières de +4h", "Time Warp", "Extends daily quest duration by +4h", "Distorsión Temporal", "Extiende la duración de misiones diarias +4h", "Zeitverzerrung", "Verlängert tägliche Quest-Dauer um +4h", "Distorsione Temporale", "Estende la durata delle missioni giornaliere di +4h", "Distorção Temporal", "Estende duração de missões diárias em +4h", "Tijdvervorming", "Verlengt dagelijkse quest-duur met +4u", "時間歪曲", "デイリークエストの持続時間+4時間"],
      foresight: ["Prescience", "+20% XP pendant les événements saisonniers actifs", "Foresight", "+20% XP during active seasonal events", "Presciencia", "+20% XP durante eventos estacionales activos", "Voraussicht", "+20% XP während aktiver Saison-Events", "Prescienza", "+20% XP durante eventi stagionali attivi", "Presciência", "+20% XP durante eventos sazonais ativos", "Vooruitziendheid", "+20% XP tijdens actieve seizoensevents", "先見", "アクティブな季節イベント中XP+20%"],
      temporal_echo: ["Écho Temporel", "+10 DNA Expertise bonus à chaque niveau", "Temporal Echo", "+10 Expertise DNA bonus per level", "Eco Temporal", "+10 ADN Pericia bonus por nivel", "Zeitecho", "+10 Expertise-DNA-Bonus pro Stufe", "Eco Temporale", "+10 DNA Competenza bonus per livello", "Eco Temporal", "+10 DNA Perícia bônus por nível", "Tijdecho", "+10 Vakmanschap-DNA-bonus per level", "時間の反響", "レベルごとに専門性DNA+10"],
    },
  },
  inventor: {
    tagline: ["Génie des engrenages et des merveilles", "Genius of gears and wonders", "Genio de engranajes y maravillas", "Genie der Zahnräder und Wunder", "Genio degli ingranaggi e delle meraviglie", "Gênio das engrenagens e maravilhas", "Genie van tandwielen en wonderen", "歯車と奇跡の天才"],
    powers: {
      overclocked: ["Surchargé", "+20% Écus passifs générés par la Mine d'Écus", "Overclocked", "+20% passive Écus from the Écu Mine", "Sobrecargado", "+20% Écus pasivos de la Mina de Écus", "Übertaktet", "+20% passive Écus von der Écu-Mine", "Sovralimentato", "+20% Écus passivi dalla Miniera di Écus", "Sobrecarregado", "+20% Écus passivos da Mina de Écus", "Overgeklokt", "+20% passieve Écus van de Écu-mijn", "オーバークロック", "エキュー鉱山のパッシブエキュー+20%"],
      gadget_forge: ["Forge à Gadgets", "+1 emplacement d'inventaire offert tous les 10 niveaux", "Gadget Forge", "+1 free inventory slot every 10 levels", "Forja de Gadgets", "+1 espacio de inventario gratis cada 10 niveles", "Gadget-Schmiede", "+1 freier Inventarplatz alle 10 Stufen", "Forgia di Gadget", "+1 slot inventario gratuito ogni 10 livelli", "Forja de Gadgets", "+1 slot de inventário grátis a cada 10 níveis", "Gadget-smederij", "+1 gratis inventarisplek elke 10 levels", "ガジェット工房", "10レベルごとにインベントリ枠+1"],
      eureka: ["Eurêka !", "+10 DNA Ambition bonus à chaque niveau", "Eureka!", "+10 Ambition DNA bonus per level", "¡Eureka!", "+10 ADN Ambición bonus por nivel", "Eureka!", "+10 Ambitions-DNA-Bonus pro Stufe", "Eureka!", "+10 DNA Ambizione bonus per livello", "Eureka!", "+10 DNA Ambição bônus por nível", "Eureka!", "+10 Ambitie-DNA-bonus per level", "エUREKA！", "レベルごとに野心DNA+10"],
    },
  },
};

for (const [classId, data] of Object.entries(classes)) {
  const [frT, enT, esT, deT, itT, ptT, nlT, jaT] = data.tagline;
  classRows.push([`class.${classId}.tagline`, langs({ fr: frT, en: enT, es: esT, de: deT, it: itT, pt: ptT, nl: nlT, ja: jaT })]);
  for (const [powerId, [frN, frD, enN, enD, esN, esD, deN, deD, itN, itD, ptN, ptD, nlN, nlD, jaN, jaD]] of Object.entries(data.powers)) {
    classRows.push([`class.${classId}.power.${powerId}.name`, langs({ fr: frN, en: enN, es: esN, de: deN, it: itN, pt: ptN, nl: nlN, ja: jaN })]);
    classRows.push([`class.${classId}.power.${powerId}.description`, langs({ fr: frD, en: enD, es: esD, de: deD, it: itD, pt: ptD, nl: nlD, ja: jaD })]);
  }
}

writeFileSync(join(ROOT, "translations-classes-data.js"), emitModule("TRANSLATIONS_CLASSES_DATA", classRows));
console.log("classes:", classRows.length, "keys");
console.log("Done.");
