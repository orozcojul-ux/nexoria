// i18n — Context React, 8 langues
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { getToken } from "@/lib/api";
import { TRANSLATIONS } from "@/i18n/translations";
import { TRANSLATIONS_EXTENDED } from "@/i18n/translations-extended";
import { TRANSLATIONS_UI } from "@/i18n/translations-ui";
import { LANGS, LOCALE_MAP, STORAGE_KEY } from "@/lib/languages";
/** Resolve translation with fallback chain: lang → en → fr */
function resolve(entry, lang) {
  if (!entry) return null;
  return entry[lang] || entry.en || entry.fr || null;
}

const TR = {
  "nav.feed": { fr: "Place Publique", en: "Public Square", es: "Plaza Pública", de: "Marktplatz", it: "Piazza Pubblica", pt: "Praça Pública", nl: "Openbaar Plein", ja: "公共広場" },
  "nav.hero": { fr: "Mon Héros", en: "My Hero", es: "Mi Héroe", de: "Mein Held", it: "Mio Eroe", pt: "Meu Herói", nl: "Mijn Held", ja: "マイヒーロー" },
  "nav.skills": { fr: "Constellation", en: "Constellation", es: "Constelación", de: "Konstellation", it: "Costellazione", pt: "Constelação", nl: "Constellatie", ja: "星座" },
  "nav.kingdom": { fr: "Royaume", en: "Kingdom", es: "Reino", de: "Königreich", it: "Regno", pt: "Reino", nl: "Koninkrijk", ja: "王国" },
  "nav.inventory": { fr: "Reliques", en: "Relics", es: "Reliquias", de: "Reliquien", it: "Reliquie", pt: "Relíquias", nl: "Relikwieën", ja: "遺物" },
  "nav.quests": { fr: "Tableau de Chasse", en: "Hunting Board", es: "Tabla de Caza", de: "Jagdtafel", it: "Tabella di Caccia", pt: "Quadro de Caça", nl: "Jachtbord", ja: "狩猟掲示板" },
  "nav.oracle": { fr: "Sanctuaire", en: "Sanctuary", es: "Santuario", de: "Heiligtum", it: "Santuario", pt: "Santuário", nl: "Heiligdom", ja: "聖域" },
  "nav.leaderboards": { fr: "Hall des Légendes", en: "Hall of Legends", es: "Salón de Leyendas", de: "Halle der Legenden", it: "Hall of Legends", pt: "Salão das Lendas", nl: "Hal der Legendes", ja: "伝説の間" },
  "nav.legends": { fr: "Panthéon", en: "Pantheon", es: "Panteón", de: "Pantheon", it: "Pantheon", pt: "Panteão", nl: "Pantheon", ja: "パンテオン" },
  "nav.shop": { fr: "Boutique d'Écus", en: "Écus Shop", es: "Tienda de Écus", de: "Écus-Shop", it: "Bottega di Écus", pt: "Loja de Écus", nl: "Écus Winkel", ja: "Écusショップ" },
  "nav.world": { fr: "Carte du Monde", en: "World Map", es: "Mapa del Mundo", de: "Weltkarte", it: "Mappa del Mondo", pt: "Mapa do Mundo", nl: "Wereldkaart", ja: "世界地図" },
  "nav.nexus": { fr: "Nexus Online", en: "Nexus Online", es: "Nexus Online", de: "Nexus Online", it: "Nexus Online", pt: "Nexus Online", nl: "Nexus Online", ja: "ネクサスオンライン" },
  "nav.guilds": { fr: "Ordres", en: "Guilds", es: "Órdenes", de: "Orden", it: "Ordini", pt: "Ordens", nl: "Gilden", ja: "ギルド" },
  "nav.forum": { fr: "Tribune", en: "Forum", es: "Foro", de: "Forum", it: "Forum", pt: "Fórum", nl: "Forum", ja: "フォーラム" },
  "nav.friends": { fr: "Compagnons", en: "Friends", es: "Compañeros", de: "Gefährten", it: "Compagni", pt: "Companheiros", nl: "Metgezellen", ja: "仲間" },
  "nav.referral": { fr: "Parrainage", en: "Referral", es: "Padrinazgo", de: "Empfehlung", it: "Referral", pt: "Indicação", nl: "Verwijzing", ja: "紹介" },
  "nav.tickets": { fr: "Missives", en: "Tickets", es: "Misivas", de: "Anliegen", it: "Missive", pt: "Missivas", nl: "Berichten", ja: "チケット" },
  "nav.settings": { fr: "Paramètres", en: "Settings", es: "Ajustes", de: "Einstellungen", it: "Impostazioni", pt: "Configurações", nl: "Instellingen", ja: "設定" },
  "nav.admin": { fr: "Conseil", en: "Council", es: "Consejo", de: "Rat", it: "Consiglio", pt: "Conselho", nl: "Raad", ja: "評議会" },

  "common.logout": { fr: "Quitter le royaume", en: "Leave the realm", es: "Abandonar el reino", de: "Königreich verlassen", it: "Lascia il regno", pt: "Sair do reino", nl: "Verlaat het rijk", ja: "王国を去る" },
  "common.save": { fr: "Enregistrer", en: "Save", es: "Guardar", de: "Speichern", it: "Salva", pt: "Salvar", nl: "Opslaan", ja: "保存" },
  "common.cancel": { fr: "Annuler", en: "Cancel", es: "Cancelar", de: "Abbrechen", it: "Annulla", pt: "Cancelar", nl: "Annuleren", ja: "キャンセル" },
  "common.confirm": { fr: "Confirmer", en: "Confirm", es: "Confirmar", de: "Bestätigen", it: "Conferma", pt: "Confirmar", nl: "Bevestigen", ja: "確認" },
  "common.delete": { fr: "Supprimer", en: "Delete", es: "Eliminar", de: "Löschen", it: "Elimina", pt: "Excluir", nl: "Verwijderen", ja: "削除" },
  "common.edit": { fr: "Modifier", en: "Edit", es: "Editar", de: "Bearbeiten", it: "Modifica", pt: "Editar", nl: "Bewerken", ja: "編集" },
  "common.close": { fr: "Fermer", en: "Close", es: "Cerrar", de: "Schließen", it: "Chiudi", pt: "Fechar", nl: "Sluiten", ja: "閉じる" },
  "common.loading": { fr: "Chargement...", en: "Loading...", es: "Cargando...", de: "Lädt...", it: "Caricamento...", pt: "Carregando...", nl: "Laden...", ja: "読み込み中..." },
  "common.aether": { fr: "Écus", en: "Écus", es: "Écus", de: "Écus", it: "Écus", pt: "Écus", nl: "Écus", ja: "Écus" },
  "common.level": { fr: "Niveau", en: "Level", es: "Nivel", de: "Stufe", it: "Livello", pt: "Nível", nl: "Niveau", ja: "レベル" },
  "common.xp": { fr: "XP", en: "XP", es: "EXP", de: "EP", it: "EXP", pt: "XP", nl: "XP", ja: "XP" },

  "auth.login": { fr: "Connexion", en: "Login", es: "Iniciar sesión", de: "Anmelden", it: "Accedi", pt: "Entrar", nl: "Inloggen", ja: "ログイン" },
  "auth.register": { fr: "Forger mon Héros", en: "Forge my Hero", es: "Forjar mi Héroe", de: "Helden schmieden", it: "Forgia il mio Eroe", pt: "Forjar meu Herói", nl: "Smeed mijn Held", ja: "ヒーローを鍛造" },
  "auth.email": { fr: "E-mail", en: "Email", es: "Correo", de: "E-Mail", it: "Email", pt: "Email", nl: "E-mail", ja: "メール" },
  "auth.password": { fr: "Mot de passe", en: "Password", es: "Contraseña", de: "Passwort", it: "Password", pt: "Senha", nl: "Wachtwoord", ja: "パスワード" },
  "auth.username": { fr: "Nom d'utilisateur", en: "Username", es: "Nombre de usuario", de: "Benutzername", it: "Nome utente", pt: "Nome de usuário", nl: "Gebruikersnaam", ja: "ユーザー名" },
  "auth.continue_google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", de: "Mit Google fortfahren", it: "Continua con Google", pt: "Continuar com Google", nl: "Doorgaan met Google", ja: "Googleで続行" },
  "auth.continue_discord": { fr: "Connexion avec Discord", en: "Sign in with Discord", es: "Iniciar sesión con Discord", de: "Mit Discord anmelden", it: "Accedi con Discord", pt: "Entrar com Discord", nl: "Inloggen met Discord", ja: "Discordでログイン" },

  "settings.title": { fr: "Paramètres du Héros", en: "Hero Settings", es: "Ajustes del Héroe", de: "Helden-Einstellungen", it: "Impostazioni Eroe", pt: "Configurações do Herói", nl: "Held Instellingen", ja: "ヒーロー設定" },
  "settings.profile": { fr: "Profil", en: "Profile", es: "Perfil", de: "Profil", it: "Profilo", pt: "Perfil", nl: "Profiel", ja: "プロフィール" },
  "settings.account": { fr: "Compte", en: "Account", es: "Cuenta", de: "Konto", it: "Account", pt: "Conta", nl: "Account", ja: "アカウント" },
  "settings.security": { fr: "Sécurité", en: "Security", es: "Seguridad", de: "Sicherheit", it: "Sicurezza", pt: "Segurança", nl: "Beveiliging", ja: "セキュリティ" },
  "settings.preferences": { fr: "Préférences", en: "Preferences", es: "Preferencias", de: "Einstellungen", it: "Preferenze", pt: "Preferências", nl: "Voorkeuren", ja: "環境設定" },
  "settings.danger": { fr: "Zone Dangereuse", en: "Danger Zone", es: "Zona Peligrosa", de: "Gefahrenzone", it: "Zona Pericolosa", pt: "Zona de Perigo", nl: "Gevarenzone", ja: "危険ゾーン" },
  "settings.bio": { fr: "Biographie", en: "Bio", es: "Biografía", de: "Bio", it: "Biografia", pt: "Biografia", nl: "Bio", ja: "自己紹介" },
  "settings.quote": { fr: "Citation", en: "Quote", es: "Cita", de: "Zitat", it: "Citazione", pt: "Citação", nl: "Citaat", ja: "引用" },
  "settings.story": { fr: "Histoire du personnage", en: "Character story", es: "Historia del personaje", de: "Charaktergeschichte", it: "Storia del personaggio", pt: "História do personagem", nl: "Personageverhaal", ja: "キャラクターストーリー" },
  "settings.language": { fr: "Langue", en: "Language", es: "Idioma", de: "Sprache", it: "Lingua", pt: "Idioma", nl: "Taal", ja: "言語" },
  "settings.language_changed": { fr: "Langue mise à jour", en: "Language updated", es: "Idioma actualizado", de: "Sprache aktualisiert", it: "Lingua aggiornata", pt: "Idioma atualizado", nl: "Taal bijgewerkt", ja: "言語を更新しました" },
  "settings.theme": { fr: "Thème visuel", en: "Visual theme", es: "Tema visual", de: "Visuelles Theme", it: "Tema visivo", pt: "Tema visual", nl: "Visueel thema", ja: "ビジュアルテーマ" },
  "settings.sound": { fr: "Effets sonores", en: "Sound effects", es: "Efectos de sonido", de: "Soundeffekte", it: "Effetti sonori", pt: "Efeitos sonoros", nl: "Geluidseffecten", ja: "効果音" },
  "settings.change_password": { fr: "Changer le mot de passe", en: "Change password", es: "Cambiar contraseña", de: "Passwort ändern", it: "Cambia password", pt: "Alterar senha", nl: "Wachtwoord wijzigen", ja: "パスワード変更" },
  "settings.current_password": { fr: "Mot de passe actuel", en: "Current password", es: "Contraseña actual", de: "Aktuelles Passwort", it: "Password attuale", pt: "Senha atual", nl: "Huidig wachtwoord", ja: "現在のパスワード" },
  "settings.new_password": { fr: "Nouveau mot de passe", en: "New password", es: "Nueva contraseña", de: "Neues Passwort", it: "Nuova password", pt: "Nova senha", nl: "Nieuw wachtwoord", ja: "新しいパスワード" },
  "settings.delete_account": { fr: "Supprimer mon compte", en: "Delete my account", es: "Eliminar mi cuenta", de: "Konto löschen", it: "Elimina account", pt: "Excluir minha conta", nl: "Account verwijderen", ja: "アカウント削除" },
  "settings.delete_warning": { fr: "Cette action est irréversible. Toutes vos données seront effacées.", en: "This is irreversible. All your data will be erased.", es: "Esto es irreversible.", de: "Dies ist unumkehrbar.", it: "Azione irreversibile.", pt: "Esta ação é irreversível.", nl: "Dit is onomkeerbaar.", ja: "この操作は取り消せません。" },
  "settings.server": { fr: "Serveur", en: "Server", es: "Servidor", de: "Server", it: "Server", pt: "Servidor", nl: "Server", ja: "サーバー" },
  "settings.server.nexus_auto": { fr: "Connexion automatique au Nexus", en: "Auto-connect to Nexus", es: "Conexión automática al Nexus", de: "Automatische Nexus-Verbindung", it: "Connessione automatica al Nexus", pt: "Conexão automática ao Nexus", nl: "Automatisch verbinden met Nexus", ja: "ネクサス自動接続" },
  "settings.server.nexus_auto_hint": { fr: "Rejoindre le Nexus Online à chaque connexion et apparaître dans le staff en ligne. Vous pourrez toujours entrer manuellement via le menu.", en: "Join Nexus Online on each login and appear in staff online. You can still enter manually from the menu.", es: "Unirse al Nexus Online en cada inicio de sesión. Puedes entrar manualmente desde el menú.", de: "Bei jedem Login dem Nexus Online beitreten. Manueller Zugang über das Menü bleibt möglich.", it: "Entra nel Nexus Online a ogni accesso. Puoi entrare manualmente dal menu.", pt: "Entrar no Nexus Online a cada login. Ainda pode entrar manualmente pelo menu.", nl: "Verbind bij elke login met Nexus Online. Handmatig via het menu blijft mogelijk.", ja: "ログイン時にネクサスオンラインへ自動参加。メニューから手動で入ることもできます。" },
  "settings.server.nexus_auto_on": { fr: "Connexion automatique activée", en: "Auto-connect enabled", es: "Conexión automática activada", de: "Automatische Verbindung aktiviert", it: "Connessione automatica attiva", pt: "Conexão automática ativada", nl: "Automatisch verbinden ingeschakeld", ja: "自動接続を有効にしました" },
  "settings.server.nexus_auto_off": { fr: "Connexion automatique désactivée", en: "Auto-connect disabled", es: "Conexión automática desactivada", de: "Automatische Verbindung deaktiviert", it: "Connessione automatica disattivata", pt: "Conexão automática desativada", nl: "Automatisch verbinden uitgeschakeld", ja: "自動接続を無効にしました" },

  "theme.choose": { fr: "Choisir un thème", en: "Choose a theme", es: "Elegir tema", de: "Theme wählen", it: "Scegli tema", pt: "Escolher tema", nl: "Kies thema", ja: "テーマを選択" },
  "theme.current": { fr: "Thème actuel", en: "Current theme", es: "Tema actual", de: "Aktuelles Theme", it: "Tema attuale", pt: "Tema atual", nl: "Huidig thema", ja: "現在のテーマ" },

  "search.placeholder": { fr: "Rechercher un joueur...", en: "Search a player...", es: "Buscar jugador...", de: "Spieler suchen...", it: "Cerca giocatore...", pt: "Buscar jogador...", nl: "Speler zoeken...", ja: "プレイヤーを検索..." },
  "search.admin_placeholder": { fr: "Rechercher un héros...", en: "Search a hero...", es: "Buscar héroe...", de: "Held suchen...", it: "Cerca eroe...", pt: "Buscar herói...", nl: "Held zoeken...", ja: "ヒーローを検索..." },
  "search.aria": { fr: "Recherche de joueur", en: "Player search", es: "Búsqueda de jugador", de: "Spielersuche", it: "Ricerca giocatore", pt: "Busca de jogador", nl: "Speler zoeken", ja: "プレイヤー検索" },
  "search.no_results": { fr: "Aucun héros trouvé", en: "No hero found", es: "Ningún héroe encontrado", de: "Kein Held gefunden", it: "Nessun eroe trovato", pt: "Nenhum herói encontrado", nl: "Geen held gevonden", ja: "ヒーローが見つかりません" },

  "landing.kicker": { fr: "Univers MMORPG social", en: "Social MMORPG universe", es: "Universo MMORPG social", de: "Soziales MMORPG-Universum", it: "Universo MMORPG sociale", pt: "Universo MMORPG social", nl: "Sociaal MMORPG universum", ja: "ソーシャルMMORPG宇宙" },
  "landing.subtitle": { fr: "Une plateforme MMORPG sociale premium. Choisis ta classe, rejoins une guilde, explore les 22 sanctuaires du Nexus et grave ta légende dans le cosmos.", en: "A premium social MMORPG platform. Choose your class, join a guild, explore 22 Nexus sanctuaries and carve your legend in the cosmos.", es: "Una plataforma MMORPG social premium. Elige tu clase, únete a un gremio y explora el Nexus.", de: "Eine Premium-Social-MMORPG-Plattform. Wähle deine Klasse und erkunde den Nexus.", it: "Una piattaforma MMORPG sociale premium. Scegli la tua classe ed esplora il Nexus.", pt: "Uma plataforma MMORPG social premium. Escolha sua classe e explore o Nexus.", nl: "Een premium sociaal MMORPG-platform. Kies je klasse en verken de Nexus.", ja: "プレミアムソーシャルMMORPG。クラスを選び、ギルドに参加し、ネクサスの22の聖域を探索しよう。" },
  "landing.cta.play": { fr: "Jouer maintenant", en: "Play now", es: "Jugar ahora", de: "Jetzt spielen", it: "Gioca ora", pt: "Jogar agora", nl: "Nu spelen", ja: "今すぐプレイ" },
  "landing.cta.nexus": { fr: "Entrer dans le Nexus", en: "Enter the Nexus", es: "Entrar al Nexus", de: "Nexus betreten", it: "Entra nel Nexus", pt: "Entrar no Nexus", nl: "Nexus betreden", ja: "ネクサスに入る" },
  "landing.scroll": { fr: "Découvrir", en: "Discover", es: "Descubrir", de: "Entdecken", it: "Scopri", pt: "Descobrir", nl: "Ontdekken", ja: "発見" },
  "landing.pulse.title": { fr: "Pulsation", en: "Pulse", es: "Pulso", de: "Puls", it: "Pulsazione", pt: "Pulso", nl: "Puls", ja: "脈動" },
  "landing.pulse.subtitle": { fr: "Le Nexus en temps réel", en: "The Nexus in real time", es: "El Nexus en tiempo real", de: "Der Nexus in Echtzeit", it: "Il Nexus in tempo reale", pt: "O Nexus em tempo real", nl: "De Nexus in realtime", ja: "リアルタイムのネクサス" },
  "landing.stat.heroes": { fr: "Héros connectés", en: "Heroes online", es: "Héroes conectados", de: "Helden online", it: "Eroi online", pt: "Heróis online", nl: "Helden online", ja: "オンラインヒーロー" },
  "landing.stat.heroes_sub": { fr: "En ligne maintenant", en: "Online now", es: "En línea ahora", de: "Jetzt online", it: "Online ora", pt: "Online agora", nl: "Nu online", ja: "現在オンライン" },
  "landing.stat.rooms": { fr: "Salles actives", en: "Active rooms", es: "Salas activas", de: "Aktive Räume", it: "Sale attive", pt: "Salas ativas", nl: "Actieve kamers", ja: "アクティブルーム" },
  "landing.stat.total": { fr: "au total", en: "total", es: "en total", de: "insgesamt", it: "in totale", pt: "no total", nl: "totaal", ja: "合計" },
  "landing.stat.guilds": { fr: "Guildes", en: "Guilds", es: "Gremios", de: "Gilden", it: "Gilde", pt: "Guildas", nl: "Gilden", ja: "ギルド" },
  "landing.stat.guilds_sub": { fr: "Bannières dressées", en: "Banners raised", es: "Banderas alzadas", de: "Banner gehisst", it: "Stendardi alzati", pt: "Bandeiras erguidas", nl: "Vlaggen gehesen", ja: "旗が掲げられた" },
  "landing.stat.events": { fr: "Événements", en: "Events", es: "Eventos", de: "Events", it: "Eventi", pt: "Eventos", nl: "Evenementen", ja: "イベント" },
  "landing.stat.events_sub": { fr: "En cours", en: "Ongoing", es: "En curso", de: "Laufend", it: "In corso", pt: "Em andamento", nl: "Lopend", ja: "進行中" },
  "landing.map.title": { fr: "Carte du Nexus", en: "Nexus Map", es: "Mapa del Nexus", de: "Nexus-Karte", it: "Mappa del Nexus", pt: "Mapa do Nexus", nl: "Nexus Kaart", ja: "ネクサスマップ" },
  "landing.map.subtitle": { fr: "12 sanctuaires phares — monde vivant", en: "12 featured sanctuaries — living world", es: "12 santuarios destacados", de: "12 ausgewählte Heiligtümer", it: "12 santuari in evidenza", pt: "12 santuários em destaque", nl: "12 uitgelichte heiligdommen", ja: "12の注目聖域" },
  "landing.map.enter": { fr: "Entrer maintenant", en: "Enter now", es: "Entrar ahora", de: "Jetzt betreten", it: "Entra ora", pt: "Entrar agora", nl: "Nu betreden", ja: "今すぐ入る" },
  "landing.map.login": { fr: "Se connecter pour entrer", en: "Log in to enter", es: "Inicia sesión para entrar", de: "Anmelden zum Betreten", it: "Accedi per entrare", pt: "Faça login para entrar", nl: "Log in om te betreden", ja: "ログインして入る" },
  "landing.room.live": { fr: "En ligne", en: "Online", es: "En línea", de: "Online", it: "Online", pt: "Online", nl: "Online", ja: "オンライン" },
  "landing.room.boss": { fr: "Boss actif", en: "Boss active", es: "Jefe activo", de: "Boss aktiv", it: "Boss attivo", pt: "Chefe ativo", nl: "Boss actief", ja: "ボス出現" },
  "landing.explore": { fr: "Explorer l'univers", en: "Explore the universe", es: "Explorar el universo", de: "Universum erkunden", it: "Esplora l'universo", pt: "Explorar o universo", nl: "Verken het universum", ja: "宇宙を探索" },
  "landing.nav.classes": { fr: "Classes", en: "Classes", es: "Clases", de: "Klassen", it: "Classi", pt: "Classes", nl: "Klassen", ja: "クラス" },
  "landing.nav.guilds": { fr: "Guildes", en: "Guilds", es: "Gremios", de: "Gilden", it: "Gilde", pt: "Guildas", nl: "Gilden", ja: "ギルド" },
  "landing.nav.rankings": { fr: "Classements", en: "Rankings", es: "Clasificaciones", de: "Ranglisten", it: "Classifiche", pt: "Rankings", nl: "Ranglijsten", ja: "ランキング" },
  "landing.nav.events": { fr: "Événements", en: "Events", es: "Eventos", de: "Events", it: "Eventi", pt: "Eventos", nl: "Evenementen", ja: "イベント" },
  "landing.nav.shop": { fr: "Boutique", en: "Shop", es: "Tienda", de: "Shop", it: "Negozio", pt: "Loja", nl: "Winkel", ja: "ショップ" },
  "landing.nav.oracle": { fr: "Oracle", en: "Oracle", es: "Oráculo", de: "Orakel", it: "Oracolo", pt: "Oráculo", nl: "Orakel", ja: "オラクル" },
  "landing.footer.title": { fr: "Rejoins la légende", en: "Join the legend", es: "Únete a la leyenda", de: "Werde zur Legende", it: "Unisciti alla leggenda", pt: "Junte-se à lenda", nl: "Word een legende", ja: "伝説に加わろう" },
  "landing.footer.sub": { fr: "Plus de {count} héros ont déjà commencé leur ascension. Quelle sera la tienne ?", en: "Over {count} heroes have already begun their ascent. What will yours be?", es: "Más de {count} héroes ya comenzaron su ascensión.", de: "Über {count} Helden haben bereits begonnen.", it: "Oltre {count} eroi hanno già iniziato.", pt: "Mais de {count} heróis já começaram.", nl: "Meer dan {count} helden zijn al begonnen.", ja: "{count}人以上のヒーローが既に冒険を始めています。" },
  "landing.footer.cta": { fr: "Commencer", en: "Get started", es: "Empezar", de: "Loslegen", it: "Inizia", pt: "Começar", nl: "Beginnen", ja: "始める" },

  "feed.kicker": { fr: "Tableau de bord", en: "Dashboard", es: "Panel", de: "Dashboard", it: "Dashboard", pt: "Painel", nl: "Dashboard", ja: "ダッシュボード" },
  "feed.greeting": { fr: "Bonjour", en: "Hello", es: "Hola", de: "Hallo", it: "Ciao", pt: "Olá", nl: "Hallo", ja: "こんにちは" },
  "feed.live": { fr: "Nexus en direct", en: "Nexus live", es: "Nexus en vivo", de: "Nexus live", it: "Nexus live", pt: "Nexus ao vivo", nl: "Nexus live", ja: "ネクサスライブ" },
  "feed.stat.staff": { fr: "Staff en ligne", en: "Staff online", es: "Staff en línea", de: "Staff online", it: "Staff online", pt: "Staff online", nl: "Staff online", ja: "スタッフオンライン" },
  "feed.stat.online": { fr: "Sur le site", en: "On site", es: "En el sitio", de: "Auf der Seite", it: "Sul sito", pt: "No site", nl: "Op de site", ja: "サイト上" },
  "feed.stat.visits": { fr: "Visites 24h", en: "Visits 24h", es: "Visitas 24h", de: "Besuche 24h", it: "Visite 24h", pt: "Visitas 24h", nl: "Bezoeken 24u", ja: "24時間訪問" },
  "feed.stat.events": { fr: "Événements", en: "Events", es: "Eventos", de: "Events", it: "Eventi", pt: "Eventos", nl: "Evenementen", ja: "イベント" },
  "feed.stat.signups": { fr: "Inscriptions 24h", en: "Signups 24h", es: "Registros 24h", de: "Anmeldungen 24h", it: "Iscrizioni 24h", pt: "Cadastros 24h", nl: "Aanmeldingen 24u", ja: "24時間登録" },
  "feed.compose": { fr: "Publier", en: "Publish", es: "Publicar", de: "Veröffentlichen", it: "Pubblica", pt: "Publicar", nl: "Publiceren", ja: "投稿" },
  "feed.compose_placeholder": { fr: "Que se passe-t-il, {name} ?", en: "What's happening, {name}?", es: "¿Qué pasa, {name}?", de: "Was passiert, {name}?", it: "Cosa succede, {name}?", pt: "O que acontece, {name}?", nl: "Wat gebeurt er, {name}?", ja: "どうした、{name}？" },
  "feed.publish": { fr: "Publier", en: "Post", es: "Publicar", de: "Posten", it: "Pubblica", pt: "Publicar", nl: "Plaatsen", ja: "投稿する" },
  "feed.published": { fr: "Publication envoyée (+{xp} XP)", en: "Post published (+{xp} XP)", es: "Publicación enviada (+{xp} XP)", de: "Beitrag veröffentlicht (+{xp} EP)", it: "Pubblicato (+{xp} XP)", pt: "Publicado (+{xp} XP)", nl: "Geplaatst (+{xp} XP)", ja: "投稿しました（+{xp} XP）" },
  "feed.publish_error": { fr: "Publication impossible", en: "Could not publish", es: "No se pudo publicar", de: "Veröffentlichung fehlgeschlagen", it: "Pubblicazione fallita", pt: "Falha ao publicar", nl: "Publiceren mislukt", ja: "投稿できませんでした" },
  "feed.activity": { fr: "Fil d'activité", en: "Activity feed", es: "Actividad", de: "Aktivitätsfeed", it: "Feed attività", pt: "Feed de atividade", nl: "Activiteitenfeed", ja: "アクティビティ" },
  "feed.empty": { fr: "Le silence règne… sois la première voix.", en: "Silence reigns… be the first voice.", es: "Reina el silencio… sé la primera voz.", de: "Stille herrscht… sei die erste Stimme.", it: "Regna il silenzio… sii la prima voce.", pt: "O silêncio reina… seja a primeira voz.", nl: "Stilte heerst… wees de eerste stem.", ja: "静寂が支配する…最初の声になろう。" },
  "feed.comment_placeholder": { fr: "Votre réponse...", en: "Your reply...", es: "Tu respuesta...", de: "Deine Antwort...", it: "La tua risposta...", pt: "Sua resposta...", nl: "Je antwoord...", ja: "返信..." },
  "feed.comment_send": { fr: "Répondre", en: "Reply", es: "Responder", de: "Antworten", it: "Rispondi", pt: "Responder", nl: "Antwoorden", ja: "返信" },
  "feed.delete_confirm": { fr: "Supprimer cette publication ?", en: "Delete this post?", es: "¿Eliminar esta publicación?", de: "Beitrag löschen?", it: "Eliminare questo post?", pt: "Excluir esta publicação?", nl: "Bericht verwijderen?", ja: "この投稿を削除しますか？" },
  "feed.deleted": { fr: "Publication retirée", en: "Post removed", es: "Publicación eliminada", de: "Beitrag entfernt", it: "Post rimosso", pt: "Publicação removida", nl: "Bericht verwijderd", ja: "投稿を削除しました" },
  "feed.delete_error": { fr: "Suppression impossible", en: "Could not delete", es: "No se pudo eliminar", de: "Löschen fehlgeschlagen", it: "Eliminazione fallita", pt: "Falha ao excluir", nl: "Verwijderen mislukt", ja: "削除できませんでした" },
  "feed.boss": { fr: "Menace cosmique", en: "Cosmic threat", es: "Amenaza cósmica", de: "Kosmische Bedrohung", it: "Minaccia cosmica", pt: "Ameaça cósmica", nl: "Kosmische dreiging", ja: "宇宙の脅威" },
  "feed.boss_link": { fr: "Voir l'événement", en: "View event", es: "Ver evento", de: "Event ansehen", it: "Vedi evento", pt: "Ver evento", nl: "Bekijk evenement", ja: "イベントを見る" },
  "feed.leaderboard": { fr: "Top héros", en: "Top heroes", es: "Top héroes", de: "Top Helden", it: "Top eroi", pt: "Top heróis", nl: "Top helden", ja: "トップヒーロー" },
  "feed.leaderboard_link": { fr: "Hall des Légendes", en: "Hall of Legends", es: "Salón de Leyendas", de: "Halle der Legenden", it: "Hall of Legends", pt: "Salão das Lendas", nl: "Hal der Legendes", ja: "伝説の間" },
  "feed.news.kicker": { fr: "À la une", en: "Featured", es: "Destacado", de: "Im Fokus", it: "In evidenza", pt: "Em destaque", nl: "Uitgelicht", ja: "注目" },
  "feed.news.more": { fr: "Toutes les news", en: "All news", es: "Todas las noticias", de: "Alle News", it: "Tutte le news", pt: "Todas as notícias", nl: "Alle nieuws", ja: "すべてのニュース" },
  "feed.news.section": { fr: "Actualités du royaume", en: "Realm news", es: "Noticias del reino", de: "Königreichs-News", it: "Notizie del regno", pt: "Notícias do reino", nl: "Koninkrijksnieuws", ja: "王国のニュース" },
  "feed.news.read": { fr: "Lire l'article", en: "Read article", es: "Leer artículo", de: "Artikel lesen", it: "Leggi articolo", pt: "Ler artigo", nl: "Artikel lezen", ja: "記事を読む" },
  "feed.news.empty": { fr: "Aucune actualité publiée pour le moment.", en: "No news published yet.", es: "Ninguna noticia publicada por ahora.", de: "Noch keine News veröffentlicht.", it: "Nessuna notizia pubblicata.", pt: "Nenhuma notícia publicada.", nl: "Nog geen nieuws gepubliceerd.", ja: "まだニュースはありません。" },
  "news.back": { fr: "Retour au tableau de bord", en: "Back to dashboard", es: "Volver al panel", de: "Zurück zum Dashboard", it: "Torna alla dashboard", pt: "Voltar ao painel", nl: "Terug naar dashboard", ja: "ダッシュボードに戻る" },

  "sidebar.guide": { fr: "Guide du jeu", en: "Game guide", es: "Guía del juego", de: "Spielanleitung", it: "Guida al gioco", pt: "Guia do jogo", nl: "Spelgids", ja: "ゲームガイド" },

  "legend.modal.title": { fr: "Guide du Royaume", en: "Realm Guide", es: "Guía del Reino", de: "Königreichs-Guide", it: "Guida del Regno", pt: "Guia do Reino", nl: "Koninkrijksgids", ja: "王国ガイド" },
  "legend.modal.subtitle": { fr: "Chroniques pour nouveaux héros", en: "Chronicles for new heroes", es: "Crónicas para nuevos héroes", de: "Chroniken für neue Helden", it: "Cronache per nuovi eroi", pt: "Crónicas para novos heróis", nl: "Kronieken voor nieuwe helden", ja: "新米英雄のための記録" },
  "legend.modal.cta": { fr: "J'ai compris — entrez dans la quête", en: "Got it — begin the quest", es: "Entendido — comienza la aventura", de: "Verstanden — Quest beginnen", it: "Ho capito — inizia la quest", pt: "Entendi — comece a aventura", nl: "Begrepen — start de quest", ja: "了解 — クエストへ" },

  "legend.intro.title": { fr: "Bienvenue à NEXORIA", en: "Welcome to NEXORIA", es: "Bienvenido a NEXORIA", de: "Willkommen bei NEXORIA", it: "Benvenuto a NEXORIA", pt: "Bem-vindo a NEXORIA", nl: "Welkom bij NEXORIA", ja: "NEXORIAへようこそ" },
  "legend.intro.body": {
    fr: "NEXORIA est un sanctuaire social pour la communauté : vous incarnez un héros, gagnez de l'expérience, collectionnez des reliques, rejoignez une guilde et participez aux saisons compétitives du royaume.\n\nCe n'est pas un jeu en ligne permanent — le royaume s'ouvre lors des événements organisés par le staff.",
    en: "NEXORIA is a social online RPG: play as a hero, earn experience, collect relics, join a guild and compete in seasonal rankings.",
    es: "NEXORIA es un RPG social en línea: encarna a un héroe, gana experiencia, colecciona reliquias, únete a un gremio y compite en las temporadas.",
    de: "NEXORIA ist ein soziales Online-RPG: Werde ein Held, sammle Erfahrung, Relikte, tritt einer Gilde bei und nimm an Saisons teil.",
    it: "NEXORIA è un RPG sociale online: interpreta un eroe, guadagna esperienza, colleziona reliquie, unisciti a una gilda e partecipa alle stagioni.",
    pt: "NEXORIA é um RPG social online: encarne um herói, ganhe experiência, colecione relíquias, junte-se a uma guilda e participe das temporadas.",
    nl: "NEXORIA is een sociale online RPG: word een held, verdien ervaring, verzamel relikwieën, sluit je aan bij een gilde en doe mee aan seizoenen.",
    ja: "NEXORIAはソーシャルオンラインRPGです。",
  },

  "legend.server.title": { fr: "Ouvertures du royaume", en: "Realm openings", es: "Aperturas del reino", de: "Königreichs-Öffnungen", it: "Aperture del regno", pt: "Aberturas do reino", nl: "Koninkrijks-openingen", ja: "王国の開放" },
  "legend.server.body": {
    fr: "Le serveur NEXORIA n'est pas ouvert en permanence. Les Sentinelles (staff) ouvrent les portes uniquement pour des événements communautaires : rassemblements, annonces, quêtes live, saisons et moments de convivialité.\n\nHors ouverture, rejoins le Discord pour être informé de la prochaine session. Les admins et modérateurs gardent l'accès pour préparer l'événement.",
    en: "The NEXORIA server is not always open. Staff open the gates only for community events: gatherings, announcements, live quests, seasons and social moments.\n\nWhen closed, join Discord to hear about the next opening. Admins and moderators keep access to prepare events.",
    es: "El servidor no está siempre abierto. El staff abre las puertas solo para eventos comunitarios.\n\nFuera de las aperturas, únete a Discord. El staff mantiene el acceso.",
    de: "Der Server ist nicht dauerhaft offen. Das Team öffnet die Tore nur für Community-Events.\n\nSchließe dich Discord an, wenn geschlossen. Staff behält Zugang.",
    it: "Il server non è sempre aperto. Lo staff apre i cancelli solo per eventi della community.\n\nQuando chiuso, unisciti a Discord. Staff e moderatori mantengono l'accesso.",
    pt: "O servidor não fica sempre aberto. A equipa abre as portas apenas para eventos da comunidade.\n\nQuando fechado, junta-te ao Discord. Staff mantém acesso.",
    nl: "De server is niet altijd open. Staff opent de poorten alleen voor community-evenementen.\n\nSluit je aan bij Discord wanneer gesloten. Staff houdt toegang.",
    ja: "サーバーは常時開放ではありません。スタッフがイベント時のみ開きます。",
  },

  "legend.xp.title": { fr: "Expérience & Niveaux", en: "Experience & Levels", es: "Experiencia y niveles", de: "Erfahrung & Level", it: "Esperienza e livelli", pt: "Experiência e níveis", nl: "Ervaring & levels", ja: "経験値とレベル" },
  "legend.xp.body": {
    fr: "L'XP s'obtient via les quêtes, les failles temporelles, les événements et l'activité du Nexus.\nChaque niveau augmente votre puissance et débloque la boutique, le royaume et de nouveaux contenus.\nVotre rang (Novice → Légende) reflète votre niveau global.",
    en: "Earn XP from quests, rifts, events and Nexus activity.\nEach level increases your power and unlocks the shop, kingdom and new content.\nYour rank (Novice → Legend) reflects your overall level.",
    es: "Gana XP con misiones, fallas, eventos y el Nexus.\nCada nivel aumenta tu poder y desbloquea contenido.\nTu rango refleja tu nivel global.",
    de: "XP durch Quests, Risse, Events und Nexus.\nJedes Level steigert deine Macht und schaltet Inhalte frei.\nDein Rang spiegelt dein Gesamtlevel wider.",
    it: "Guadagna XP con missioni, fenditure, eventi e Nexus.\nOgni livello aumenta la potenza e sblocca contenuti.\nIl tuo grado riflette il livello globale.",
    pt: "Ganhe XP com missões, fendas, eventos e Nexus.\nCada nível aumenta seu poder e desbloqueia conteúdo.\nSeu rank reflete seu nível global.",
    nl: "Verdien XP via quests, rifts, events en Nexus.\nElk level verhoogt je kracht en ontgrendelt content.\nJe rang weerspiegelt je totale level.",
    ja: "クエストやイベントでXPを獲得します。",
  },

  "legend.aether.title": { fr: "Écus ✦", en: "Écus ✦", es: "Écus ✦", de: "Écus ✦", it: "Écus ✦", pt: "Écus ✦", nl: "Écus ✦", ja: "Écus ✦" },
  "legend.aether.body": {
    fr: "Les Écus sont la monnaie royale. Gagnez-en via les quêtes, les événements et les récompenses de saison.\nDépensez-les à la Boutique (cosmétiques, boosts, titres…) ou pour améliorer votre Royaume.\nVotre solde se met à jour en temps réel sur le site — pas besoin de recharger la page.",
    en: "Écus are the royal currency. Earn them from quests, events and season rewards.\nSpend them in the Shop (cosmetics, boosts, titles…) or to upgrade your Kingdom.\nYour balance updates in real time — no page reload needed.",
    es: "Los Écus son la moneda real. Gánalos con misiones, eventos y recompensas de temporada.\nGástalos en la tienda o en tu reino.\nTu saldo se actualiza en tiempo real.",
    de: "Écus sind die königliche Währung. Verdiene sie durch Quests, Events und Saisonbelohnungen.\nGib sie in der Boutique oder im Königreich aus.\nDein Guthaben aktualisiert sich in Echtzeit.",
    it: "Gli Écus sono la moneta reale. Guadagnali con missioni, eventi e ricompense stagionali.\nSpendili nel negozio o nel regno.\nIl saldo si aggiorna in tempo reale.",
    pt: "Os Écus são a moeda real. Ganhe-os com missões, eventos e recompensas de temporada.\nGaste-os na loja ou no reino.\nSeu saldo atualiza em tempo real.",
    nl: "Écus zijn de koninklijke munt. Verdien ze via quests, events en seizoensbeloningen.\nBesteed ze in de winkel of het koninkrijk.\nJe saldo wordt live bijgewerkt.",
    ja: "Écus（エキュ）は王国の通貨です。残高はリアルタイムで更新されます。",
  },

  "legend.season.title": { fr: "Les Saisons — le cœur compétitif", en: "Seasons — competitive core", es: "Temporadas — núcleo competitivo", de: "Saisons — Wettbewerbskern", it: "Stagioni — cuore competitivo", pt: "Temporadas — núcleo competitivo", nl: "Seizoenen — competitief hart", ja: "シーズン — 競争の中心" },
  "legend.season.body": {
    fr: "Une saison est une période limitée (souvent plusieurs semaines) pendant laquelle tous les héros recomptent leurs exploits.\n\n• Saison XP : l'XP gagnée pendant la saison alimente le classement saisonnier (distinct de votre niveau permanent).\n• Lancement : quand une saison s'ouvre, une proclamation royale retentit sur tout le site — connectez-vous pour participer dès le début.\n• Récompenses : à la fin, les meilleurs du classement reçoivent Écus, titres et distinctions.\n• Pass Saisonnier : certains objets de la boutique débloquent des avantages pour la saison en cours.\n\nVotre niveau et votre inventaire restent — seul le classement saisonnier repart à zéro.",
    en: "A season is a limited period (often several weeks) when all heroes compete on a fresh leaderboard.\n\n• Season XP: XP earned during the season feeds the seasonal ranking (separate from your permanent level).\n• Launch: when a season opens, a royal proclamation sounds site-wide — log in early to compete.\n• Rewards: top players earn Écus, titles and honors at the end.\n• Season Pass: some shop items unlock perks for the current season.\n\nYour level and inventory persist — only the seasonal ranking resets.",
    es: "Una temporada es un periodo limitado en el que todos los héroes compiten en un ranking nuevo.\n\n• XP de temporada: distinto de tu nivel permanente.\n• Al abrir, suena una proclamación en todo el sitio.\n• Recompensas para los mejores al final.\n• Pase de temporada en la tienda.\n\nTu nivel e inventario permanecen — solo el ranking se reinicia.",
    de: "Eine Saison ist ein begrenzter Zeitraum, in dem alle Helden um ein frisches Ranking kämpfen.\n\n• Saison-XP: getrennt vom permanenten Level.\n• Beim Start ertönt eine königliche Proklamation.\n• Belohnungen für die Besten am Ende.\n• Saison-Pass in der Boutique.\n\nLevel und Inventar bleiben — nur das Saison-Ranking wird zurückgesetzt.",
    it: "Una stagione è un periodo limitato in cui tutti gli eroi competono su una classifica nuova.\n\n• XP stagionale: separata dal livello permanente.\n• All'apertura, una proclamazione reale su tutto il sito.\n• Ricompense per i migliori a fine stagione.\n• Pass stagionale nel negozio.\n\nLivello e inventario restano — solo la classifica si azzera.",
    pt: "Uma temporada é um período limitado em que todos competem num ranking novo.\n\n• XP da temporada: separado do nível permanente.\n• Na abertura, uma proclamação real em todo o site.\n• Recompensas para os melhores no final.\n• Passe sazonal na loja.\n\nNível e inventário permanecem — só o ranking reinicia.",
    nl: "Een seizoen is een beperkte periode waarin alle helden op een nieuw klassement strijden.\n\n• Seizoens-XP: los van je permanente level.\n• Bij opening klinkt een koninklijke proclamatie.\n• Beloningen voor de top aan het einde.\n• Seizoenspas in de winkel.\n\nLevel en inventaris blijven — alleen het seizoensklassement reset.",
    ja: "シーズンは限定期間の競争ランキングです。永久レベルとは別のシーズンXPがあります。",
  },

  "legend.quests.title": { fr: "Quêtes & Failles", en: "Quests & Rifts", es: "Misiones y fallas", de: "Quests & Risse", it: "Missioni e fenditure", pt: "Missões e fendas", nl: "Quests & rifts", ja: "クエストと裂け目" },
  "legend.quests.body": {
    fr: "Consultez l'Oracle des Quêtes pour des objectifs quotidiens et des récompenses XP/Écus.\nLes failles temporelles apparaissent aléatoirement sur le fil : double XP, coffres, événements surprise.",
    en: "Check the Quest Oracle for daily objectives and XP/Écus rewards.\nTemporal rifts appear randomly on the feed: double XP, chests, surprise events.",
    es: "Consulta el Oráculo de Misiones para objetivos diarios y recompensas.\nLas fallas temporales aparecen aleatoriamente en el feed.",
    de: "Besuche das Quest-Orakel für tägliche Ziele und Belohnungen.\nZeitrisse erscheinen zufällig im Feed.",
    it: "Consulta l'Oracolo delle Missioni per obiettivi giornalieri e ricompense.\nLe fenditure temporali appaiono casualmente nel feed.",
    pt: "Consulte o Oráculo de Missões para objetivos diários e recompensas.\nFendas temporais aparecem aleatoriamente no feed.",
    nl: "Bezoek het Quest-orakel voor dagelijkse doelen en beloningen.\nTijdrifts verschijnen willekeurig in de feed.",
    ja: "クエストオラクルで日々の目標と報酬を確認します。",
  },

  "legend.shop.title": { fr: "Boutique d'Écus", en: "Écus Shop", es: "Tienda de Écus", de: "Écus-Boutique", it: "Negozio di Écus", pt: "Loja de Écus", nl: "Écus-winkel", ja: "Écusショップ" },
  "legend.shop.body": {
    fr: "La boutique propose cosmétiques (cadres, bannières, auras), boosts temporaires, montures, titres et pass saisonniers.\nCertains articles nécessitent un niveau minimum. Les achats uniques sont définitifs.",
    en: "The shop offers cosmetics (frames, banners, auras), temporary boosts, mounts, titles and season passes.\nSome items require a minimum level. Unique purchases are permanent.",
    es: "La tienda ofrece cosméticos, boosts, monturas, títulos y pases de temporada.\nAlgunos artículos requieren nivel mínimo.",
    de: "Die Boutique bietet Kosmetik, Boosts, Reittiere, Titel und Saison-Pässe.\nEinige Artikel erfordern ein Mindestlevel.",
    it: "Il negozio offre cosmetici, boost, cavalcature, titoli e pass stagionali.\nAlcuni articoli richiedono un livello minimo.",
    pt: "A loja oferece cosméticos, boosts, montarias, títulos e passes sazonais.\nAlguns itens exigem nível mínimo.",
    nl: "De winkel biedt cosmetica, boosts, mounts, titels en seizoenspassen.\nSommige items vereisen een minimumlevel.",
    ja: "ショップでコスメやブーストなどを購入できます。",
  },

  "legend.ranks.title": { fr: "Les huit rangs", en: "The eight ranks", es: "Los ocho rangos", de: "Die acht Ränge", it: "Gli otto gradi", pt: "Os oito ranks", nl: "De acht rangen", ja: "八つのランク" },

  "notif.title": { fr: "Messagers", en: "Messengers", es: "Mensajeros", de: "Boten", it: "Messaggeri", pt: "Mensageiros", nl: "Boodschappers", ja: "メッセンジャー" },
  "notif.empty": { fr: "Aucun message", en: "No messages", es: "Sin mensajes", de: "Keine Nachrichten", it: "Nessun messaggio", pt: "Sem mensagens", nl: "Geen berichten", ja: "メッセージなし" },
  "notif.mark_all": { fr: "Tout marquer lu", en: "Mark all read", es: "Marcar todo leído", de: "Alle gelesen", it: "Segna tutto letto", pt: "Marcar tudo lido", nl: "Alles gelezen", ja: "すべて既読" },

  "banned.title": { fr: "Vous êtes banni du royaume", en: "You are banished", es: "Has sido desterrado", de: "Du bist verbannt", it: "Sei stato bandito", pt: "Você foi banido", nl: "Je bent verbannen", ja: "王国から追放されました" },
  "banned.until": { fr: "Jusqu'au", en: "Until", es: "Hasta", de: "Bis", it: "Fino a", pt: "Até", nl: "Tot", ja: "まで" },
  "banned.reason": { fr: "Raison", en: "Reason", es: "Razón", de: "Grund", it: "Motivo", pt: "Motivo", nl: "Reden", ja: "理由" },

  "admin.ban": { fr: "Bannir", en: "Ban", es: "Banear", de: "Bannen", it: "Bandire", pt: "Banir", nl: "Bannen", ja: "BAN" },
  "admin.unban": { fr: "Lever le ban", en: "Lift ban", es: "Levantar ban", de: "Bann aufheben", it: "Rimuovi ban", pt: "Remover ban", nl: "Ban opheffen", ja: "BAN解除" },
  "admin.ban_duration": { fr: "Durée (heures)", en: "Duration (hours)", es: "Duración (horas)", de: "Dauer (Stunden)", it: "Durata (ore)", pt: "Duração (horas)", nl: "Duur (uren)", ja: "期間（時間）" },
  "admin.ban_reason": { fr: "Raison", en: "Reason", es: "Razón", de: "Grund", it: "Motivo", pt: "Motivo", nl: "Reden", ja: "理由" },
  "admin.edit_user": { fr: "Modifier le héros", en: "Edit hero", es: "Editar héroe", de: "Held bearbeiten", it: "Modifica eroe", pt: "Editar herói", nl: "Held bewerken", ja: "ヒーロー編集" },
  "admin.maintenance_mode": { fr: "Mode Maintenance", en: "Maintenance Mode", es: "Modo Mantenimiento", de: "Wartungsmodus", it: "Manutenzione", pt: "Manutenção", nl: "Onderhoud", ja: "メンテナンス" },
  ...TRANSLATIONS,
  ...TRANSLATIONS_EXTENDED,
  ...TRANSLATIONS_UI,
};

