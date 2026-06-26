#!/usr/bin/env python3
"""Generate catalog-i18n-overrides.json with 8-language translations."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(ROOT))

from game_data import BADGES, TITLES, ITEM_TEMPLATES, SKILLS, KINGDOM_BUILDINGS  # noqa: E402
from craft_data import CRAFT_RESOURCES, CRAFT_RECIPES, CRAFT_TIERS  # noqa: E402

LANGS = ["fr", "en", "es", "de", "it", "pt", "nl", "ja"]
OUT = Path(__file__).resolve().parent / "catalog-i18n-overrides.json"


def T(en, es, de, it, pt, nl, ja):
    return {"en": en, "es": es, "de": de, "it": it, "pt": pt, "nl": nl, "ja": ja}


# fmt: off
TRANSLATIONS: dict[str, dict[str, str]] = {
    # ── Badges: names ──
    "badge.first_step.name": T("First Step", "Primer Paso", "Erster Schritt", "Primo Passo", "Primeiro Passo", "Eerste Stap", "最初の一歩"),
    "badge.chatter_100.name": T("Chatterbox", "Parlanchín", "Schwätzer", "Chiacchierone", "Tagarela", "Kletskous", "おしゃべり"),
    "badge.chatter_1000.name": T("Orator", "Orador", "Redner", "Oratore", "Orador", "Redenaar", "雄弁家"),
    "badge.chatter_10000.name": T("Eternal Storyteller", "Narrador Eterno", "Ewiger Erzähler", "Narratore Eterno", "Contador Eterno", "Eeuwige Verteller", "永遠の語り部"),
    "badge.daily_streak_7.name": T("Regular", "Habitual", "Stammgast", "Assiduo", "Assíduo", "Vaste Bezoeker", "常連"),
    "badge.daily_streak_30.name": T("Pillar", "Pilar", "Säule", "Pilastro", "Pilar", "Pilaar", "柱"),
    "badge.discord_herald.name": T("Discord Herald", "Heraldo de Discord", "Discord-Herold", "Araldo di Discord", "Arauto do Discord", "Discord-herald", "Discordの使者"),
    "badge.loyal_friend.name": T("Loyal Friend", "Amigo Leal", "Treuer Freund", "Amico Fedele", "Amigo Leal", "Trouwe Vriend", "忠実な友"),
    "badge.recruteur.name": T("Recruiter", "Reclutador", "Rekrutierer", "Reclutatore", "Recrutador", "Recruiter", "リクルーター"),
    "badge.mentor_heroe.name": T("Hero Mentor", "Mentor de Héroes", "Mentor der Helden", "Mentore degli Eroi", "Mentor de Heróis", "Heldenmentor", "英雄のメンター"),
    "badge.parrain_legendaire.name": T("Legendary Sponsor", "Padrino Legendario", "Legendärer Pate", "Padrino Leggendario", "Padrinho Lendário", "Legendarische Peetoom", "伝説のスポンサー"),
    "badge.vip_nexus.name": T("Nexus VIP", "VIP del Nexus", "Nexus-VIP", "VIP del Nexus", "VIP do Nexus", "Nexus-VIP", "Nexus VIP"),
    "badge.pionnier_nexus.name": T("Nexus Pioneer", "Pionero del Nexus", "Nexus-Pionier", "Pioniere del Nexus", "Pioneiro do Nexus", "Nexus-pionier", "Nexusの開拓者"),
    "badge.beta_testeur.name": T("Beta Tester", "Beta Tester", "Beta-Tester", "Beta Tester", "Beta Tester", "Beta-tester", "ベータテスター"),
    "badge.season_passholder.name": T("Season Pass Holder", "Poseedor del Pase de Temporada", "Saisonpass-Inhaber", "Possessore del Pass Stagionale", "Detentor do Passe de Temporada", "Seizoenspas-houder", "シーズンパス所持者"),
    "badge.mentor.name": T("Mentor", "Mentor", "Mentor", "Mentore", "Mentor", "Mentor", "メンター"),
    "badge.influencer.name": T("Influencer", "Influencer", "Influencer", "Influencer", "Influenciador", "Influencer", "インフルエンサー"),
    "badge.social_butterfly.name": T("Social Butterfly", "Mariposa Social", "Sozialer Schmetterling", "Farfalla Sociale", "Borboleta Social", "Sociale Vlinder", "社交的な蝶"),
    "badge.legend_status.name": T("Legend Status", "Estatus de Leyenda", "Legendenstatus", "Status Leggenda", "Status de Lenda", "Legendestatus", "伝説の地位"),
    "badge.creator.name": T("Creator", "Creador", "Schöpfer", "Creatore", "Criador", "Maker", "創造者"),
    "badge.innovator.name": T("Innovator", "Innovador", "Innovator", "Innovatore", "Inovador", "Innovator", "革新者"),
    "badge.architect_master.name": T("Architect", "Arquitecto", "Architekt", "Architetto", "Arquiteto", "Architect", "建築家"),
    "badge.viral_post.name": T("Viral Post", "Post Viral", "Viraler Post", "Post Virale", "Post Viral", "Virale Post", "バイラル投稿"),
    "badge.relic_hunter.name": T("Relic Hunter", "Cazador de Reliquias", "Reliquienjäger", "Cacciatore di Reliquie", "Caçador de Relíquias", "Reliekenjager", "遺物狩人"),
    "badge.ultimate_collector.name": T("Ultimate Collector", "Coleccionista Supremo", "Ultimativer Sammler", "Collezionista Supremo", "Colecionador Supremo", "Ultieme Verzamelaar", "究極のコレクター"),
    "badge.mythic_owner.name": T("Mythic Owner", "Poseedor Mítico", "Mythischer Besitzer", "Possessore Mitico", "Possuidor Mítico", "Mythische Bezitter", "ミシック所持者"),
    "badge.divine_keeper.name": T("Divine Keeper", "Guardián Divino", "Göttlicher Hüter", "Custode Divino", "Guardião Divino", "Goddelijke Bewaker", "神聖な守護者"),
    "badge.cosmic_chosen.name": T("Cosmic Chosen", "Elegido Cósmico", "Kosmisch Auserwählter", "Prescelto Cosmico", "Escolhido Cósmico", "Kosmisch Uitverkorene", "宇宙の選ばれし者"),
    "badge.shapeshifter.name": T("Shapeshifter", "Metamorfo", "Gestaltwandler", "Mutaforma", "Metamorfo", "Gedaanteverwisselaar", "変身者"),
    "badge.renamed.name": T("Rebirth", "Renacimiento", "Wiedergeburt", "Rinascita", "Renascimento", "Wedergeboorte", "再生"),
    "badge.storyteller.name": T("Storyteller", "Narrador", "Geschichtenerzähler", "Narratore", "Contador", "Verhalenverteller", "語り部"),
    "badge.polyglot.name": T("Polyglot", "Políglota", "Polyglott", "Poliglotta", "Poliglota", "Polyglot", "多言語通"),
    "badge.merchant.name": T("Shrewd Merchant", "Comerciante Astuto", "Gewiefter Händler", "Mercante Astuto", "Comerciante Astuto", "Slimme Koopman", "賢い商人"),
    "badge.big_spender.name": T("Patron", "Mecenas", "Mäzen", "Mecenate", "Mecenas", "Mecenas", "パトロン"),
    "badge.class_master.name": T("Class Master", "Maestro de Clase", "Klassenmeister", "Maestro di Classe", "Mestre de Classe", "Klassemeester", "クラスマスター"),
    "badge.skill_tree_5.name": T("Apprentice", "Aprendiz", "Lehrling", "Apprendista", "Aprendiz", "Leerling", "見習い"),
    "badge.skill_tree_50.name": T("Specialist", "Especialista", "Spezialist", "Specialista", "Especialista", "Specialist", "スペシャリスト"),
    "badge.quest_finisher.name": T("Finisher", "Finalizador", "Vollender", "Completatore", "Finalizador", "Afronder", "クエスト完遂者"),
    "badge.quest_champion.name": T("Quest Champion", "Campeón de Misiones", "Quest-Champion", "Campione delle Missioni", "Campeão de Missões", "Quest-kampioen", "クエストチャンピオン"),
    "badge.founder_guild.name": T("Order Founder", "Fundador de Orden", "Ordensgründer", "Fondatore dell'Ordine", "Fundador da Ordem", "Ordestichter", "オーダー創設者"),
    "badge.scholar.name": T("Scholar", "Erudito", "Gelehrter", "Erudito", "Erudito", "Geleerde", "学者"),
    "badge.nexus_blessed.name": T("Nexus Blessed", "Bendito del Nexus", "Nexus-Gesegneter", "Benedetto del Nexus", "Abençoado do Nexus", "Nexus-gezegende", "Nexusの祝福を受けし者"),
    "badge.wheel_first_spin.name": T("Wheel of Fortune", "Rueda de la Fortuna", "Glücksrad", "Ruota della Fortuna", "Roda da Fortuna", "Rad van Fortuin", "幸運の輪"),
    "badge.wheel_spinner_7.name": T("Nexus Faithful", "Fiel del Nexus", "Nexus-Treuer", "Fedele del Nexus", "Fiel do Nexus", "Nexus-trouwe", "Nexusの忠実な者"),
    "badge.wheel_spinner_30.name": T("Nexus Seer", "Vidente del Nexus", "Nexus-Seher", "Veggente del Nexus", "Vidente do Nexus", "Nexus-wichelaar", "Nexusの予言者"),
    "badge.wheel_spinner_100.name": T("Wheel Master", "Maestro de la Rueda", "Radmeister", "Maestro della Ruota", "Mestre da Roda", "Wielmeester", "輪の達人"),
    "badge.wheel_lucky.name": T("Cosmic Favor", "Favor Cósmico", "Kosmische Gunst", "Favore Cosmico", "Favor Cósmico", "Kosmische Gunst", "宇宙の恩寵"),
    "badge.craft_apprentice.name": T("Apprentice Smith", "Aprendiz de Herrero", "Schmiedelehrling", "Apprendista Fabbro", "Aprendiz de Ferreiro", "Smidsleerling", "見習い鍛冶師"),
    "badge.craft_first_success.name": T("First Relic", "Primera Reliquia", "Erste Reliquie", "Prima Reliquia", "Primeira Relíquia", "Eerste Relikwie", "最初の遺物"),
    "badge.craft_forger_10.name": T("Blacksmith", "Herrero", "Schmied", "Fabbro", "Ferreiro", "Smid", "鍛冶師"),
    "badge.craft_forger_50.name": T("Nexus Artisan", "Artesano del Nexus", "Nexus-Handwerker", "Artigiano del Nexus", "Artesão do Nexus", "Nexus-ambachtsman", "Nexusの職人"),
    "badge.craft_master.name": T("Master Smith", "Maestro Herrero", "Meisterschmied", "Maestro Fabbro", "Mestre Ferreiro", "Meestersmid", "達人鍛冶師"),
    "badge.craft_grandmaster.name": T("Nexus Grandmaster", "Gran Maestro del Nexus", "Nexus-Großmeister", "Gran Maestro del Nexus", "Grão-Mestre do Nexus", "Nexus-grootmeester", "Nexusの大師"),
    "badge.craft_epic_smith.name": T("Epic Smith", "Herrero Épico", "Epischer Schmied", "Fabbro Epico", "Ferreiro Épico", "Epische Smid", "エピック鍛冶師"),
    "badge.craft_legend_smith.name": T("Legendary Forge", "Forja Legendaria", "Legendäre Schmiede", "Forgia Leggendaria", "Forja Lendária", "Legendarische Smidse", "伝説の鍛造"),
    "badge.craft_obsidian.name": T("Blade of Shadows", "Hoja de las Sombras", "Klinge der Schatten", "Lama delle Ombre", "Lâmina das Sombras", "Schaduwkling", "影の刃"),
    "badge.craft_hoarder.name": T("Cosmic Collector", "Coleccionista Cósmico", "Kosmischer Sammler", "Collezionista Cosmico", "Colecionador Cósmico", "Kosmische Verzamelaar", "宇宙の収集家"),
    "badge.craft_resilient.name": T("Hardened by Failure", "Endurecido por el Fracaso", "Durch Misserfolg gehärtet", "Indurito dal Fallimento", "Endurecido pelo Fracasso", "Verhard door Falen", "失敗に鍛えられし者"),
    "badge.season_champion.name": T("Season Champion", "Campeón de Temporada", "Saison-Champion", "Campione di Stagione", "Campeão da Temporada", "Seizoenskampioen", "シーズンチャンピオン"),
    "badge.season_elite.name": T("Season Elite", "Élite de Temporada", "Saison-Elite", "Élite di Stagione", "Elite da Temporada", "Seizoenselite", "シーズンエリート"),
    "badge.rift_walker.name": T("Rift Walker", "Caminante de Grietas", "Risswanderer", "Camminatore delle Fenditure", "Caminhante das Fendas", "Kloofwanderer", "亀裂の歩行者"),
    "badge.oracle_blessed.name": T("Oracle Blessed", "Bendito del Oráculo", "Orakel-Gesegneter", "Benedetto dell'Oracolo", "Abençoado do Oráculo", "Orakel-gezegende", "オラクルの祝福を受けし者"),
    "badge.news_scribe.name": T("News Scribe", "Escriba de Noticias", "Nachrichtenschreiber", "Scriba delle Notizie", "Escriba de Notícias", "Nieuwschrijver", "ニュースの書記"),
    "badge.news_sage.name": T("Realm Sage", "Sabio del Reino", "Weiser des Reiches", "Saggio del Regno", "Sábio do Reino", "Wijze van het Rijk", "王国の賢者"),
    "badge.news_herald.name": T("Chronicle Herald", "Heraldo de las Crónicas", "Chroniken-Herold", "Araldo delle Cronache", "Arauto das Crônicas", "Kronieken-herald", "年代記の使者"),
    "badge.guardian_just.name": T("Guardian of Justice", "Guardián de la Justicia", "Hüter der Gerechtigkeit", "Guardiano della Giustizia", "Guardião da Justiça", "Bewaker van Rechtvaardigheid", "正義の守護者"),
    "badge.hall_of_legends.name": T("Hall of Legends", "Salón de Leyendas", "Halle der Legenden", "Sala delle Leggende", "Salão das Lendas", "Hal der Legendes", "伝説の殿堂"),
    "badge.boss_slayer.name": T("Boss Slayer", "Asesino de Jefes", "Boss-Bezwinger", "Cacciatore di Boss", "Matador de Chefes", "Baasverslaaner", "ボススレイヤー"),

    # ── Badges: descriptions ──
    "badge.first_step.description": T("First post published", "Primer post publicado", "Erster Beitrag veröffentlicht", "Primo post pubblicato", "Primeira publicação feita", "Eerste bericht geplaatst", "最初の投稿を公開"),
    "badge.chatter_100.description": T("100 messages written", "100 mensajes escritos", "100 Nachrichten geschrieben", "100 messaggi scritti", "100 mensagens escritas", "100 berichten geschreven", "100件のメッセージを投稿"),
    "badge.chatter_1000.description": T("1000 messages written", "1000 mensajes escritos", "1000 Nachrichten geschrieben", "1000 messaggi scritti", "1000 mensagens escritas", "1000 berichten geschreven", "1000件のメッセージを投稿"),
    "badge.chatter_10000.description": T("10000 messages written", "10000 mensajes escritos", "10000 Nachrichten geschrieben", "10000 messaggi scritti", "10000 mensagens escritas", "10000 berichten geschreven", "10000件のメッセージを投稿"),
    "badge.daily_streak_7.description": T("7 consecutive days", "7 días consecutivos", "7 aufeinanderfolgende Tage", "7 giorni consecutivi", "7 dias consecutivos", "7 opeenvolgende dagen", "7日連続ログイン"),
    "badge.daily_streak_30.description": T("30 consecutive days", "30 días consecutivos", "30 aufeinanderfolgende Tage", "30 giorni consecutivi", "30 dias consecutivos", "30 opeenvolgende dagen", "30日連続ログイン"),
    "badge.discord_herald.description": T("Registered or linked via Discord", "Registro o vinculación vía Discord", "Registrierung oder Verknüpfung über Discord", "Registrazione o collegamento tramite Discord", "Registro ou vinculação via Discord", "Geregistreerd of gekoppeld via Discord", "Discord経由で登録または連携"),
    "badge.loyal_friend.description": T("10 subscriptions", "10 suscripciones", "10 Abonnements", "10 iscrizioni", "10 inscrições", "10 abonnementen", "10件のフォロー"),
    "badge.recruteur.description": T("Sponsored 3 new heroes", "Ha patrocinado a 3 nuevos héroes", "3 neue Helden gesponsert", "Ha sponsorizzato 3 nuovi eroi", "Patrocinou 3 novos heróis", "3 nieuwe helden gesponsord", "3人の新しい英雄をスポンサー"),
    "badge.mentor_heroe.description": T("Sponsored 15 new heroes", "Ha patrocinado a 15 nuevos héroes", "15 neue Helden gesponsert", "Ha sponsorizzato 15 nuovi eroi", "Patrocinou 15 novos heróis", "15 nieuwe helden gesponsord", "15人の新しい英雄をスポンサー"),
    "badge.parrain_legendaire.description": T("Sponsored 50 new heroes", "Ha patrocinado a 50 nuevos héroes", "50 neue Helden gesponsert", "Ha sponsorizzato 50 nuovi eroi", "Patrocinou 50 novos heróis", "50 nieuwe helden gesponsord", "50人の新しい英雄をスポンサー"),
    "badge.vip_nexus.description": T("Holder of the Ascendant Pass", "Poseedor del Pase Ascendente", "Inhaber des Aufstiegspasses", "Possessore del Pass Ascendente", "Detentor do Passe Ascendente", "Bezitter van de Ascendant Pass", "アセンダントパス所持者"),
    "badge.pionnier_nexus.description": T("Among the first 100 heroes to join NEXORIA", "Entre los 100 primeros héroes en unirse a NEXORIA", "Unter den ersten 100 Helden, die NEXORIA beigetreten sind", "Tra i primi 100 eroi ad aver aderito a NEXORIA", "Entre os 100 primeiros heróis a entrar em NEXORIA", "Behorend tot de eerste 100 helden die NEXORIA joineden", "NEXORIAに参加した最初の100人の英雄の一人"),
    "badge.beta_testeur.description": T("Beta access activated — pioneer of the sealed Nexus", "Acceso beta activado — pionero del Nexus sellado", "Beta-Zugang aktiviert — Pionier des versiegelten Nexus", "Accesso beta attivato — pioniere del Nexus sigillato", "Acesso beta ativado — pioneiro do Nexus selado", "Beta-toegang geactiveerd — pionier van de verzegelde Nexus", "ベータアクセス有効化 — 封印されたNexusの開拓者"),
    "badge.season_passholder.description": T("Acquired the premium Season Pass", "Ha adquirido el Pase de Temporada premium", "Premium-Saisonpass erworben", "Ha acquistato il Pass Stagionale premium", "Adquiriu o Passe de Temporada premium", "Premium Seizoenspas aangeschaft", "プレミアムシーズンパスを取得"),
    "badge.mentor.description": T("100 subscribers", "100 suscriptores", "100 Abonnenten", "100 iscritti", "100 inscritos", "100 abonnees", "100人のフォロワー"),
    "badge.influencer.description": T("1000 subscribers", "1000 suscriptores", "1000 Abonnenten", "1000 iscritti", "1000 inscritos", "1000 abonnees", "1000人のフォロワー"),
    "badge.social_butterfly.description": T("50 reactions given", "50 reacciones dadas", "50 Reaktionen gegeben", "50 reazioni date", "50 reações dadas", "50 reacties gegeven", "50件のリアクションを付与"),
    "badge.legend_status.description": T("10000 subscribers", "10000 suscriptores", "10000 Abonnenten", "10000 iscritti", "10000 inscritos", "10000 abonnees", "10000人のフォロワー"),
    "badge.creator.description": T("10 publications", "10 publicaciones", "10 Veröffentlichungen", "10 pubblicazioni", "10 publicações", "10 publicaties", "10件の投稿"),
    "badge.innovator.description": T("100 publications", "100 publicaciones", "100 Veröffentlichungen", "100 pubblicazioni", "100 publicações", "100 publicaties", "100件の投稿"),
    "badge.architect_master.description": T("Kingdom level 5", "Reino nivel 5", "Königreich Stufe 5", "Regno livello 5", "Reino nível 5", "Koninkrijk niveau 5", "王国レベル5"),
    "badge.viral_post.description": T("100 reactions on a post", "100 reacciones en un post", "100 Reaktionen auf einen Beitrag", "100 reazioni su un post", "100 reações em uma publicação", "100 reacties op een bericht", "1件の投稿に100リアクション"),
    "badge.relic_hunter.description": T("10 rare items collected", "10 objetos raros coleccionados", "10 seltene Gegenstände gesammelt", "10 oggetti rari raccolti", "10 itens raros coletados", "10 zeldzame items verzameld", "レアアイテム10個を収集"),
    "badge.ultimate_collector.description": T("100 items collected", "100 objetos coleccionados", "100 Gegenstände gesammelt", "100 oggetti raccolti", "100 itens coletados", "100 items verzameld", "100個のアイテムを収集"),
    "badge.mythic_owner.description": T("Own a mythic item", "Poseer un objeto mítico", "Einen mythischen Gegenstand besitzen", "Possedere un oggetto mitico", "Possuir um item mítico", "Een mythisch item bezitten", "ミシックアイテムを所持"),
    "badge.divine_keeper.description": T("Own a divine item", "Poseer un objeto divino", "Einen göttlichen Gegenstand besitzen", "Possedere un oggetto divino", "Possuir um item divino", "Een goddelijk item bezitten", "ディバインアイテムを所持"),
    "badge.cosmic_chosen.description": T("Own a cosmic item", "Poseer un objeto cósmico", "Einen kosmischen Gegenstand besitzen", "Possedere un oggetto cosmico", "Possuir um item cósmico", "Een kosmisch item bezitten", "コズミックアイテムを所持"),
    "badge.shapeshifter.description": T("Changed appearance (avatar/banner)", "Ha modificado su apariencia (avatar/banner)", "Erscheinung geändert (Avatar/Banner)", "Ha modificato l'aspetto (avatar/banner)", "Alterou a aparência (avatar/banner)", "Uiterlijk gewijzigd (avatar/banner)", "外見を変更（アバター/バナー）"),
    "badge.renamed.description": T("Changed username via a Rename Scroll", "Ha cambiado de nombre con un Pergamino de Renombre", "Benutzername mit einer Umbenennungsrolle geändert", "Ha cambiato nome con una Pergamena del Rinnovo", "Alterou o nome com um Pergaminho de Renomeação", "Gebruikersnaam gewijzigd via een Hernoemingsrol", "改名の巻物で名前を変更"),
    "badge.storyteller.description": T("Wrote their character's story", "Ha escrito la historia de su personaje", "Die Geschichte des Charakters geschrieben", "Ha scritto la storia del personaggio", "Escreveu a história do personagem", "Het verhaal van hun personage geschreven", "キャラクターの物語を執筆"),
    "badge.polyglot.description": T("Explored the realm in multiple languages", "Ha explorado el reino en varios idiomas", "Das Reich in mehreren Sprachen erkundet", "Ha esplorato il regno in più lingue", "Explorou o reino em vários idiomas", "Het rijk in meerdere talen verkend", "複数の言語で王国を探索"),
    "badge.merchant.description": T("First purchase at the Écu Shop", "Primera compra en la Tienda de Écus", "Erster Kauf im Écu-Laden", "Primo acquisto nel Negozio degli Écu", "Primeira compra na Loja de Écus", "Eerste aankoop in de Écu-winkel", "Écuショップで初購入"),
    "badge.big_spender.description": T("5000 Écus spent at the Shop", "5000 Écus gastados en la Tienda", "5000 Écus im Laden ausgegeben", "5000 Écu spesi nel Negozio", "5000 Écus gastos na Loja", "5000 Écus uitgegeven in de winkel", "ショップで5000 Écusを消費"),
    "badge.class_master.description": T("Reach level 50 in your class", "Alcanzar nivel 50 en tu clase", "Stufe 50 in deiner Klasse erreichen", "Raggiungere livello 50 nella tua classe", "Alcançar nível 50 na sua classe", "Niveau 50 bereiken in je klasse", "クラスでレベル50到達"),
    "badge.skill_tree_5.description": T("5 skill points spent", "5 puntos de habilidad gastados", "5 Fertigkeitspunkte ausgegeben", "5 punti abilità spesi", "5 pontos de habilidade gastos", "5 vaardigheidspunten uitgegeven", "スキルポイント5消費"),
    "badge.skill_tree_50.description": T("50 skill points spent", "50 puntos de habilidad gastados", "50 Fertigkeitspunkte ausgegeben", "50 punti abilità spesi", "50 pontos de habilidade gastos", "50 vaardigheidspunten uitgegeven", "スキルポイント50消費"),
    "badge.quest_finisher.description": T("10 quests completed", "10 misiones completadas", "10 Quests abgeschlossen", "10 missioni completate", "10 missões concluídas", "10 quests voltooid", "クエスト10達成"),
    "badge.quest_champion.description": T("100 quests completed", "100 misiones completadas", "100 Quests abgeschlossen", "100 missioni completate", "100 missões concluídas", "100 quests voltooid", "クエスト100達成"),
    "badge.founder_guild.description": T("Founder of a mystical Order", "Fundador de una Orden mística", "Gründer eines mystischen Ordens", "Fondatore di un Ordine mistico", "Fundador de uma Ordem mística", "Oprichter van een mystieke Orde", "神秘のオーダーの創設者"),
    "badge.scholar.description": T("First topic opened on the Tribune", "Primer tema abierto en la Tribuna", "Erstes Thema auf der Tribune eröffnet", "Primo argomento aperto sulla Tribune", "Primeiro tópico aberto na Tribuna", "Eerste topic geopend op het Forum", "フォーラムで最初のトピックを作成"),
    "badge.nexus_blessed.description": T("Touched by the Nexus Wheel", "Tocado por la Rueda del Nexus", "Vom Nexus-Rad berührt", "Toccato dalla Ruota del Nexus", "Tocado pela Roda do Nexus", "Aangeraakt door het Nexus-wiel", "Nexusの輪に触れた"),
    "badge.wheel_first_spin.description": T("First spin on the Nexus Wheel", "Primer giro en la Rueda del Nexus", "Erste Drehung am Nexus-Rad", "Primo giro alla Ruota del Nexus", "Primeiro giro na Roda do Nexus", "Eerste draai aan het Nexus-wiel", "Nexusの輪で初スピン"),
    "badge.wheel_spinner_7.description": T("7 cumulative spins on the Nexus Wheel", "7 giros acumulados en la Rueda del Nexus", "7 kumulative Drehungen am Nexus-Rad", "7 giri cumulativi alla Ruota del Nexus", "7 giros acumulados na Roda do Nexus", "7 cumulatieve draaien aan het Nexus-wiel", "Nexusの輪で累計7スピン"),
    "badge.wheel_spinner_30.description": T("30 cumulative spins on the Nexus Wheel", "30 giros acumulados en la Rueda del Nexus", "30 kumulative Drehungen am Nexus-Rad", "30 giri cumulativi alla Ruota del Nexus", "30 giros acumulados na Roda do Nexus", "30 cumulatieve draaien aan het Nexus-wiel", "Nexusの輪で累計30スピン"),
    "badge.wheel_spinner_100.description": T("100 cumulative spins on the Nexus Wheel", "100 giros acumulados en la Rueda del Nexus", "100 kumulative Drehungen am Nexus-Rad", "100 giri cumulativi alla Ruota del Nexus", "100 giros acumulados na Roda do Nexus", "100 cumulatieve draaien aan het Nexus-wiel", "Nexusの輪で累計100スピン"),
    "badge.wheel_lucky.description": T("Legendary reward won on the Nexus Wheel", "Recompensa legendaria ganada en la Rueda del Nexus", "Legendäre Belohnung am Nexus-Rad gewonnen", "Ricompensa leggendaria vinta alla Ruota del Nexus", "Recompensa lendária ganha na Roda do Nexus", "Legendarische beloning gewonnen aan het Nexus-wiel", "Nexusの輪でレジェンダリー報酬を獲得"),
    "badge.craft_apprentice.description": T("First attempt at the Nexus Forge", "Primer intento en la Forja del Nexus", "Erster Versuch an der Nexus-Schmiede", "Primo tentativo alla Forgia del Nexus", "Primeira tentativa na Forja do Nexus", "Eerste poging bij de Nexus-smidse", "Nexusの鍛冶場で初挑戦"),
    "badge.craft_first_success.description": T("First successful forge", "Primera forja exitosa", "Erste erfolgreiche Schmiedung", "Prima forgiatura riuscita", "Primeira forja bem-sucedida", "Eerste geslaagde smeding", "初めての鍛造成功"),
    "badge.craft_forger_10.description": T("10 attempts at the Forge", "10 intentos en la Forja", "10 Versuche an der Schmiede", "10 tentativi alla Forgia", "10 tentativas na Forja", "10 pogingen bij de smidse", "鍛冶場で10回挑戦"),
    "badge.craft_forger_50.description": T("50 attempts at the Forge", "50 intentos en la Forja", "50 Versuche an der Schmiede", "50 tentativi alla Forgia", "50 tentativas na Forja", "50 pogingen bij de smidse", "鍛冶場で50回挑戦"),
    "badge.craft_master.description": T("25 successful forges", "25 forjas exitosas", "25 erfolgreiche Schmiedungen", "25 forgiature riuscite", "25 forjas bem-sucedidas", "25 geslaagde smedingen", "25回の鍛造成功"),
    "badge.craft_grandmaster.description": T("100 successful forges", "100 forjas exitosas", "100 erfolgreiche Schmiedungen", "100 forgiature riuscite", "100 forjas bem-sucedidas", "100 geslaagde smedingen", "100回の鍛造成功"),
    "badge.craft_epic_smith.description": T("Forged an epic or higher relic", "Ha forjado una reliquia épica o superior", "Eine epische oder höhere Reliquie geschmiedet", "Ha forgiato una reliquia epica o superiore", "Forjou uma relíquia épica ou superior", "Een episch of hoger relikwie gesmeed", "エピック以上の遺物を鍛造"),
    "badge.craft_legend_smith.description": T("Forged a legendary relic", "Ha forjado una reliquia legendaria", "Eine legendäre Reliquie geschmiedet", "Ha forgiato una reliquia leggendaria", "Forjou uma relíquia lendária", "Een legendarisch relikwie gesmeed", "レジェンダリー遺物を鍛造"),
    "badge.craft_obsidian.description": T("Forged the Obsidian Blade", "Ha forjado la Hoja de Obsidiana", "Die Obsidianklinge geschmiedet", "Ha forgiato la Lama d'Ossidiana", "Forjou a Lâmina de Obsidiana", "Het Obsidianen Zwaard gesmeed", "黒曜石の刃を鍛造"),
    "badge.craft_hoarder.description": T("Owns all 6 forge materials at once", "Posee los 6 materiales de forja a la vez", "Besitzt alle 6 Schmiedematerialien gleichzeitig", "Possiede tutti e 6 i materiali da forgiatura contemporaneamente", "Possui os 6 materiais de forja ao mesmo tempo", "Bezit alle 6 smeedmaterialen tegelijk", "6種類の鍛造素材を同時に所持"),
    "badge.craft_resilient.description": T("Overcame 5 forge failures", "Ha superado 5 fracasos de forja", "5 Schmiedefehlschläge überwunden", "Ha superato 5 fallimenti di forgiatura", "Superou 5 falhas de forja", "5 smeedmislukkingen overwonnen", "鍛造失敗5回を乗り越え"),
    "badge.season_champion.description": T("1st place in a closed season", "1.º de una temporada cerrada", "1. Platz in einer abgeschlossenen Saison", "1° posto in una stagione conclusa", "1.º lugar em uma temporada encerrada", "1e plaats in een afgesloten seizoen", "終了したシーズンで1位"),
    "badge.season_elite.description": T("Top 10 in a closed season", "Top 10 de una temporada cerrada", "Top 10 in einer abgeschlossenen Saison", "Top 10 in una stagione conclusa", "Top 10 em uma temporada encerrada", "Top 10 in een afgesloten seizoen", "終了したシーズンでトップ10"),
    "badge.rift_walker.description": T("Survived a dimensional rift", "Ha sobrevivido a una grieta dimensional", "Einen dimensionalen Riss überlebt", "Sopravvissuto a una fenditura dimensionale", "Sobreviveu a uma fenda dimensional", "Een dimensionale kloof overleefd", "次元の亀裂を生き延びた"),
    "badge.oracle_blessed.description": T("Consulted the Oracle 10 times", "Ha consultado el Oráculo 10 veces", "Das Orakel 10 Mal befragt", "Ha consultato l'Oracolo 10 volte", "Consultou o Oráculo 10 vezes", "Het Orakel 10 keer geraadpleegd", "オラクルに10回相談"),
    "badge.news_scribe.description": T("First comment on a news post", "Primer comentario en una noticia", "Erster Kommentar zu einer Nachricht", "Primo commento su una notizia", "Primeiro comentário em uma notícia", "Eerste reactie op een nieuwsbericht", "ニュースに最初のコメント"),
    "badge.news_sage.description": T("25 comments on news posts", "25 comentarios en noticias", "25 Kommentare zu Nachrichten", "25 commenti sulle notizie", "25 comentários em notícias", "25 reacties op nieuwsberichten", "ニュースに25コメント"),
    "badge.news_herald.description": T("100 comments on news posts", "100 comentarios en noticias", "100 Kommentare zu Nachrichten", "100 commenti sulle notizie", "100 comentários em notícias", "100 reacties op nieuwsberichten", "ニュースに100コメント"),
    "badge.guardian_just.description": T("Report validated by moderators", "Denuncia validada por moderadores", "Meldung von Moderatoren bestätigt", "Segnalazione convalidata dai moderatori", "Denúncia validada pelos moderadores", "Melding gevalideerd door moderators", "通報がモデレーターに承認された"),
    "badge.hall_of_legends.description": T("Reach the global top 10", "Alcanzar el top 10 mundial", "Die globale Top 10 erreichen", "Raggiungere la top 10 mondiale", "Alcançar o top 10 mundial", "De wereldwijde top 10 bereiken", "世界トップ10に到達"),
    "badge.boss_slayer.description": T("Participated in defeating a world boss", "Participó en la derrota de un jefe mundial", "An der Niederlage eines Weltbosses teilgenommen", "Ha partecipato alla sconfitta di un boss mondiale", "Participou na derrota de um chefe mundial", "Deelgenomen aan het verslaan van een wereldbaas", "ワールドボスの討伐に参加"),

    # ── Titles ──
    "title.novice": T("Novice", "Novato", "Neuling", "Novizio", "Novato", "Novice", "見習い"),
    "title.voyageur": T("Traveler", "Viajero", "Reisender", "Viaggiatore", "Viajante", "Reiziger", "旅人"),
    "title.veteran": T("Veteran", "Veterano", "Veteran", "Veterano", "Veterano", "Veteraan", "ベテラン"),
    "title.maitre_ombres": T("Master of Shadows", "Maestro de las Sombras", "Meister der Schatten", "Maestro delle Ombre", "Mestre das Sombras", "Meester der Schaduwen", "影の達人"),
    "title.seigneur_temps": T("Lord of Time", "Señor del Tiempo", "Herr der Zeit", "Signore del Tempo", "Senhor do Tempo", "Heer der Tijd", "時の支配者"),
    "title.roi_createurs": T("King of Creators", "Rey de los Creadores", "König der Schöpfer", "Re dei Creatori", "Rei dos Criadores", "Koning der Makers", "創造者の王"),
    "title.legende_vivante": T("Living Legend", "Leyenda Viviente", "Lebende Legende", "Leggenda Vivente", "Lenda Viva", "Levende Legende", "生ける伝説"),
    "title.elu_cosmique": T("Cosmic Chosen", "Elegido Cósmico", "Kosmisch Auserwählter", "Prescelto Cosmico", "Escolhido Cósmico", "Kosmisch Uitverkorene", "宇宙の選ばれし者"),
    "title.starforged": T("Starforged", "Forjado de las Estrellas", "Sterngeschmiedet", "Forgiato dalle Stelle", "Forjado das Estrelas", "Stergesmeed", "星の鍛造"),
    "title.void_walker": T("Void Walker", "Caminante del Vacío", "Leerenwanderer", "Camminatore del Vuoto", "Caminhante do Vazio", "Leegtewandelaar", "虚空の歩行者"),
    "title.ambassadeur_nexus": T("Nexus Ambassador", "Embajador del Nexus", "Nexus-Botschafter", "Ambasciatore del Nexus", "Embaixador do Nexus", "Nexus-ambassadeur", "Nexusの大使"),
    "title.ascendant_nexus": T("Nexus Ascendant", "Ascendente del Nexus", "Nexus-Aufsteigender", "Ascendente del Nexus", "Ascendente do Nexus", "Nexus-ascendant", "Nexusのアセンダント"),
    "title.beta_tester": T("Beta Tester", "Beta Tester", "Beta-Tester", "Beta Tester", "Beta Tester", "Beta-tester", "ベータテスター"),

    # ── Items ──
    "item.rusty_blade": T("Rusty Blade", "Hoja Oxidada", "Rostige Klinge", "Lama Arrugginita", "Lâmina Enferrujada", "Roestig Zwaard", "錆びた刃"),
    "item.iron_helm": T("Iron Helm", "Yelmo de Hierro", "Eisenhelm", "Elmo di Ferro", "Elmo de Ferro", "IJzeren Helm", "鉄の兜"),
    "item.minor_potion": T("Minor Potion", "Poción Menor", "Kleiner Trank", "Pozione Minore", "Poção Menor", "Klein Drankje", "小ポーション"),
    "item.torch_oil": T("Torch Oil", "Aceite de Antorcha", "Fackelöl", "Olio di Torcia", "Óleo de Tocha", "Fakkelolie", "松明の油"),
    "item.leather_strap": T("Leather Strap", "Correa de Cuero", "Lederriemen", "Cinghia di Cuoio", "Correia de Couro", "Leren Riem", "革のストラップ"),
    "item.wooden_shield": T("Wooden Shield", "Escudo de Madera", "Holzschild", "Scudo di Legno", "Escudo de Madeira", "Houten Schild", "木の盾"),
    "item.copper_ring": T("Copper Ring", "Anillo de Cobre", "Kupferring", "Anello di Rame", "Anel de Cobre", "Koperen Ring", "銅の指輪"),
    "item.silver_amulet": T("Silver Amulet", "Amuleto de Plata", "Silberamulett", "Amuleto d'Argento", "Amuleto de Prata", "Zilveren Amulet", "銀のアミュレット"),
    "item.elven_bow": T("Elven Bow", "Arco Élfico", "Elfenbogen", "Arco Elfico", "Arco Élfico", "Elfenboog", "エルフの弓"),
    "item.rune_dagger": T("Rune Dagger", "Daga Rúnica", "Runendolch", "Pugnale Runico", "Adaga Rúnica", "Runendolken", "ルーンの短剣"),
    "item.moonstone": T("Moonstone", "Piedra Lunar", "Mondstein", "Pietra Lunare", "Pedra Lunar", "Maansteen", "月の石"),
    "item.mage_robe": T("Apprentice Mage Robe", "Túnica de Aprendiz de Mago", "Lehrling-Magierrobe", "Toga da Apprendista Mago", "Túnica de Aprendiz de Mago", "Leerling-magiermantel", "見習い魔道士のローブ"),
    "item.healing_elixir": T("Healing Elixir", "Elixir Curativo", "Heiltrank", "Elisir Curativo", "Elixir Curativo", "Geneeskrachtig Elixir", "治癒のエリクサー"),
    "item.sage_tome": T("Sage's Tome", "Tomo del Sabio", "Foliant des Weisen", "Tomo del Saggio", "Tomo do Sábio", "Tome van de Wijze", "賢者の魔導書"),
    "item.frost_staff": T("Frost Staff", "Bastón de Escarcha", "Froststab", "Bastone del Gelo", "Cajado de Gelo", "Vorststaf", "霜の杖"),
    "item.shadow_cloak": T("Shadow Cloak", "Capa de las Sombras", "Schattenumhang", "Mantello delle Ombre", "Manto das Sombras", "Schaduwmantel", "影のマント"),
    "item.ember_blade": T("Ember Blade", "Hoja de Brasa", "Glutklinge", "Lama di Brace", "Lâmina de Brasa", "Gloedkling", "残火の刃"),
    "item.ancient_compass": T("Ancient Compass", "Brújula Antigua", "Uralter Kompass", "Bussola Antica", "Bússola Antiga", "Oud Kompas", "古代の羅針盤"),
    "item.void_pendant": T("Void Pendant", "Colgante del Vacío", "Leerenanhänger", "Pendente del Vuoto", "Pingente do Vazio", "Leegte-hanger", "虚空のペンダント"),
    "item.warlord_helm": T("Warlord's Helm", "Yelmo del Señor de la Guerra", "Helm des Kriegsherrn", "Elmo del Signore della Guerra", "Elmo do Senhor da Guerra", "Oorlogsheer-helm", "軍閥の兜"),
    "item.trickster_mask": T("Trickster's Mask", "Máscara del Embaucador", "Masker des Tricksters", "Maschera dell'Imbroglione", "Máscara do Embusteiro", "Bedriegersmasker", "トリックスターの仮面"),
    "item.dragon_scale": T("Dragon Scale", "Escama de Dragón", "Drachenschuppe", "Scaglia di Drago", "Escama de Dragão", "Drakenschaal", "竜の鱗"),
    "item.phoenix_feather": T("Phoenix Feather", "Pluma de Fénix", "Phönixfeder", "Piuma di Fenice", "Pena de Fênix", "Feniksveer", "フェニックスの羽"),
    "item.starforged_blade": T("Starforged Blade", "Hoja Forjada de las Estrellas", "Sterngeschmiedete Klinge", "Lama Forgiata dalle Stelle", "Lâmina Forjada das Estrelas", "Stergesmeed Zwaard", "星の鍛造刃"),
    "item.leviathan_horn": T("Leviathan Horn", "Cuerno del Leviatán", "Leviathan-Horn", "Corno del Leviatano", "Chifre do Leviatã", "Leviathan-hoorn", "リヴァイアサンの角"),
    "item.kingmaker_crown": T("Kingmaker Crown", "Corona del Hacedor de Reyes", "Krone des Königsmachers", "Corona del Re-Fabbro", "Coroa do Fazedor de Reis", "Koningmaker-kroon", "王を作る者の冠"),
    "item.soul_lantern": T("Soul Lantern", "Linterna de las Almas", "Seelenlaterne", "Lanterna delle Anime", "Lanterna das Almas", "Zielenlantaarn", "魂のランタン"),
    "item.rune_sigil": T("Major Rune Sigil", "Sigilo Rúnico Mayor", "Großes Runensiegel", "Sigillo Runico Maggiore", "Sigilo Rúnico Maior", "Groot Runenzegel", "大ルーンの印章"),
    "item.world_anchor": T("World Anchor", "Ancla del Mundo", "Weltanker", "Ancora del Mondo", "Âncora do Mundo", "Wereldanker", "世界のアンカー"),
    "item.mythic_orb": T("Mythic Orb", "Orbe Mítico", "Mythische Kugel", "Sfera Mitica", "Orbe Mítico", "Mythische Bol", "ミシックオーブ"),
    "item.titan_gauntlet": T("Titan Gauntlet", "Guantelete del Titán", "Titanenhandschuh", "Guanto del Titano", "Manopla do Titã", "Titanenhandschoen", "タイタンの篭手"),
    "item.void_blade": T("Void Blade", "Hoja del Vacío", "Leerenklinge", "Lama del Vuoto", "Lâmina do Vazio", "Leegtekling", "虚空の刃"),
    "item.celestial_tome": T("Celestial Tome", "Tomo Celestial", "Himmlischer Foliant", "Tomo Celeste", "Tomo Celestial", "Hemels Tome", "天界の魔導書"),
    "item.divine_crown": T("Divine Crown", "Corona Divina", "Göttliche Krone", "Corona Divina", "Coroa Divina", "Goddelijke Kroon", "神聖な王冠"),
    "item.world_tree_branch": T("World Tree Branch", "Rama del Árbol-Mundo", "Ast des Weltenbaums", "Ramo dell'Albero-Mondo", "Ramo da Árvore-Mundo", "Tak van de Wereldboom", "世界樹の枝"),
    "item.godheart": T("Heart of a God", "Corazón de un Dios", "Herz eines Gottes", "Cuore di un Dio", "Coração de um Deus", "Hart van een God", "神の心臓"),
    "item.cosmic_shard": T("Cosmic Shard", "Fragmento Cósmico", "Kosmische Scherbe", "Frammento Cosmico", "Fragmento Cósmico", "Kosmische Scherf", "宇宙の欠片"),
    "item.star_seed": T("Star Seed", "Semilla Estelar", "Sternensamen", "Seme Stellare", "Semente Estelar", "Sterrenzaad", "星の種"),
    "item.infinity_loop": T("Infinity Loop", "Bucle del Infinito", "Unendlichkeitsschleife", "Anello dell'Infinito", "Loop do Infinito", "Oneindigheidslus", "無限の輪"),
    "item.mat_cosmic_dust": T("Cosmic Dust", "Polvo Cósmico", "Kosmischer Staub", "Polvere Cosmica", "Pó Cósmico", "Kosmisch Stof", "宇宙の塵"),
    "item.mat_dark_steel": T("Dark Steel", "Acero Oscuro", "Dunkelstahl", "Acciaio Oscuro", "Aço Sombrio", "Donker Staal", "闇の鋼"),
    "item.mat_arcane_essence": T("Arcane Essence", "Esencia Arcana", "Arkane Essenz", "Essenza Arcana", "Essência Arcana", "Arkane Essentie", "秘術のエッセンス"),
    "item.mat_nexus_crystal": T("Nexus Crystal", "Cristal del Nexus", "Nexus-Kristall", "Cristallo del Nexus", "Cristal do Nexus", "Nexus-kristal", "Nexusクリスタル"),
    "item.mat_ancient_fragment": T("Ancient Fragment", "Fragmento Antiguo", "Uraltes Fragment", "Frammento Antico", "Fragmento Antigo", "Oud Fragment", "古代の断片"),
    "item.mat_shadow_heart": T("Shadow Heart", "Corazón de Sombra", "Schattenherz", "Cuore d'Ombra", "Coração de Sombra", "Schaduw hart", "影の心"),

    # ── Skills ──
    "skill.creativity.name": T("Creativity", "Creatividad", "Kreativität", "Creatività", "Criatividade", "Creativiteit", "創造性"),
    "skill.influence.name": T("Influence", "Influencia", "Einfluss", "Influenza", "Influência", "Invloed", "影響力"),
    "skill.popularity.name": T("Popularity", "Popularidad", "Beliebtheit", "Popolarità", "Popularidade", "Populariteit", "人気"),
    "skill.expertise.name": T("Expertise", "Pericia", "Expertise", "Competenza", "Perícia", "Expertise", "専門性"),
    "skill.construction.name": T("Construction", "Construcción", "Bau", "Costruzione", "Construção", "Bouw", "建設"),
    "skill.collection.name": T("Collection", "Colección", "Sammlung", "Collezione", "Coleção", "Collectie", "収集"),
    "skill.leadership.name": T("Leadership", "Liderazgo", "Führung", "Leadership", "Liderança", "Leiderschap", "リーダーシップ"),
    "skill.discovery.name": T("Discovery", "Descubrimiento", "Entdeckung", "Scoperta", "Descoberta", "Ontdekking", "発見"),
    "skill.creativity.description": T("Increases XP earned from posts", "Aumenta la XP ganada por publicación", "Erhöht die durch Beiträge verdiente XP", "Aumenta l'XP guadagnata con le pubblicazioni", "Aumenta o XP ganho por publicação", "Verhoogt XP verdiend met berichten", "投稿で獲得するXPが増加"),
    "skill.influence.description": T("Multiplies reputation received", "Multiplica la reputación recibida", "Multipliziert erhaltene Reputation", "Moltiplica la reputazione ricevuta", "Multiplica a reputação recebida", "Vermenigvuldigt ontvangen reputatie", "獲得する評判が増加"),
    "skill.popularity.description": T("More reactions on your posts", "Más reacciones en tus posts", "Mehr Reaktionen auf deine Beiträge", "Più reazioni sui tuoi post", "Mais reações nas suas publicações", "Meer reacties op je berichten", "投稿へのリアクションが増加"),
    "skill.expertise.description": T("Unlocks rare items", "Desbloquea objetos raros", "Schaltet seltene Gegenstände frei", "Sblocca oggetti rari", "Desbloqueia itens raros", "Ontgrendelt zeldzame items", "レアアイテムを解放"),
    "skill.construction.description": T("Improves your kingdom faster", "Mejora tu reino más rápido", "Verbessert dein Königreich schneller", "Migliora il regno più velocemente", "Melhora seu reino mais rápido", "Verbeter je koninkrijk sneller", "王国の発展が加速"),
    "skill.collection.description": T("Increases drop rate", "Aumenta la tasa de drop", "Erhöht die Drop-Rate", "Aumenta il tasso di drop", "Aumenta a taxa de drop", "Verhoogt droppercentage", "ドロップ率が上昇"),
    "skill.leadership.description": T("Bonus in guilds and events", "Bonus en guildas y eventos", "Bonus in Gilden und Events", "Bonus in gilde ed eventi", "Bônus em guildas e eventos", "Bonus in gildes en evenementen", "ギルドとイベントでボーナス"),
    "skill.discovery.description": T("Reveals dimensional rifts", "Revela grietas dimensionales", "Enthüllt dimensionale Risse", "Rivela fenditure dimensionali", "Revela fendas dimensionais", "Onthult dimensionale kloven", "次元の亀裂を発見"),

    # ── Buildings ──
    "building.castle.name": T("Castle", "Castillo", "Schloss", "Castello", "Castelo", "Kasteel", "城"),
    "building.village.name": T("Village", "Aldea", "Dorf", "Villaggio", "Vila", "Dorp", "村"),
    "building.library.name": T("Library", "Biblioteca", "Bibliothek", "Biblioteca", "Biblioteca", "Bibliotheek", "図書館"),
    "building.forge.name": T("Forge", "Forja", "Schmiede", "Forgia", "Forja", "Smidse", "鍛冶場"),
    "building.trophy_tower.name": T("Trophy Tower", "Torre de Trofeos", "Trophäenturm", "Torre dei Trofei", "Torre de Troféus", "Trofeeëntoren", "トロフィーの塔"),
    "building.sanctuary.name": T("Sanctuary", "Santuario", "Heiligtum", "Santuario", "Santuário", "Heiligdom", "聖域"),
    "building.castle.description": T("The heart of your kingdom", "El corazón de tu reino", "Das Herz deines Königreichs", "Il cuore del tuo regno", "O coração do seu reino", "Het hart van je koninkrijk", "王国の中心"),
    "building.village.description": T("Your subjects thrive here", "Tus súbditos prosperan aquí", "Deine Untertanen gedeihen hier", "I tuoi sudditi prosperano qui", "Seus súditos prosperam aqui", "Je onderdanen gedijen hier", "臣民が繁栄する場所"),
    "building.library.description": T("Wisdom and ancient knowledge", "Sabiduría y conocimientos antiguos", "Weisheit und uraltes Wissen", "Saggezza e conoscenze antiche", "Sabedoria e conhecimentos antigos", "Wijsheid en oude kennis", "知恵と古代の知識"),
    "building.forge.description": T("Forge your destiny", "Forja tu destino", "Schmiede dein Schicksal", "Forgia il tuo destino", "Forje seu destino", "Smeed je lot", "運命を鍛えよ"),
    "building.trophy_tower.description": T("Display your exploits", "Expón tus hazañas", "Stelle deine Taten zur Schau", "Espone le tue imprese", "Exiba suas façanhas", "Toon je prestaties", "功績を展示"),
    "building.sanctuary.description": T("Sacred place of meditation", "Lugar sagrado de meditación", "Heiliger Ort der Meditation", "Luogo sacro di meditazione", "Lugar sagrado de meditação", "Heilige plek van meditatie", "瞑想の聖地"),

    # ── Craft resources ──
    "craft.resource.dark_steel": T("Dark Steel", "Acero Oscuro", "Dunkelstahl", "Acciaio Oscuro", "Aço Sombrio", "Donker Staal", "闇の鋼"),
    "craft.resource.nexus_crystal": T("Nexus Crystal", "Cristal del Nexus", "Nexus-Kristall", "Cristallo del Nexus", "Cristal do Nexus", "Nexus-kristal", "Nexusクリスタル"),
    "craft.resource.arcane_essence": T("Arcane Essence", "Esencia Arcana", "Arkane Essenz", "Essenza Arcana", "Essência Arcana", "Arkane Essentie", "秘術のエッセンス"),
    "craft.resource.cosmic_dust": T("Cosmic Dust", "Polvo Cósmico", "Kosmischer Staub", "Polvere Cosmica", "Pó Cósmico", "Kosmisch Stof", "宇宙の塵"),
    "craft.resource.ancient_fragment": T("Ancient Fragment", "Fragmento Antiguo", "Uraltes Fragment", "Frammento Antico", "Fragmento Antigo", "Oud Fragment", "古代の断片"),
    "craft.resource.shadow_heart": T("Shadow Heart", "Corazón de Sombra", "Schattenherz", "Cuore d'Ombra", "Coração de Sombra", "Schaduw hart", "影の心"),

    # ── Craft recipes ──
    "craft.recipe.nexus_ring.name": T("Nexus Ring", "Anillo del Nexus", "Nexus-Ring", "Anello del Nexus", "Anel do Nexus", "Nexus-ring", "Nexusの指輪"),
    "craft.recipe.nexus_ring.description": T("Ring infused with stellar energy. Symbolic prestige and protection.", "Anillo impregnado de energía estelar. Prestigio y protección simbólica.", "Ring durchdrungen von Sternenenergie. Symbolischer Prestige und Schutz.", "Anello impregnato di energia stellare. Prestigio e protezione simbolica.", "Anel impregnado de energia estelar. Prestígio e proteção simbólica.", "Ring doordrenkt met sterrenenergie. Symbolisch prestige en bescherming.", "星のエネルギーを帯びた指輪。象徴的な威信と加護。"),
    "craft.recipe.obsidian_blade.name": T("Obsidian Blade", "Hoja de Obsidiana", "Obsidianklinge", "Lama d'Ossidiana", "Lâmina de Obsidiana", "Obsidianen Zwaard", "黒曜石の刃"),
    "craft.recipe.obsidian_blade.description": T("Blade forged in the shadow of rifts. Sharp and unstable.", "Hoja forjada en la sombra de las grietas. Afilada e inestable.", "In den Schatten der Risse geschmiedete Klinge. Scharf und instabil.", "Lama forgiata nell'ombra delle fenditure. Affilata e instabile.", "Lâmina forjada na sombra das fendas. Afiada e instável.", "Zwaard gesmeed in de schaduw van kloven. Scherp en instabiel.", "亀裂の影に鍛えられた刃。鋭く不安定。"),
    "craft.recipe.arcane_amulet.name": T("Arcane Amulet", "Amuleto Arcano", "Arkanes Amulett", "Amuleto Arcano", "Amuleto Arcano", "Arkan Amulet", "秘術のアミュレット"),
    "craft.recipe.arcane_amulet.description": T("Stabilized arcane focus for Nexus mages.", "Foco arcano estabilizado para magos del Nexus.", "Stabilisierter arkaner Fokus für Nexus-Magier.", "Focus arcano stabilizzato per i maghi del Nexus.", "Foco arcano estabilizado para magos do Nexus.", "Gestabiliseerde arkanen focus voor Nexus-magiërs.", "Nexusの魔道士向け安定秘術焦点。"),
    "craft.recipe.artisan_chest.name": T("Artisan Chest", "Cofre de Artesano", "Handwerkertruhe", "Forziere dell'Artigiano", "Baú de Artesão", "Ambachtskist", "職人の宝箱"),
    "craft.recipe.artisan_chest.description": T("Chest packed by Nexus smiths. Contains an artisan surprise.", "Cofre empacado por herreros del Nexus. Contiene una sorpresa artesanal.", "Von Nexus-Schmieden gepackte Truhe. Enthält eine handwerkliche Überraschung.", "Forziere confezionato dai fabbri del Nexus. Contiene una sorpresa artigianale.", "Baú embalado por ferreiros do Nexus. Contém uma surpresa artesanal.", "Kist ingepakt door Nexus-smids. Bevat een ambachtelijke verrassing.", "Nexusの鍛冶師が詰めた宝箱。職人のサプライズ入り。"),

    # ── Craft tiers ──
    "craft.tier.apprenti": T("Apprentice", "Aprendiz", "Lehrling", "Apprendista", "Aprendiz", "Leerling", "見習い"),
    "craft.tier.forgeron": T("Blacksmith", "Herrero", "Schmied", "Fabbro", "Ferreiro", "Smid", "鍛冶師"),
    "craft.tier.artisan": T("Artisan", "Artesano", "Handwerker", "Artigiano", "Artesão", "Ambachtsman", "職人"),
    "craft.tier.maitre": T("Master Smith", "Maestro Herrero", "Meisterschmied", "Maestro Fabbro", "Mestre Ferreiro", "Meestersmid", "達人鍛冶師"),
    "craft.tier.grand_maitre": T("Nexus Grandmaster", "Gran Maestro del Nexus", "Nexus-Großmeister", "Gran Maestro del Nexus", "Grão-Mestre do Nexus", "Nexus-grootmeester", "Nexusの大師"),
}
# fmt: on


def fr_for_key(key: str) -> str:
    if key.startswith("badge."):
        bid = key.split(".")[1]
        field = key.split(".")[2]
        for b in BADGES:
            if b["id"] == bid:
                return b["name"] if field == "name" else b.get("description", "")
    if key.startswith("title."):
        tid = key.split(".", 1)[1]
        for t in TITLES:
            if t["id"] == tid:
                return t["name"]
    if key.startswith("item."):
        iid = key.split(".", 1)[1]
        for i in ITEM_TEMPLATES:
            if i["id"] == iid:
                return i["name"]
    if key.startswith("skill."):
        sid = key.split(".")[1]
        field = key.split(".")[2]
        for s in SKILLS:
            if s["id"] == sid:
                return s["name"] if field == "name" else s.get("description", "")
    if key.startswith("building."):
        bid = key.split(".")[1]
        field = key.split(".")[2]
        for b in KINGDOM_BUILDINGS:
            if b["id"] == bid:
                return b["name"] if field == "name" else b.get("description", "")
    if key.startswith("craft.resource."):
        rid = key.split(".", 2)[2]
        return CRAFT_RESOURCES[rid]["name"]
    if key.startswith("craft.recipe."):
        parts = key.split(".")
        rid, field = parts[2], parts[3]
        for r in CRAFT_RECIPES:
            if r["id"] == rid:
                return r["name"] if field == "name" else r.get("description", "")
    if key.startswith("craft.tier."):
        tid = key.split(".", 2)[2]
        for t in CRAFT_TIERS:
            if t["id"] == tid:
                return t["label"]
    raise KeyError(key)


def expected_keys() -> list[str]:
    keys: list[str] = []
    for b in BADGES:
        keys += [f"badge.{b['id']}.name", f"badge.{b['id']}.description"]
    for t in TITLES:
        keys.append(f"title.{t['id']}")
    for i in ITEM_TEMPLATES:
        keys.append(f"item.{i['id']}")
    for s in SKILLS:
        keys += [f"skill.{s['id']}.name", f"skill.{s['id']}.description"]
    for b in KINGDOM_BUILDINGS:
        keys += [f"building.{b['id']}.name", f"building.{b['id']}.description"]
    for r in CRAFT_RESOURCES.values():
        keys.append(f"craft.resource.{r['id']}")
    for r in CRAFT_RECIPES:
        keys.append(f"craft.recipe.{r['id']}.name")
        if r.get("description"):
            keys.append(f"craft.recipe.{r['id']}.description")
    for t in CRAFT_TIERS:
        keys.append(f"craft.tier.{t['id']}")
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
