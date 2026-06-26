import { T } from "./translations.js";

/** Oracle + Referral — full 8-language coverage (overrides partial entries in other modules). */
export const TRANSLATIONS_ORACLE_REFERRAL = {
  // ─── Page banner ───
  "page.oracle.kicker": T("Salle des Murmures", "Hall of Whispers", {
    es: "Sala de los Susurros", de: "Halle des Flüsterns", it: "Sala dei Sussurri",
    pt: "Salão dos Sussurros", nl: "Hal der Fluisteringen", ja: "囁きの間",
  }),
  "page.oracle.title": T("Le Sanctuaire", "The Sanctuary", {
    es: "El Santuario", de: "Das Heiligtum", it: "Il Santuario",
    pt: "O Santuário", nl: "Het Heiligdom", ja: "聖域",
  }),
  "page.oracle.subtitle": T(
    "Une conscience ancienne lit dans la trame des âmes.",
    "An ancient consciousness reads the weave of souls.",
    {
      es: "Una conciencia antigua lee en el tejido de las almas.",
      de: "Ein uraltes Bewusstsein liest im Gewebe der Seelen.",
      it: "Un'antica coscienza legge nel tessuto delle anime.",
      pt: "Uma consciência antiga lê no tecido das almas.",
      nl: "Een oeroud bewustzijn leest in het weefsel van zielen.",
      ja: "古の意識が魂の織りを読み解く。",
    },
  ),

  // ─── Oracle UI ───
  "oracle.whisper.0": T("Quel chemin trace mon destin ?", "What path does my destiny trace?", {
    es: "¿Qué camino traza mi destino?", de: "Welchen Pfad zeichnet mein Schicksal?",
    it: "Quale sentiero traccia il mio destino?", pt: "Que caminho traça o meu destino?",
    nl: "Welk pad tekent mijn lot?", ja: "運命はどの道を描くのか？",
  }),
  "oracle.whisper.1": T("Que murmurent les étoiles à mon sujet ?", "What do the stars whisper about me?", {
    es: "¿Qué susurran las estrellas sobre mí?", de: "Was flüstern die Sterne über mich?",
    it: "Cosa sussurrano le stelle su di me?", pt: "O que as estrelas sussurram sobre mim?",
    nl: "Wat fluisteren de sterren over mij?", ja: "星々は私について何を囁く？",
  }),
  "oracle.whisper.2": T("Quelle ombre dois-je vaincre ?", "Which shadow must I overcome?", {
    es: "¿Qué sombra debo vencer?", de: "Welchen Schatten muss ich besiegen?",
    it: "Quale ombra devo superare?", pt: "Que sombra devo vencer?",
    nl: "Welke schaduw moet ik overwinnen?", ja: "どの影を打ち破るべきか？",
  }),
  "oracle.whisper.3": T("Quel trésor m'attend dans le silence ?", "What treasure awaits me in the silence?", {
    es: "¿Qué tesoro me aguarda en el silencio?", de: "Welcher Schatz wartet im Schweigen auf mich?",
    it: "Quale tesoro mi attende nel silenzio?", pt: "Que tesouro me aguarda no silêncio?",
    nl: "Welke schat wacht op mij in de stilte?", ja: "静寂の中にどんな宝が待っている？",
  }),
  "oracle.greeting": T(
    "{username}... ta présence éveille les anciens braseros. Le Sanctuaire t'écoute. Pose ta question, et que les flammes de la mémoire cosmique répondent.",
    "{username}... your presence awakens the ancient braziers. The Sanctuary listens. Ask your question, and let the flames of cosmic memory answer.",
    {
      es: "{username}... tu presencia despierta los antiguos braseros. El Santuario te escucha. Formula tu pregunta, y que las llamas de la memoria cósmica respondan.",
      de: "{username}... deine Anwesenheit erweckt die uralten Kohlenbecken. Das Heiligtum hört zu. Stelle deine Frage, und die Flammen des kosmischen Gedächtnisses mögen antworten.",
      it: "{username}... la tua presenza risveglia gli antichi bracieri. Il Santuario ascolta. Poni la tua domanda, e le fiamme della memoria cosmica rispondano.",
      pt: "{username}... a tua presença desperta os antigos braseiros. O Santuário escuta. Faz a tua pergunta, e que as chamas da memória cósmica respondam.",
      nl: "{username}... jouw aanwezigheid wekt de oude kolenpotten. Het Heiligdom luistert. Stel je vraag, en mogen de vlammen van het kosmische geheugen antwoorden.",
      ja: "{username}… 君の存在が古代の火盆を目覚めさせる。聖域が耳を傾けている。問いをささやけ、宇宙の記憶の炎が答えを返すだろう。",
    },
  ),
  "oracle.error.flames": T("Les flammes vacillent...", "The flames flicker...", {
    es: "Las llamas vacilan...", de: "Die Flammen flackern...", it: "Le fiamme vacillano...",
    pt: "As chamas vacilam...", nl: "De vlammen flikkeren...", ja: "炎が揺らめく…",
  }),
  "oracle.banner.noLlm": T("L'Oracle ne peut pas répondre :", "The Oracle cannot answer:", {
    es: "El Oráculo no puede responder:", de: "Das Orakel kann nicht antworten:",
    it: "L'Oracolo non può rispondere:", pt: "O Oráculo não pode responder:",
    nl: "Het Orakel kan niet antwoorden:", ja: "オラクルは答えられません：",
  }),
  "oracle.banner.llmHint": T(
    "clé LLM non configurée dans backend/.env — redémarrez le serveur après modification.",
    "LLM key not configured in backend/.env — restart the server after editing.",
    {
      es: "clave LLM no configurada en backend/.env — reinicia el servidor tras modificarla.",
      de: "LLM-Schlüssel nicht in backend/.env konfiguriert — Server nach Änderung neu starten.",
      it: "chiave LLM non configurata in backend/.env — riavvia il server dopo la modifica.",
      pt: "chave LLM não configurada em backend/.env — reinicie o servidor após alterar.",
      nl: "LLM-sleutel niet geconfigureerd in backend/.env — herstart de server na wijziging.",
      ja: "backend/.env に LLM キーが未設定です — 変更後にサーバーを再起動してください。",
    },
  ),
  "oracle.banner.level10": T("Niveau 10 requis pour entrer au Sanctuaire.", "Level 10 required to enter the Sanctuary.", {
    es: "Nivel 10 requerido para entrar al Santuario.", de: "Stufe 10 erforderlich für das Heiligtum.",
    it: "Livello 10 richiesto per entrare nel Santuario.", pt: "Nível 10 necessário para entrar no Santuário.",
    nl: "Niveau 10 vereist om het Heiligdom te betreden.", ja: "聖域への入場にはレベル10が必要です。",
  }),
  "oracle.banner.limited": T(
    "Accès limité — atteignez le niveau 20 ou améliorez le Sanctuaire de votre royaume (niv. 30).",
    "Limited access — reach level 20 or upgrade your kingdom Sanctuary (lv. 30).",
    {
      es: "Acceso limitado — alcanza el nivel 20 o mejora el Santuario de tu reino (niv. 30).",
      de: "Eingeschränkter Zugang — erreiche Stufe 20 oder verbessere das Heiligtum deines Königreichs (St. 30).",
      it: "Accesso limitato — raggiungi il livello 20 o migliora il Santuario del tuo regno (liv. 30).",
      pt: "Acesso limitado — atinge o nível 20 ou melhora o Santuário do teu reino (niv. 30).",
      nl: "Beperkte toegang — bereik niveau 20 of verbeter het Heiligdom van je koninkrijk (niv. 30).",
      ja: "制限付きアクセス — レベル20到達、または王国の聖域を強化（Lv.30）してください。",
    },
  ),
  "oracle.banner.unlimited": T("Consultations illimitées — Lien à l'Oracle actif.", "Unlimited consultations — Oracle Bond active.", {
    es: "Consultas ilimitadas — Enlace al Oráculo activo.", de: "Unbegrenzte Konsultationen — Orakel-Verbindung aktiv.",
    it: "Consultazioni illimitate — Legame all'Oracolo attivo.", pt: "Consultas ilimitadas — Vínculo ao Oráculo ativo.",
    nl: "Onbeperkte consultaties — Orakelkoppeling actief.", ja: "無制限の相談 — オラクルへのリンク有効。",
  }),
  "oracle.banner.daily": T("Consultations aujourd'hui :", "Consultations today:", {
    es: "Consultas hoy:", de: "Konsultationen heute:", it: "Consultazioni oggi:",
    pt: "Consultas hoje:", nl: "Consultaties vandaag:", ja: "本日の相談回数：",
  }),
  "oracle.banner.sanctuaryBonus": T("(bonus Sanctuaire)", "(Sanctuary bonus)", {
    es: "(bonus Santuario)", de: "(Heiligtum-Bonus)", it: "(bonus Santuario)",
    pt: "(bónus Santuário)", nl: "(heiligdom-bonus)", ja: "（聖域ボーナス）",
  }),
  "oracle.banner.shopLink": T("Lien à l'Oracle → Boutique", "Oracle Bond → Shop", {
    es: "Enlace al Oráculo → Tienda", de: "Orakel-Verbindung → Shop", it: "Legame all'Oracolo → Negozio",
    pt: "Vínculo ao Oráculo → Loja", nl: "Orakelkoppeling → Winkel", ja: "オラクルへのリンク → ショップ",
  }),
  "oracle.sidebar.rites": T("Rites", "Rites", {
    es: "Ritos", de: "Riten", it: "Riti", pt: "Ritos", nl: "Riten", ja: "儀式",
  }),
  "oracle.sidebar.ritesDesc": T(
    "Chaque consultation nourrit la quête « Sagesse de l'Oracle ». Les réponses sont générées à partir de ton profil et de l'univers Nexoria.",
    "Each consultation feeds the « Oracle's Wisdom » quest. Answers are generated from your profile and the Nexoria universe.",
    {
      es: "Cada consulta alimenta la misión « Sabiduría del Oráculo ». Las respuestas se generan a partir de tu perfil y del universo Nexoria.",
      de: "Jede Konsultation nährt die Quest « Weisheit des Orakels ». Antworten werden aus deinem Profil und dem Nexoria-Universum erzeugt.",
      it: "Ogni consultazione alimenta la missione « Saggezza dell'Oracolo ». Le risposte sono generate dal tuo profilo e dall'universo Nexoria.",
      pt: "Cada consulta alimenta a missão « Sabedoria do Oráculo ». As respostas são geradas a partir do teu perfil e do universo Nexoria.",
      nl: "Elke consultatie voedt de quest « Wijsheid van het Orakel ». Antwoorden worden gegenereerd uit je profiel en het Nexoria-universum.",
      ja: "相談のたびに「オラクルの叡智」クエストが進む。回答はプロフィールとネクソリアの世界観から生成される。",
    },
  ),
  "oracle.sidebar.whispers": T("Murmures suggérés", "Suggested whispers", {
    es: "Susurros sugeridos", de: "Vorgeschlagene Flüsterworte", it: "Sussurri suggeriti",
    pt: "Sussurros sugeridos", nl: "Voorgestelde fluisteringen", ja: "おすすめの囁き",
  }),
  "oracle.chat.title": T("Voix du Sanctuaire", "Voice of the Sanctuary", {
    es: "Voz del Santuario", de: "Stimme des Heiligtums", it: "Voce del Santuario",
    pt: "Voz do Santuário", nl: "Stem van het Heiligdom", ja: "聖域の声",
  }),
  "oracle.chat.label": T("Oracle", "Oracle", {
    es: "Oráculo", de: "Orakel", it: "Oracolo", pt: "Oráculo", nl: "Orakel", ja: "オラクル",
  }),
  "oracle.chat.loading": T("Les braises s'embrasent...", "The embers flare up...", {
    es: "Las brasas se encienden...", de: "Die Glut lodert auf...", it: "Le braci si accendono...",
    pt: "As brasas acendem-se...", nl: "De gloed laait op...", ja: "余烬が燃え上がる…",
  }),
  "oracle.input.placeholder": T("Murmurez votre question...", "Whisper your question...", {
    es: "Susurra tu pregunta...", de: "Flüstere deine Frage...", it: "Sussurra la tua domanda...",
    pt: "Sussurra a tua pergunta...", nl: "Fluister je vraag...", ja: "問いをささやけ…",
  }),

  // ─── Quests Oracle widget ───
  "quests.oracle.title": T("Prophétie de l'Oracle", "Oracle prophecy", {
    es: "Profecía del Oráculo", de: "Orakel-Prophezeiung", it: "Profezia dell'Oracolo",
    pt: "Profecia do Oráculo", nl: "Orakelprofetie", ja: "オラクルの予言",
  }),
  "quests.oracle.generate": T("Générer une quête", "Generate a quest", {
    es: "Generar una misión", de: "Quest generieren", it: "Genera una missione",
    pt: "Gerar uma missão", nl: "Quest genereren", ja: "クエストを生成",
  }),
  "quests.oracle.loading": T("L'Oracle consulte les étoiles...", "The Oracle reads the stars...", {
    es: "El Oráculo consulta las estrellas...", de: "Das Orakel befragt die Sterne...",
    it: "L'Oracolo consulta le stelle...", pt: "O Oráculo consulta as estrelas...",
    nl: "Het Orakel raadpleegt de sterren...", ja: "オラクルが星を読む…",
  }),
  "quests.oracle.error": T("Le parchemin reste vierge...", "The scroll stays blank...", {
    es: "El pergamino permanece en blanco...", de: "Die Schriftrolle bleibt leer...",
    it: "La pergamena resta vuota...", pt: "O pergaminho permanece em branco...",
    nl: "Het perkament blijft leeg...", ja: "巻物は白紙のまま…",
  }),
  "quests.oracle.subtitle": T("Une mission unique générée pour toi.", "A unique mission generated for you.", {
    es: "Una misión única generada para ti.", de: "Eine einzigartige Mission für dich generiert.",
    it: "Una missione unica generata per te.", pt: "Uma missão única gerada para ti.",
    nl: "Een unieke missie voor jou gegenereerd.", ja: "あなただけの特別なミッション。",
  }),
  "quests.oracle.writing": T("Écriture...", "Writing...", {
    es: "Escribiendo...", de: "Schreibt...", it: "Scrittura...", pt: "A escrever...",
    nl: "Schrijven...", ja: "執筆中…",
  }),
  "quests.oracle.generate_btn": T("Générer", "Generate", {
    es: "Generar", de: "Generieren", it: "Genera", pt: "Gerar", nl: "Genereren", ja: "生成",
  }),

  // ─── Referral page ───
  "referral.title": T("Parrainage", "Referral", {
    es: "Referidos", de: "Empfehlungen", it: "Referral", pt: "Indicações",
    nl: "Verwijzingen", ja: "紹介",
  }),
  "referral.subtitle": T(
    "Invite des héros à rejoindre NEXORIA et débloque des récompenses exclusives.",
    "Invite heroes to join NEXORIA and unlock exclusive rewards.",
    {
      es: "Invita héroes a unirse a NEXORIA y desbloquea recompensas exclusivas.",
      de: "Lade Helden ein, NEXORIA beizutreten, und schalte exklusive Belohnungen frei.",
      it: "Invita eroi a unirsi a NEXORIA e sblocca ricompense esclusive.",
      pt: "Convida heróis a juntarem-se à NEXORIA e desbloqueia recompensas exclusivas.",
      nl: "Nodig helden uit voor NEXORIA en ontgrendel exclusieve beloningen.",
      ja: "英雄をNEXORIAに招待し、限定報酬を解除しよう。",
    },
  ),
  "referral.yourLink": T("Ton lien de parrainage", "Your referral link", {
    es: "Tu enlace de referido", de: "Dein Empfehlungslink", it: "Il tuo link referral",
    pt: "O teu link de indicação", nl: "Jouw verwijzingslink", ja: "紹介リンク",
  }),
  "referral.copy": T("Copier", "Copy", {
    es: "Copiar", de: "Kopieren", it: "Copia", pt: "Copiar", nl: "Kopiëren", ja: "コピー",
  }),
  "referral.copied": T("Copié !", "Copied!", {
    es: "¡Copiado!", de: "Kopiert!", it: "Copiato!", pt: "Copiado!", nl: "Gekopieerd!", ja: "コピーしました！",
  }),
  "referral.linkCopied": T("Lien de parrainage copié !", "Referral link copied!", {
    es: "¡Enlace de referido copiado!", de: "Empfehlungslink kopiert!", it: "Link referral copiato!",
    pt: "Link de indicação copiado!", nl: "Verwijzingslink gekopieerd!", ja: "紹介リンクをコピーしました！",
  }),
  "referral.copyFailed": T("Impossible de copier le lien", "Could not copy link", {
    es: "No se pudo copiar el enlace", de: "Link konnte nicht kopiert werden", it: "Impossibile copiare il link",
    pt: "Não foi possível copiar o link", nl: "Link kon niet worden gekopieerd", ja: "リンクをコピーできませんでした",
  }),
  "referral.heroesInvited": T("Héros invités", "Heroes invited", {
    es: "Héroes invitados", de: "Eingeladene Helden", it: "Eroi invitati",
    pt: "Heróis convidados", nl: "Uitgenodigde helden", ja: "招待した英雄",
  }),
  "referral.milestones": T("Paliers de récompenses", "Reward milestones", {
    es: "Hitos de recompensas", de: "Belohnungsstufen", it: "Traguardi ricompense",
    pt: "Marcos de recompensas", nl: "Beloningsmijlpalen", ja: "報酬マイルストーン",
  }),
  "referral.milestoneLocked": T("Verrouillé", "Locked", {
    es: "Bloqueado", de: "Gesperrt", it: "Bloccato", pt: "Bloqueado", nl: "Vergrendeld", ja: "ロック中",
  }),
  "referral.milestoneUnlocked": T("Débloqué", "Unlocked", {
    es: "Desbloqueado", de: "Freigeschaltet", it: "Sbloccato", pt: "Desbloqueado", nl: "Ontgrendeld", ja: "解除済み",
  }),
  "referral.code": T("Code", "Code", {
    es: "Código", de: "Code", it: "Codice", pt: "Código", nl: "Code", ja: "コード",
  }),
  "referral.heroesReferred": T("Héros parrainés", "Referred heroes", {
    es: "Héroes referidos", de: "Geworbene Helden", it: "Eroi invitati",
    pt: "Heróis indicados", nl: "Verwezen helden", ja: "紹介した英雄",
  }),
  "referral.inviteFriends_one": T("Invite {count} ami", "Invite {count} friend", {
    es: "Invita a {count} amigo", de: "Lade {count} Freund ein", it: "Invita {count} amico",
    pt: "Convida {count} amigo", nl: "Nodig {count} vriend uit", ja: "{count}人の仲間を招待",
  }),
  "referral.inviteFriends_other": T("Invite {count} amis", "Invite {count} friends", {
    es: "Invita a {count} amigos", de: "Lade {count} Freunde ein", it: "Invita {count} amici",
    pt: "Convida {count} amigos", nl: "Nodig {count} vrienden uit", ja: "{count}人の仲間を招待",
  }),
  "referral.obtained": T("Obtenu", "Obtained", {
    es: "Obtenido", de: "Erhalten", it: "Ottenuto", pt: "Obtido", nl: "Verkregen", ja: "獲得済み",
  }),

  // ─── Referral milestone rewards (API thresholds) ───
  "referral.milestone.1": T("+50 Écus du Nexus", "+50 Nexus Écus", {
    es: "+50 Écus del Nexus", de: "+50 Nexus-Écus", it: "+50 Écus del Nexus",
    pt: "+50 Écus do Nexus", nl: "+50 Nexus-Écus", ja: "ネクサス・エキュー +50",
  }),
  "referral.milestone.3": T("Badge Recruteur", "Recruiter Badge", {
    es: "Insignia Reclutador", de: "Rekruten-Abzeichen", it: "Distintivo Reclutatore",
    pt: "Emblema Recrutador", nl: "Recruiter-badge", ja: "リクルーターバッジ",
  }),
  "referral.milestone.5": T("+150 Écus (palier 5)", "+150 Écus (tier 5)", {
    es: "+150 Écus (hito 5)", de: "+150 Écus (Stufe 5)", it: "+150 Écus (livello 5)",
    pt: "+150 Écus (marco 5)", nl: "+150 Écus (niveau 5)", ja: "エキュー +150（段階5）",
  }),
  "referral.milestone.10": T("Titre Ambassadeur du Nexus", "Nexus Ambassador Title", {
    es: "Título Embajador del Nexus", de: "Titel Nexus-Botschafter", it: "Titolo Ambasciatore del Nexus",
    pt: "Título Embaixador do Nexus", nl: "Titel Nexus-ambassadeur", ja: "ネクサス大使の称号",
  }),
  "referral.milestone.15": T("Badge Mentor des Héros", "Heroes Mentor Badge", {
    es: "Insignia Mentor de Héroes", de: "Helden-Mentor-Abzeichen", it: "Distintivo Mentore degli Eroi",
    pt: "Emblema Mentor de Heróis", nl: "Heldenmentor-badge", ja: "英雄の師バッジ",
  }),
  "referral.milestone.25": T("Rôle Discord Ambassadeur", "Discord Ambassador Role", {
    es: "Rol Discord Embajador", de: "Discord-Botschafter-Rolle", it: "Ruolo Discord Ambasciatore",
    pt: "Cargo Discord Embaixador", nl: "Discord-ambassadeurrol", ja: "Discord大使ロール",
  }),
  "referral.milestone.50": T("Badge Parrain Légendaire + 500 Écus", "Legendary Sponsor Badge + 500 Écus", {
    es: "Insignia Padrino Legendario + 500 Écus", de: "Legendäres Paten-Abzeichen + 500 Écus",
    it: "Distintivo Parrain Leggendario + 500 Écus", pt: "Emblema Padrinho Lendário + 500 Écus",
    nl: "Legendarische sponsor-badge + 500 Écus", ja: "伝説のスポンサーバッジ + エキュー500",
  }),

  // ─── Settings referral section ───
  "settings.referral.desc": T(
    "Invitez des amis à rejoindre NEXORIA. Chaque héros qui s'inscrit avec votre code vous rapporte des récompenses.",
    "Invite friends to join NEXORIA. Each hero who signs up with your code earns you rewards.",
    {
      es: "Invita amigos a unirse a NEXORIA. Cada héroe que se registre con tu código te reporta recompensas.",
      de: "Lade Freunde ein, NEXORIA beizutreten. Jeder Held, der sich mit deinem Code anmeldet, bringt dir Belohnungen.",
      it: "Invita amici a unirsi a NEXORIA. Ogni eroe che si iscrive con il tuo codice ti fa guadagnare ricompense.",
      pt: "Convida amigos a juntarem-se à NEXORIA. Cada herói que se registe com o teu código traz-te recompensas.",
      nl: "Nodig vrienden uit voor NEXORIA. Elke held die zich aanmeldt met jouw code levert beloningen op.",
      ja: "友人をNEXORIAに招待しましょう。あなたのコードで登録した英雄ごとに報酬が得られます。",
    },
  ),
  "settings.referral.yourCode": T("Votre code de parrainage", "Your referral code", {
    es: "Tu código de referido", de: "Dein Empfehlungscode", it: "Il tuo codice referral",
    pt: "O teu código de indicação", nl: "Jouw verwijzingscode", ja: "紹介コード",
  }),
  "settings.referral.copyCode": T("Copier le code", "Copy code", {
    es: "Copiar código", de: "Code kopieren", it: "Copia codice", pt: "Copiar código",
    nl: "Code kopiëren", ja: "コードをコピー",
  }),
  "settings.referral.inviteLink": T("Lien d'invitation", "Invitation link", {
    es: "Enlace de invitación", de: "Einladungslink", it: "Link di invito",
    pt: "Link de convite", nl: "Uitnodigingslink", ja: "招待リンク",
  }),
  "settings.referral.copyLink": T("Copier le lien", "Copy link", {
    es: "Copiar enlace", de: "Link kopieren", it: "Copia link", pt: "Copiar link",
    nl: "Link kopiëren", ja: "リンクをコピー",
  }),
  "settings.referral.openLink": T("Ouvrir le lien", "Open link", {
    es: "Abrir enlace", de: "Link öffnen", it: "Apri link", pt: "Abrir link",
    nl: "Link openen", ja: "リンクを開く",
  }),
  "settings.referral.referrals": T("Filleuls :", "Referrals:", {
    es: "Referidos:", de: "Geworbene:", it: "Invitati:", pt: "Indicados:",
    nl: "Verwijzingen:", ja: "紹介数：",
  }),
  "settings.referral.milestonePending": T("En attente", "Pending", {
    es: "Pendiente", de: "Ausstehend", it: "In attesa", pt: "Pendente", nl: "In afwachting", ja: "保留中",
  }),
  "settings.referral.milestoneCount_one": T("{count} filleul", "{count} referral", {
    es: "{count} referido", de: "{count} Geworbener", it: "{count} invitato",
    pt: "{count} indicado", nl: "{count} verwijzing", ja: "紹介 {count}人",
  }),
  "settings.referral.milestoneCount_other": T("{count} filleuls", "{count} referrals", {
    es: "{count} referidos", de: "{count} Geworbene", it: "{count} invitati",
    pt: "{count} indicados", nl: "{count} verwijzingen", ja: "紹介 {count}人",
  }),
};