const I18nContext = createContext(null);

function interpolate(text, vars = {}) {
  if (!text || typeof text !== "string") return text || "";
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)), text);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGS[stored] ? stored : "fr";
  });

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l) => {
    if (!LANGS[l]) return;
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
    window.dispatchEvent(new CustomEvent("nexoria:language-changed", { detail: { language: l } }));
    if (getToken()) {
      api.put("/profile", { language: l }).catch(() => {});
    }
  }, []);

  const syncFromUser = useCallback((user) => {
    if (user?.language && LANGS[user.language]) {
      localStorage.setItem(STORAGE_KEY, user.language);
      setLangState(user.language);
    }
  }, []);
  const t = useCallback((key, varsOrFallback) => {
    const entry = TR[key];
    let vars = {};
    let fallback = "";
    if (typeof varsOrFallback === "string") fallback = varsOrFallback;
    else if (varsOrFallback && typeof varsOrFallback === "object") vars = varsOrFallback;
    const raw = resolve(entry, lang) || fallback || key;
    return interpolate(raw, vars);
  }, [lang]);

  const fmtDate = useCallback((iso, opts = {}) => {
    if (!iso) return "—";
    const locale = LOCALE_MAP[lang] || "fr-FR";
    return new Date(iso).toLocaleString(locale, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...opts,
    });
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, locale: LOCALE_MAP[lang], setLang, syncFromUser, t, fmtDate, langs: LANGS }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};