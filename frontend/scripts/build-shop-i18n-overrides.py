#!/usr/bin/env python3
"""Generate shop-i18n-overrides.json with 8-language translations."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(ROOT))

from shop_data import SHOP_ITEMS, ECU_PACKS  # noqa: E402

LANGS = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"]
OUT = Path(__file__).resolve().parent / "shop-i18n-overrides.json"


def T(en, es, de, it, pt, nl, ja):
    return {"en": en, "es": es, "de": de, "it": it, "pt": pt, "nl": nl, "ja": ja}


# fmt: off
TRANSLATIONS: dict[str, dict[str, str]] = {
    # ── Cosmetics: frames ──
    "shop.item.frame_runic.name": T("Runic Frame", "Marco Rúnico", "Runischer Rahmen", "Cornice Runica", "Moldura Rúnica", "Runiek Kader", "ルーンの枠"),
    "shop.item.frame_runic.description": T("Animated runic border for your avatar", "Borde rúnico animado para tu avatar", "Animierte runische Umrandung für deinen Avatar", "Bordo runico animato per il tuo avatar", "Borda rúnica animada para o seu avatar", "Geanimeerde runieke rand voor je avatar", "アバター用のアニメーションルーン枠"),
    "shop.item.frame_celestial.name": T("Celestial Frame", "Marco Celestial", "Himmlischer Rahmen", "Cornice Celeste", "Moldura Celestial", "Hemels Kader", "天界の枠"),
    "shop.item.frame_celestial.description": T("Celestial aura around your hero card", "Aura celestial alrededor de tu carta de héroe", "Himmlische Aura um deine Heldenkarte", "Aura celeste intorno alla tua carta eroe", "Aura celestial em torno da sua carta de herói", "Hemelse aura rond je heldenkaart", "ヒーローカードを包む天界のオーラ"),
    "shop.item.frame_cosmic.name": T("Cosmic Frame", "Marco Cósmico", "Kosmischer Rahmen", "Cornice Cosmica", "Moldura Cósmica", "Kosmisch Kader", "宇宙の枠"),
    "shop.item.frame_cosmic.description": T("Pulsating cosmic border — ultimate exclusivity", "Borde cósmico pulsante — exclusividad suprema", "Pulsierende kosmische Umrandung — ultimative Exklusivität", "Bordo cosmico pulsante — esclusività suprema", "Borda cósmica pulsante — exclusividade suprema", "Pulserende kosmische rand — ultieme exclusiviteit", "脈動する宇宙の枠 — 究極の限定品"),

    # ── Cosmetics: banners ──
    "shop.item.banner_dragon.name": T("Dragon Banner", "Estandarte del Dragón", "Drachenbanner", "Stendardo del Drago", "Estandarte do Dragão", "Drakenbanier", "ドラゴンの旗"),
    "shop.item.banner_dragon.description": T("Ancestral dragon standard", "Estandarte ancestral del dragón", "Uraltes Drachenbanner", "Stendardo ancestrale del drago", "Estandarte ancestral do dragão", "Oud drakenbanier", "ドラゴンの古の旗"),
    "shop.item.banner_phoenix.name": T("Phoenix Banner", "Estandarte del Fénix", "Phönixbanner", "Stendardo della Fenice", "Estandarte da Fênix", "Fenixbanier", "フェニックスの旗"),
    "shop.item.banner_phoenix.description": T("Reborn phoenix standard", "Estandarte renaciente del fénix", "Wiedergeborenes Phönixbanner", "Stendardo rinato della fenice", "Estandarte renascido da fênix", "Herrezen fenixbanier", "蘇るフェニックスの旗"),
    "shop.item.banner_nebula.name": T("Nebula Banner", "Estandarte Nebulosa", "Nebelbanner", "Stendardo Nebulosa", "Estandarte Nebulosa", "Nevelbanier", "星雲の旗"),
    "shop.item.banner_nebula.description": T("Violet cosmic swirls", "Volutas cósmicas violetas", "Violette kosmische Wirbel", "Vortici cosmici viola", "Volutas cósmicas violetas", "Paarse kosmische wervelingen", "紫の宇宙の渦"),
    "shop.item.banner_aurora.name": T("Aurora Banner", "Estandarte Aurora", "Aurorabanner", "Stendardo Aurora", "Estandarte Aurora", "Aurorabanier", "オーロラの旗"),
    "shop.item.banner_aurora.description": T("Cyan boreal glows", "Luzes boreales cian", "Cyanfarbene Polarlichter", "Bagliori boreali ciano", "Brilhos boreais ciano", "Cyaan noorderlicht", "シアンのオーロラの輝き"),
    "shop.item.banner_void.name": T("Void Banner", "Estandarte del Vacío", "Leerenbanner", "Stendardo del Vuoto", "Estandarte do Vazio", "Leegtebanier", "虚空の旗"),
    "shop.item.banner_void.description": T("Deep stellar abyss", "Abismo estelar profundo", "Tiefer Sternenabgrund", "Abisso stellare profondo", "Abismo estelar profundo", "Diepe sterrenafgrond", "深き星の淵"),
    "shop.item.banner_gold.name": T("Royal Banner", "Estandarte Real", "Königsbanner", "Stendardo Reale", "Estandarte Real", "Koninklijk Banier", "王家の旗"),
    "shop.item.banner_gold.description": T("Imperial gold of the realm", "Oro imperial del reino", "Kaiserliches Gold des Reiches", "Oro imperiale del regno", "Ouro imperial do reino", "Keizerlijk goud van het rijk", "王国の皇帝金"),
    "shop.item.banner_frost.name": T("Frost Banner", "Estandarte de Escarcha", "Frostbanner", "Stendardo del Gelo", "Estandarte de Gelo", "Vorstbanier", "霜の旗"),
    "shop.item.banner_frost.description": T("Eternal ice of the peaks", "Hielo eterno de las cumbres", "Ewiges Eis der Gipfel", "Ghiaccio eterno delle vette", "Gelo eterno dos cumes", "Eeuwig ijs der toppen", "峰の永久氷"),
    "shop.item.banner_blood.name": T("Blood Banner", "Estandarte Sangriento", "Blutbanner", "Stendardo Sanguigno", "Estandarte Sangrento", "Bloedbanier", "血の旗"),
    "shop.item.banner_blood.description": T("For ruthless warriors", "Para guerreros implacables", "Für rücksichtslose Krieger", "Per guerrieri spietati", "Para guerreiros implacáveis", "Voor meedogenloze krijgers", "無慈悲な戦士のための旗"),
    "shop.item.banner_emerald.name": T("Emerald Banner", "Estandarte Esmeralda", "Smaragdbanner", "Stendardo di Smeraldo", "Estandarte Esmeralda", "Smaragdbanier", "翠玉の旗"),
    "shop.item.banner_emerald.description": T("Verdure of ancient forests", "Verdor de los bosques antiguos", "Grün der uralten Wälder", "Verde degli antichi boschi", "Verdor das florestas antigas", "Groen der oude bossen", "古の森の緑"),

    # ── Boosts ──
    "shop.item.boost_xp_2x_1h.name": T("XP Elixir — 1h", "Elixir de XP — 1h", "XP-Elixier — 1 Std.", "Elisir XP — 1h", "Elixir de XP — 1h", "XP-elixir — 1u", "XPエリクサー — 1時間"),
    "shop.item.boost_xp_2x_1h.description": T("Double XP for 1 hour", "Doble XP durante 1 hora", "Doppelte XP für 1 Stunde", "Doppia XP per 1 ora", "XP em dobro por 1 hora", "Dubbele XP gedurende 1 uur", "1時間XP2倍"),
    "shop.item.boost_xp_2x_24h.name": T("XP Elixir — 24h", "Elixir de XP — 24h", "XP-Elixier — 24 Std.", "Elisir XP — 24h", "Elixir de XP — 24h", "XP-elixir — 24u", "XPエリクサー — 24時間"),
    "shop.item.boost_xp_2x_24h.description": T("Double XP for 24 hours", "Doble XP durante 24 horas", "Doppelte XP für 24 Stunden", "Doppia XP per 24 ore", "XP em dobro por 24 horas", "Dubbele XP gedurende 24 uur", "24時間XP2倍"),
    "shop.item.boost_aether_2x_1h.name": T("Écu Elixir — 1h", "Elixir de Écus — 1h", "Écu-Elixier — 1 Std.", "Elisir Écu — 1h", "Elixir de Écus — 1h", "Écu-elixir — 1u", "Écuエリクサー — 1時間"),
    "shop.item.boost_aether_2x_1h.description": T("Double Écus earned for 1 hour", "Doble de Écus ganados durante 1 hora", "Doppelte Écus für 1 Stunde", "Raddoppia gli Écu guadagnati per 1 ora", "Dobra os Écus ganhos por 1 hora", "Verdubbel verdiende Écus gedurende 1 uur", "1時間Écus獲得量2倍"),
    "shop.item.boost_luck_1h.name": T("Eye of Fortune — 1h", "Ojo de la Fortuna — 1h", "Auge des Glücks — 1 Std.", "Occhio della Fortuna — 1h", "Olho da Fortuna — 1h", "Oog van Fortuin — 1u", "幸運の目 — 1時間"),
    "shop.item.boost_luck_1h.description": T("Increases high-rarity chest odds", "Aumenta las probabilidades de rarezas altas en cofres", "Erhöht die Chancen auf hohe Seltenheit in Truhen", "Aumenta le probabilità di rarità elevate nei forzieri", "Aumenta as chances de raridades altas em baús", "Verhoogt kansen op hoge zeldzaamheid in kisten", "宝箱の高レアリティ確率が上昇"),

    # ── Consumables ──
    "shop.item.scroll_class_change.name": T("Mutation Scroll", "Pergamino de Mutación", "Mutationsrolle", "Pergamena della Mutazione", "Pergaminho de Mutação", "Mutatierol", "変異の巻物"),
    "shop.item.scroll_class_change.description": T("Allows 3 class changes (first change is free for everyone)", "Permite cambiar de clase 3 veces (el primer cambio es gratis para todos)", "Ermöglicht 3 Klassenwechsel (der erste Wechsel ist für alle kostenlos)", "Permette 3 cambi di classe (il primo cambio è gratuito per tutti)", "Permite mudar de classe 3 vezes (a primeira mudança é grátis para todos)", "Maakt 3 klassewissels mogelijk (de eerste wissel is gratis voor iedereen)", "クラス変更3回分（初回は全員無料）"),
    "shop.item.key_chest_cosmic.name": T("Cosmic Key", "Llave Cósmica", "Kosmischer Schlüssel", "Chiave Cosmica", "Chave Cósmica", "Kosmische Sleutel", "宇宙の鍵"),
    "shop.item.key_chest_cosmic.description": T("Chest guaranteeing an Epic or higher item", "Cofre que garantiza un objeto Épico o superior", "Truhe mit garantiert epischem oder höherem Gegenstand", "Forziere che garantisce un oggetto Epico o superiore", "Baú garantindo um item Épico ou superior", "Kist met gegarandeerd Episch of hoger item", "エピック以上のアイテム確定の宝箱"),
    "shop.item.summon_rift.name": T("Rift Catalyst", "Catalizador de Grieta", "Riss-Katalysator", "Catalizzatore di Fenditura", "Catalisador de Fenda", "Kloofkatalysator", "亀裂の触媒"),
    "shop.item.summon_rift.description": T("Forces a dimensional rift to appear", "Fuerza la aparición de una grieta dimensional", "Erzwingt das Erscheinen eines dimensionalen Risses", "Forza l'apparizione di una fenditura dimensionale", "Força o aparecimento de uma fenda dimensional", "Forceert het verschijnen van een dimensionale kloof", "次元の亀裂の出現を強制"),

    # ── Kingdom ──
    "shop.item.kingdom_inventory_slot.name": T("Extended Chest", "Cofre Ampliado", "Erweiterte Truhe", "Forziere Ampliato", "Baú Expandido", "Uitgebreide Kist", "拡張チェスト"),
    "shop.item.kingdom_inventory_slot.description": T("+10 permanent inventory slots", "+10 espacios de inventario permanentes", "+10 permanente Inventarplätze", "+10 slot inventario permanenti", "+10 slots de inventário permanentes", "+10 permanente inventarisvakken", "インベントリ永久スロット+10"),
    "shop.item.kingdom_aether_mine.name": T("Écu Mine", "Mina de Écus", "Écu-Mine", "Miniera di Écu", "Mina de Écus", "Écu-mijn", "Écu鉱山"),
    "shop.item.kingdom_aether_mine.description": T("Generates 50 Écus per day passively", "Genera 50 Écus al día de forma pasiva", "Erzeugt passiv 50 Écus pro Tag", "Genera 50 Écu al giorno in modo passivo", "Gera 50 Écus por dia passivamente", "Genereert passief 50 Écus per dag", "毎日50 Écusを自動生成"),
    "shop.item.kingdom_ban_archive.name": T("Council Archives", "Archivos del Consejo", "Archiv des Rates", "Archivi del Consiglio", "Arquivos do Conselho", "Archief van de Raad", "評議会の書庫"),
    "shop.item.kingdom_ban_archive.description": T("Permanent access to the realm's Banishment Archives", "Acceso permanente a los Archivos de Destierro del reino", "Permanenter Zugang zu den Verbannungsarchiven des Reiches", "Accesso permanente agli Archivi dei Bandimenti del regno", "Acesso permanente aos Arquivos de Banimento do reino", "Permanente toegang tot het Verbanningsarchief van het rijk", "王国の追放記録への永久アクセス"),
    "shop.item.kingdom_oracle_link.name": T("Oracle Link", "Enlace al Oráculo", "Orakel-Verbindung", "Legame all'Oracolo", "Vínculo ao Oráculo", "Orakelkoppeling", "オラクルへのリンク"),
    "shop.item.kingdom_oracle_link.description": T("Unlimited Sanctuary access — daily Omen included", "Consulta ilimitada del Santuario — acceso al Presagio diario", "Unbegrenzter Zugang zum Heiligtum — tägliches Omen inklusive", "Consultazione illimitata del Santuario — Presagio quotidiano incluso", "Consulta ilimitada ao Santuário — Preságio diário incluído", "Onbeperkte toegang tot het Heiligdom — dagelijks Omen inbegrepen", "聖域への無制限アクセス — 日々の予兆付き"),
    "shop.item.kingdom_chronicle_vault.name": T("Chronicle Vault", "Bóveda de las Crónicas", "Chronikengewölbe", "Volta delle Cronache", "Câmara das Crônicas", "Kroniekenkluis", "年代記の書庫"),
    "shop.item.kingdom_chronicle_vault.description": T("Access to the realm's complete Chronicles (all eras)", "Acceso a las Crónicas completas del reino (todas las épocas)", "Zugang zu den vollständigen Chroniken des Reiches (alle Epochen)", "Accesso alle Cronache complete del regno (tutte le epoche)", "Acesso às Crônicas completas do reino (todas as eras)", "Toegang tot de volledige Kronieken van het rijk (alle tijdperken)", "王国の全時代の完全な年代記へのアクセス"),
    "shop.item.kingdom_throne_room.name": T("Throne Room", "Sala del Trono", "Thronsaal", "Sala del Trono", "Sala do Trono", "Troonzaal", "玉座の間"),
    "shop.item.kingdom_throne_room.description": T("Personal throne displayed on your profile, exclusive royal badge", "Trono personal mostrado en tu perfil, insignia real exclusiva", "Persönlicher Thron auf deinem Profil, exklusives königliches Abzeichen", "Trono personale sul profilo, distintivo reale esclusivo", "Trono pessoal exibido no perfil, emblema real exclusivo", "Persoonlijke troon op je profiel, exclusieve koninklijke badge", "プロフィールに表示される専用玉座、限定王家バッジ"),
    "shop.item.kingdom_treasury.name": T("Royal Treasury", "Tesorería Real", "Königsschatzkammer", "Tesoreria Reale", "Tesouraria Real", "Koninklijke Schatkamer", "王家の財宝庫"),
    "shop.item.kingdom_treasury.description": T("Generates 200 Écus per day passively (stacks with Mine)", "Genera 200 Écus al día de forma pasiva (acumulable con la Mina)", "Erzeugt passiv 200 Écus pro Tag (stapelbar mit Mine)", "Genera 200 Écu al giorno in modo passivo (cumulabile con la Miniera)", "Gera 200 Écus por dia passivamente (acumula com a Mina)", "Genereert passief 200 Écus per dag (stapelt met Mijn)", "毎日200 Écusを自動生成（鉱山と累積）"),
    "shop.item.kingdom_constellation.name": T("Personal Constellation", "Constelación Personal", "Persönliche Konstellation", "Costellazione Personale", "Constelação Pessoal", "Persoonlijk Sterrenbeeld", "個人星座"),
    "shop.item.kingdom_constellation.description": T("Unique constellation traced in NEXORIA's sky bearing your name", "Constelación única trazada en el cielo de NEXORIA con tu nombre", "Einzigartige Konstellation am Himmel von NEXORIA mit deinem Namen", "Costellazione unica tracciata nel cielo di NEXORIA con il tuo nome", "Constelação única traçada no céu de NEXORIA com o seu nome", "Uniek sterrenbeeld aan de hemel van NEXORIA met jouw naam", "NEXORIAの空にあなたの名を刻んだ唯一の星座"),

    # ── Chests ──
    "shop.item.chest_ancient.name": T("Ancient Chest", "Cofre Antiguo", "Uralte Truhe", "Forziere Antico", "Baú Antigo", "Oude Kist", "古代の宝箱"),
    "shop.item.chest_ancient.description": T("Instantly opens a relic chest", "Abre inmediatamente un cofre de reliquias", "Öffnet sofort eine Reliquientruhe", "Apre immediatamente un forziere di reliquie", "Abre imediatamente um baú de relíquias", "Opent direct een relikwie-kist", "遺物の宝箱を即座に開封"),
    "shop.item.chest_royal.name": T("Royal Chest", "Cofre Real", "Königliche Truhe", "Forziere Reale", "Baú Real", "Koninklijke Kist", "王家の宝箱"),
    "shop.item.chest_royal.description": T("Royal chest — better Epic odds", "Cofre real — mejores probabilidades de Épico", "Königliche Truhe — bessere Episch-Chancen", "Forziere reale — migliori probabilità Epiche", "Baú real — melhores chances de Épico", "Koninklijke kist — betere Epische kansen", "王家の宝箱 — エピック確率アップ"),
    "shop.item.chest_divine.name": T("Divine Chest", "Cofre Divino", "Göttliche Truhe", "Forziere Divino", "Baú Divino", "Goddelijke Kist", "神聖の宝箱"),
    "shop.item.chest_divine.description": T("Divine chest — rare relics guaranteed", "Cofre divino — reliquias raras garantizadas", "Göttliche Truhe — seltene Reliquien garantiert", "Forziere divino — reliquie rare garantite", "Baú divino — relíquias raras garantidas", "Goddelijke kist — zeldzame relikwieën gegarandeerd", "神聖の宝箱 — レア遺物確定"),

    # ── Mounts ──
    "shop.item.mount_stellar_wolf.name": T("Stellar Wolf", "Lobo Estelar", "Sternenwolf", "Lupo Stellare", "Lobo Estelar", "Sterrenwolf", "星の狼"),
    "shop.item.mount_stellar_wolf.description": T("Lupine companion of the stellar mists", "Compañero lupino de las brumas estelares", "Wolfsgefährte der Sternennebel", "Compagno lupino delle nebbie stellari", "Companheiro lupino das brumas estelares", "Wolvengezel der sterrenmist", "星霧の狼の相棒"),
    "shop.item.mount_phoenix_wing.name": T("Phoenix Wings", "Alas del Fénix", "Phönixflügel", "Ali della Fenice", "Asas da Fênix", "Fenixvleugels", "フェニックスの翼"),
    "shop.item.mount_phoenix_wing.description": T("Reborn winged mount", "Montura alada renaciente", "Wiedergeborene Flugmontur", "Montatura alata rinata", "Montaria alada renascida", "Herrezen gevleugelde rijdier", "蘇る翼のある乗り物"),

    # ── Titles ──
    "shop.item.title_starforged.name": T("Title: Starforged", "Título: Forjado de las Estrellas", "Titel: Sterngeschmiedet", "Titolo: Forgiato dalle Stelle", "Título: Forjado das Estrelas", "Titel: Stergesmeed", "称号：星の鍛造"),
    "shop.item.title_starforged.description": T("Exclusive shop title", "Título exclusivo de la tienda", "Exklusiver Ladentitel", "Titolo esclusivo del negozio", "Título exclusivo da loja", "Exclusieve winkeltitel", "ショップ限定称号"),
    "shop.item.title_void_walker.name": T("Title: Void Walker", "Título: Caminante del Vacío", "Titel: Leerenwanderer", "Titolo: Camminatore del Vuoto", "Título: Caminhante do Vazio", "Titel: Leegtewandelaar", "称号：虚空の歩行者"),
    "shop.item.title_void_walker.description": T("Legendary title of the void", "Título legendario del vacío", "Legendärer Titel der Leere", "Titolo leggendario del vuoto", "Título lendário do vazio", "Legendarische titel van de leegte", "虚空の伝説称号"),

    # ── Auras ──
    "shop.item.aura_crimson.name": T("Crimson Aura", "Aura Carmesí", "Karmesin-Aura", "Aura Cremisi", "Aura Carmesim", "Karmozijn Aura", "深紅のオーラ"),
    "shop.item.aura_crimson.description": T("Dark flame aura around your avatar", "Aura de llamas oscuras alrededor de tu avatar", "Dunkle Flammenaura um deinen Avatar", "Aura di fiamme oscure intorno al tuo avatar", "Aura de chamas sombrias em torno do avatar", "Donkere vlammenaure rond je avatar", "アバターを包む闇の炎オーラ"),
    "shop.item.aura_aurora.name": T("Boreal Aura", "Aura Boreal", "Polarlicht-Aura", "Aura Boreale", "Aura Boreal", "Noorderlicht-aura", "オーロラのオーラ"),
    "shop.item.aura_aurora.description": T("Pulsating cyan aura visible in the Nexus", "Aura cian pulsante visible en el Nexus", "Pulsierende Cyan-Aura sichtbar im Nexus", "Aura ciano pulsante visibile nel Nexus", "Aura ciano pulsante visível no Nexus", "Pulserende cyaan aura zichtbaar in de Nexus", "Nexusで見える脈動するシアンオーラ"),

    # ── Season Pass ──
    "shop.item.pass_season_1.name": T("Season Pass I", "Pase de Temporada I", "Saisonpass I", "Pass Stagionale I", "Passe de Temporada I", "Seizoenspas I", "シーズンパス I"),
    "shop.item.pass_season_1.description": T("Premium access to current season rewards", "Acceso premium a las recompensas de la temporada en curso", "Premium-Zugang zu den Belohnungen der laufenden Saison", "Accesso premium alle ricompense della stagione in corso", "Acesso premium às recompensas da temporada atual", "Premium toegang tot beloningen van het huidige seizoen", "現在シーズンの報酬プレミアムアクセス"),

    # ── VIP cosmetics ──
    "shop.item.vip_frame_ascendant.name": T("Ascendant Frame", "Marco del Ascendente", "Aufsteiger-Rahmen", "Cornice dell'Ascendente", "Moldura do Ascendente", "Ascendant-kader", "アセンダントの枠"),
    "shop.item.vip_frame_ascendant.description": T("Divine animated frame reserved for Ascendants — VIP exclusivity", "Marco divino animado reservado a los Ascendentes — exclusividad VIP", "Göttlicher animierter Rahmen für Aufsteiger — VIP-Exklusivität", "Cornice divina animata riservata agli Ascendenti — esclusività VIP", "Moldura divina animada reservada aos Ascendentes — exclusividade VIP", "Goddelijk geanimeerd kader voor Ascendants — VIP-exclusiviteit", "アセンダント限定の神聖アニメ枠 — VIP限定"),
    "shop.item.vip_banner_celestial.name": T("VIP Celestial Banner", "Estandarte Celestial VIP", "VIP-Himmlisches Banner", "Stendardo Celeste VIP", "Estandarte Celestial VIP", "VIP Hemels Banier", "VIP天界の旗"),
    "shop.item.vip_banner_celestial.description": T("Sparkling cosmic standard reserved for VIP", "Estandarte cósmico brillante reservado a VIP", "Funkelndes kosmisches Banner für VIP", "Stendardo cosmico scintillante riservato ai VIP", "Estandarte cósmico brilhante reservado a VIP", "Fonkelend kosmisch banier voor VIP", "VIP限定の輝く宇宙の旗"),
    "shop.item.vip_aura_ascendant.name": T("Ascendant Aura", "Aura del Ascendente", "Aufsteiger-Aura", "Aura dell'Ascendente", "Aura do Ascendente", "Ascendant-aura", "アセンダントのオーラ"),
    "shop.item.vip_aura_ascendant.description": T("Pulsating divine aura visible in the Nexus — VIP exclusivity", "Aura divina pulsante visible en el Nexus — exclusividad VIP", "Pulsierende göttliche Aura im Nexus — VIP-Exklusivität", "Aura divina pulsante visibile nel Nexus — esclusività VIP", "Aura divina pulsante visível no Nexus — exclusividade VIP", "Pulserende goddelijke aura in de Nexus — VIP-exclusiviteit", "Nexusで見える脈動する神聖オーラ — VIP限定"),
    "shop.item.vip_mount_celestial_drake.name": T("Celestial Drake", "Draco Celestial", "Himmlischer Drache", "Drago Celeste", "Draco Celestial", "Hemelse Draak", "天界のドレイク"),
    "shop.item.vip_mount_celestial_drake.description": T("Celestial draconic mount reserved for Ascendants", "Montura dracónica celestial reservada a los Ascendentes", "Himmlische Drachenmontur für Aufsteiger", "Montatura draconica celeste riservata agli Ascendenti", "Montaria dracônica celestial reservada aos Ascendentes", "Hemels drakenrijdier voor Ascendants", "アセンダント限定の天界ドラゴン乗り物"),
    "shop.item.vip_title_sovereign.name": T("Title: Sovereign of the Nexus", "Título: Soberano del Nexus", "Titel: Souverän des Nexus", "Titolo: Sovrano del Nexus", "Título: Soberano do Nexus", "Titel: Soeverein van de Nexus", "称号：Nexusの支配者"),
    "shop.item.vip_title_sovereign.description": T("Divine title exclusive to Ascendant Pass holders", "Título divino exclusivo para poseedores del Pase Ascendente", "Göttlicher Titel exklusiv für Inhaber des Aufstiegspasses", "Titolo divino esclusivo per i possessori del Pass Ascendente", "Título divino exclusivo para detentores do Passe Ascendente", "Goddelijke titel exclusief voor Ascendant Pass-bezitters", "アセンダントパス所持者限定の神聖称号"),

    # ── VIP boosts ──
    "shop.item.vip_boost_xp_3x_7d.name": T("Ascendant XP Elixir — 7d", "Elixir Ascendente de XP — 7d", "Aufsteiger-XP-Elixier — 7 T.", "Elisir Ascendente XP — 7g", "Elixir Ascendente de XP — 7d", "Ascendant XP-elixir — 7d", "アセンダントXPエリクサー — 7日"),
    "shop.item.vip_boost_xp_3x_7d.description": T("Triple XP for 7 days — VIP exclusivity", "Triple XP durante 7 días — exclusividad VIP", "Dreifache XP für 7 Tage — VIP-Exklusivität", "Triplica l'XP per 7 giorni — esclusività VIP", "XP triplo por 7 dias — exclusividade VIP", "Driedubbele XP gedurende 7 dagen — VIP-exclusiviteit", "7日間XP3倍 — VIP限定"),
    "shop.item.vip_boost_aether_3x_7d.name": T("Ascendant Écu Elixir — 7d", "Elixir Ascendente de Écus — 7d", "Aufsteiger-Écu-Elixier — 7 T.", "Elisir Ascendente Écu — 7g", "Elixir Ascendente de Écus — 7d", "Ascendant Écu-elixir — 7d", "アセンダントÉcuエリクサー — 7日"),
    "shop.item.vip_boost_aether_3x_7d.description": T("Triple Écus earned for 7 days — VIP exclusivity", "Triple de Écus ganados durante 7 días — exclusividad VIP", "Dreifache Écus für 7 Tage — VIP-Exklusivität", "Triplica gli Écu guadagnati per 7 giorni — esclusività VIP", "Triplica os Écus ganhos por 7 dias — exclusividade VIP", "Verdriedubbelde Écus gedurende 7 dagen — VIP-exclusiviteit", "7日間Écus獲得量3倍 — VIP限定"),
    "shop.item.vip_boost_luck_7d.name": T("Ascendant Fortune — 7d", "Fortuna del Ascendente — 7d", "Aufsteiger-Glück — 7 T.", "Fortuna dell'Ascendente — 7g", "Fortuna do Ascendente — 7d", "Ascendant Fortuin — 7d", "アセンダントの幸運 — 7日"),
    "shop.item.vip_boost_luck_7d.description": T("Greatly increased high-rarity odds for 7 days — VIP", "Probabilidades de rarezas altas muy aumentadas durante 7 días — VIP", "Stark erhöhte Chancen auf hohe Seltenheit für 7 Tage — VIP", "Probabilità di rarità elevate fortemente aumentate per 7 giorni — VIP", "Chances de raridades altas muito aumentadas por 7 dias — VIP", "Sterk verhoogde kansen op hoge zeldzaamheid gedurende 7 dagen — VIP", "7日間高レアリティ確率大幅UP — VIP"),

    # ── VIP chest ──
    "shop.item.vip_chest_ascendant.name": T("Ascendant Chest", "Cofre del Ascendente", "Aufsteiger-Truhe", "Forziere dell'Ascendente", "Baú do Ascendente", "Ascendant-kist", "アセンダントの宝箱"),
    "shop.item.vip_chest_ascendant.description": T("Divine chest guaranteeing a Legendary or higher relic — VIP", "Cofre divino que garantiza una reliquia Legendaria o superior — VIP", "Göttliche Truhe mit garantiert legendärer oder höherer Reliquie — VIP", "Forziere divino che garantisce una reliquia Leggendaria o superiore — VIP", "Baú divino garantindo uma relíquia Lendária ou superior — VIP", "Goddelijke kist met gegarandeerd Legendarisch of hoger relikwie — VIP", "レジェンダリー以上の遺物確定の神聖宝箱 — VIP"),

    # ── VIP consumables ──
    "shop.item.vip_key_divine.name": T("Divine Key", "Llave Divina", "Göttlicher Schlüssel", "Chiave Divina", "Chave Divina", "Goddelijke Sleutel", "神聖の鍵"),
    "shop.item.vip_key_divine.description": T("Opens a chest guaranteeing a Legendary+ relic — VIP", "Abre un cofre que garantiza una reliquia Legendaria+ — VIP", "Öffnet eine Truhe mit garantiert legendärer+ Reliquie — VIP", "Apre un forziere che garantisce una reliquia Leggendaria+ — VIP", "Abre um baú garantindo uma relíquia Lendária+ — VIP", "Opent een kist met gegarandeerd Legendarisch+ relikwie — VIP", "レジェンダリー以上確定の宝箱を開封 — VIP"),
    "shop.item.vip_relic_box.name": T("VIP Relic Box", "Caja de Reliquias VIP", "VIP-Reliquienkiste", "Scatola Reliquie VIP", "Caixa de Relíquias VIP", "VIP Relikwie-doos", "VIP遺物箱"),
    "shop.item.vip_relic_box.description": T("Opens a chest guaranteeing an Epic+ relic — VIP", "Abre un cofre que garantiza una reliquia Épica+ — VIP", "Öffnet eine Truhe mit garantiert epischer+ Reliquie — VIP", "Apre un forziere che garantisce una reliquia Epica+ — VIP", "Abre um baú garantindo uma relíquia Épica+ — VIP", "Opent een kist met gegarandeerd Episch+ relikwie — VIP", "エピック以上確定の宝箱を開封 — VIP"),
    "shop.item.vip_rift_catalyst.name": T("Major Rift Catalyst", "Catalizador de Grieta Mayor", "Großer Riss-Katalysator", "Catalizzatore di Fenditura Maggiore", "Catalisador de Fenda Maior", "Grote Kloofkatalysator", "大亀裂の触媒"),
    "shop.item.vip_rift_catalyst.description": T("Forces a treasure rift to appear — VIP", "Fuerza la aparición de una grieta de tesoro — VIP", "Erzwingt das Erscheinen eines Schatzrisses — VIP", "Forza l'apparizione di una fenditura del tesoro — VIP", "Força o aparecimento de uma fenda de tesouro — VIP", "Forceert het verschijnen van een schattenkloof — VIP", "宝の亀裂の出現を強制 — VIP"),
    "shop.item.vip_scroll_mutation.name": T("Grand Mutation Scroll", "Gran Pergamino de Mutación", "Große Mutationsrolle", "Grande Pergamena della Mutazione", "Grande Pergaminho de Mutação", "Grote Mutatierol", "大変異の巻物"),
    "shop.item.vip_scroll_mutation.description": T("Credits 5 class changes — VIP exclusivity", "Acredita 5 cambios de clase — exclusividad VIP", "Gewährt 5 Klassenwechsel — VIP-Exklusivität", "Accredita 5 cambi di classe — esclusività VIP", "Credita 5 mudanças de classe — exclusividade VIP", "Crediteert 5 klassewissels — VIP-exclusiviteit", "クラス変更5回分 — VIP限定"),
    "shop.item.vip_tome_knowledge.name": T("Tome of Knowledge", "Tomo de Conocimiento", "Foliant des Wissens", "Tomo della Conoscenza", "Tomo de Conhecimento", "Tome der Kennis", "知識の魔導書"),
    "shop.item.vip_tome_knowledge.description": T("Instantly grants 5000 XP — VIP exclusivity", "Otorga instantáneamente 5000 XP — exclusividad VIP", "Gewährt sofort 5000 XP — VIP-Exklusivität", "Conferisce istantaneamente 5000 XP — esclusività VIP", "Concede instantaneamente 5000 XP — exclusividade VIP", "Geeft direct 5000 XP — VIP-exclusiviteit", "即座に5000 XP付与 — VIP限定"),
    "shop.item.vip_emblem_renown.name": T("Emblem of Renown", "Emblema de Renombre", "Emblem des Ruhms", "Emblema del Renomo", "Emblema de Renome", "Embleem van Roem", "名声の紋章"),
    "shop.item.vip_emblem_renown.description": T("Instantly grants 800 reputation points — VIP", "Otorga instantáneamente 800 puntos de reputación — VIP", "Gewährt sofort 800 Reputationspunkte — VIP", "Conferisce istantaneamente 800 punti reputazione — VIP", "Concede instantaneamente 800 pontos de reputação — VIP", "Geeft direct 800 reputatiepunten — VIP", "即座に評判800付与 — VIP"),
    "shop.item.vip_skill_codex.name": T("Talent Codex", "Códice de Talentos", "Talent-Kodex", "Codice dei Talenti", "Códice de Talentos", "Talenten Codex", "才能の法典"),
    "shop.item.vip_skill_codex.description": T("Grants 3 skill points — VIP exclusivity", "Otorga 3 puntos de habilidad — exclusividad VIP", "Gewährt 3 Fertigkeitspunkte — VIP-Exklusivität", "Conferisce 3 punti abilità — esclusività VIP", "Concede 3 pontos de habilidade — exclusividade VIP", "Geeft 3 vaardigheidspunten — VIP-exclusiviteit", "スキルポイント3付与 — VIP限定"),
    "shop.item.vip_scroll_rename.name": T("Golden Rename Scroll", "Pergamino de Renombre Dorado", "Goldene Umbenennungsrolle", "Pergamena del Rinnovo Dorata", "Pergaminho de Renomeação Dourado", "Gouden Hernoemingsrol", "黄金の改名の巻物"),
    "shop.item.vip_scroll_rename.description": T("Allows you to change your username (VIP variant)", "Permite cambiar tu pseudo (variante VIP)", "Ermöglicht die Änderung deines Benutzernamens (VIP-Variante)", "Permette di cambiare il tuo nome utente (variante VIP)", "Permite alterar o seu nome de usuário (variante VIP)", "Maakt het wijzigen van je gebruikersnaam mogelijk (VIP-variant)", "ユーザー名変更（VIP版）"),

    # ── Écu packs ──
    "shop.ecu_pack.ecus_1000": T("Small Purse", "Bolsa Pequeña", "Kleiner Beutel", "Piccola Borsa", "Bolsa Pequena", "Klein Buurtje", "小さな財布"),
    "shop.ecu_pack.ecus_2500": T("Merchant's Purse", "Bolsa del Mercader", "Händlerbeutel", "Borsa del Mercante", "Bolsa do Mercador", "Koopmansbeurs", "商人の財布"),
    "shop.ecu_pack.ecus_6000": T("Royal Chest", "Cofre Real", "Königliche Truhe", "Forziere Reale", "Baú Real", "Koninklijke Kist", "王家の宝箱"),
    "shop.ecu_pack.ecus_15000": T("Cosmic Treasure", "Tesoro Cósmico", "Kosmischer Schatz", "Tesoro Cosmico", "Tesouro Cósmico", "Kosmische Schat", "宇宙の財宝"),

    # ── Title (profile display) ──
    "title.sovereign_nexus": T("Sovereign of the Nexus", "Soberano del Nexus", "Souverän des Nexus", "Sovrano del Nexus", "Soberano do Nexus", "Soeverein van de Nexus", "Nexusの支配者"),
}
# fmt: on


def fr_for_key(key: str) -> str:
    if key.startswith("shop.item."):
        parts = key.split(".")
        sku, field = parts[2], parts[3]
        for item in SHOP_ITEMS:
            if item["sku"] == sku:
                return item["name"] if field == "name" else item.get("description", "")
    if key.startswith("shop.ecu_pack."):
        pack_id = key.split(".", 2)[2]
        for pack in ECU_PACKS:
            if pack["id"] == pack_id:
                return pack["label"]
    if key == "title.sovereign_nexus":
        return "Souverain du Nexus"
    raise KeyError(key)


def expected_keys() -> list[str]:
    keys: list[str] = []
    for item in SHOP_ITEMS:
        keys += [f"shop.item.{item['sku']}.name", f"shop.item.{item['sku']}.description"]
    for pack in ECU_PACKS:
        keys.append(f"shop.ecu_pack.{pack['id']}")
    keys.append("title.sovereign_nexus")
    return keys


def main() -> None:
    keys = expected_keys()
    missing = [k for k in keys if k not in TRANSLATIONS]
    if missing:
        raise SystemExit(f"Missing translations for {len(missing)} keys:\n" + "\n".join(missing[:20]))

    out: dict[str, dict[str, str]] = {}
    for key in keys:
        fr = fr_for_key(key)
        langs = TRANSLATIONS[key]
        entry = {"fr": fr}
        for lang in LANGS[1:]:
            entry[lang] = langs[lang]
        out[key] = entry

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(out)} keys to {OUT}")


if __name__ == "__main__":
    main()
