// i18n minimaliste — Context React, 5 langues (FR/EN/ES/DE/IT)
// Pas de dépendance lourde, tout est dans ce module.
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { getToken } from "@/lib/api";

const LANGS = {
  fr: { code: "fr", label: "Français", flag: "🇫🇷" },
  en: { code: "en", label: "English",  flag: "🇬🇧" },
  es: { code: "es", label: "Español",  flag: "🇪🇸" },
  de: { code: "de", label: "Deutsch",  flag: "🇩🇪" },
  it: { code: "it", label: "Italiano", flag: "🇮🇹" },
};

const TR = {
  // Navigation
  "nav.feed":        { fr: "Place Publique", en: "Public Square", es: "Plaza Pública", de: "Marktplatz", it: "Piazza Pubblica" },
  "nav.hero":        { fr: "Mon Héros", en: "My Hero", es: "Mi Héroe", de: "Mein Held", it: "Mio Eroe" },
  "nav.skills":      { fr: "Constellation", en: "Constellation", es: "Constelación", de: "Konstellation", it: "Costellazione" },
  "nav.kingdom":     { fr: "Royaume", en: "Kingdom", es: "Reino", de: "Königreich", it: "Regno" },
  "nav.inventory":   { fr: "Reliques", en: "Relics", es: "Reliquias", de: "Reliquien", it: "Reliquie" },
  "nav.quests":      { fr: "Tableau de Chasse", en: "Hunting Board", es: "Tabla de Caza", de: "Jagdtafel", it: "Tabella di Caccia" },
  "nav.oracle":      { fr: "Sanctuaire", en: "Sanctuary", es: "Santuario", de: "Heiligtum", it: "Santuario" },
  "nav.leaderboards":{ fr: "Hall des Légendes", en: "Hall of Legends", es: "Salón de Leyendas", de: "Halle der Legenden", it: "Hall of Legends" },
  "nav.legends":     { fr: "Panthéon", en: "Pantheon", es: "Panteón", de: "Pantheon", it: "Pantheon" },
  "nav.shop":        { fr: "Boutique d'Aether", en: "Aether Shop", es: "Tienda de Éter", de: "Aether-Shop", it: "Bottega d'Etere" },
  "nav.world":       { fr: "Carte du Monde", en: "World Map", es: "Mapa del Mundo", de: "Weltkarte", it: "Mappa del Mondo" },
  "nav.nexus":       { fr: "Nexus Online", en: "Nexus Online", es: "Nexus Online", de: "Nexus Online", it: "Nexus Online" },
  "nav.guilds":      { fr: "Ordres", en: "Guilds", es: "Órdenes", de: "Orden", it: "Ordini" },
  "nav.forum":       { fr: "Tribune", en: "Forum", es: "Foro", de: "Forum", it: "Forum" },
  "nav.friends":     { fr: "Compagnons", en: "Friends", es: "Compañeros", de: "Gefährten", it: "Compagni" },
  "nav.tickets":     { fr: "Missives", en: "Tickets", es: "Misivas", de: "Anliegen", it: "Missive" },
  "nav.settings":    { fr: "Paramètres", en: "Settings", es: "Ajustes", de: "Einstellungen", it: "Impostazioni" },
  "nav.admin":       { fr: "Conseil", en: "Council", es: "Consejo", de: "Rat", it: "Consiglio" },

  // Common
  "common.logout":   { fr: "Quitter le royaume", en: "Leave the realm", es: "Abandonar el reino", de: "Königreich verlassen", it: "Lascia il regno" },
  "common.save":     { fr: "Enregistrer", en: "Save", es: "Guardar", de: "Speichern", it: "Salva" },
  "common.cancel":   { fr: "Annuler", en: "Cancel", es: "Cancelar", de: "Abbrechen", it: "Annulla" },
  "common.confirm":  { fr: "Confirmer", en: "Confirm", es: "Confirmar", de: "Bestätigen", it: "Conferma" },
  "common.delete":   { fr: "Supprimer", en: "Delete", es: "Eliminar", de: "Löschen", it: "Elimina" },
  "common.edit":     { fr: "Modifier", en: "Edit", es: "Editar", de: "Bearbeiten", it: "Modifica" },
  "common.close":    { fr: "Fermer", en: "Close", es: "Cerrar", de: "Schließen", it: "Chiudi" },
  "common.loading":  { fr: "Chargement...", en: "Loading...", es: "Cargando...", de: "Lädt...", it: "Caricamento..." },
  "common.aether":   { fr: "Aether", en: "Aether", es: "Éter", de: "Aether", it: "Etere" },
  "common.level":    { fr: "Niveau", en: "Level", es: "Nivel", de: "Stufe", it: "Livello" },
  "common.xp":       { fr: "XP", en: "XP", es: "EXP", de: "EP", it: "EXP" },

  // Login / Register
  "auth.login":      { fr: "Connexion", en: "Login", es: "Iniciar sesión", de: "Anmelden", it: "Accedi" },
  "auth.register":   { fr: "Forger mon Héros", en: "Forge my Hero", es: "Forjar mi Héroe", de: "Helden schmieden", it: "Forgia il mio Eroe" },
  "auth.email":      { fr: "Email", en: "Email", es: "Correo", de: "E-Mail", it: "Email" },
  "auth.password":   { fr: "Mot de passe", en: "Password", es: "Contraseña", de: "Passwort", it: "Password" },
  "auth.username":   { fr: "Pseudo de héros", en: "Hero name", es: "Nombre de héroe", de: "Heldenname", it: "Nome eroe" },
  "auth.continue_google": { fr: "Continuer avec Google", en: "Continue with Google", es: "Continuar con Google", de: "Mit Google fortfahren", it: "Continua con Google" },
  "auth.continue_discord":{ fr: "Continuer avec Discord", en: "Continue with Discord", es: "Continuar con Discord", de: "Mit Discord fortfahren", it: "Continua con Discord" },

  // Shop
  "shop.title":      { fr: "Boutique d'Aether", en: "Aether Shop", es: "Tienda de Éter", de: "Aether-Bazar", it: "Bottega d'Etere" },
  "shop.subtitle":   { fr: "Échangez votre Aether contre des trésors", en: "Trade your Aether for treasures", es: "Cambia tu Éter por tesoros", de: "Tausche Aether gegen Schätze", it: "Scambia il tuo Etere per tesori" },
  "shop.buy":        { fr: "Acquérir", en: "Acquire", es: "Adquirir", de: "Erwerben", it: "Acquisire" },
  "shop.insufficient":{fr: "Aether insuffisant", en: "Not enough Aether", es: "Éter insuficiente", de: "Nicht genug Aether", it: "Etere insufficiente" },
  "shop.cat.cosmetic":{fr: "Cosmétiques", en: "Cosmetics", es: "Cosméticos", de: "Kosmetik", it: "Cosmetici" },
  "shop.cat.boost":   {fr: "Élixirs", en: "Elixirs", es: "Elixires", de: "Elixiere", it: "Elisir" },
  "shop.cat.consumable":{fr: "Consommables", en: "Consumables", es: "Consumibles", de: "Verbrauchsgüter", it: "Consumabili" },
  "shop.cat.kingdom":   {fr: "Royaume", en: "Kingdom", es: "Reino", de: "Königreich", it: "Regno" },

  // Settings
  "settings.title":     { fr: "Paramètres du Héros", en: "Hero Settings", es: "Ajustes del Héroe", de: "Helden-Einstellungen", it: "Impostazioni Eroe" },
  "settings.profile":   { fr: "Profil", en: "Profile", es: "Perfil", de: "Profil", it: "Profilo" },
  "settings.account":   { fr: "Compte", en: "Account", es: "Cuenta", de: "Konto", it: "Account" },
  "settings.security":  { fr: "Sécurité", en: "Security", es: "Seguridad", de: "Sicherheit", it: "Sicurezza" },
  "settings.preferences":{fr: "Préférences", en: "Preferences", es: "Preferencias", de: "Einstellungen", it: "Preferenze" },
  "settings.danger":    { fr: "Zone Dangereuse", en: "Danger Zone", es: "Zona Peligrosa", de: "Gefahrenzone", it: "Zona Pericolosa" },
  "settings.bio":       { fr: "Biographie", en: "Bio", es: "Biografía", de: "Bio", it: "Biografia" },
  "settings.quote":     { fr: "Citation", en: "Quote", es: "Cita", de: "Zitat", it: "Citazione" },
  "settings.story":     { fr: "Histoire du personnage", en: "Character story", es: "Historia del personaje", de: "Charaktergeschichte", it: "Storia del personaggio" },
  "settings.language":  { fr: "Langue", en: "Language", es: "Idioma", de: "Sprache", it: "Lingua" },
  "settings.sound":     { fr: "Effets sonores", en: "Sound effects", es: "Efectos de sonido", de: "Soundeffekte", it: "Effetti sonori" },
  "settings.change_password": { fr: "Changer le mot de passe", en: "Change password", es: "Cambiar contraseña", de: "Passwort ändern", it: "Cambia password" },
  "settings.current_password":{ fr: "Mot de passe actuel", en: "Current password", es: "Contraseña actual", de: "Aktuelles Passwort", it: "Password attuale" },
  "settings.new_password":    { fr: "Nouveau mot de passe", en: "New password", es: "Nueva contraseña", de: "Neues Passwort", it: "Nuova password" },
  "settings.delete_account":  { fr: "Supprimer mon compte", en: "Delete my account", es: "Eliminar mi cuenta", de: "Konto löschen", it: "Elimina account" },
  "settings.delete_warning":  { fr: "Cette action est irréversible. Toutes vos données seront effacées.", en: "This is irreversible. All your data will be erased.", es: "Esto es irreversible. Todos tus datos serán eliminados.", de: "Dies ist unumkehrbar. Alle Daten werden gelöscht.", it: "Azione irreversibile. Tutti i tuoi dati saranno cancellati." },

  // Notifications
  "notif.title":     { fr: "Messagers", en: "Messengers", es: "Mensajeros", de: "Boten", it: "Messaggeri" },
  "notif.empty":     { fr: "Aucun message du royaume", en: "No messages from the realm", es: "Sin mensajes del reino", de: "Keine Nachrichten", it: "Nessun messaggio dal regno" },
  "notif.mark_all":  { fr: "Tout marquer lu", en: "Mark all read", es: "Marcar todo leído", de: "Alle gelesen", it: "Segna tutto come letto" },

  // Maintenance
  "maintenance.title":   { fr: "Royaume en Maintenance", en: "Realm under Maintenance", es: "Reino en Mantenimiento", de: "Königreich in Wartung", it: "Regno in Manutenzione" },
  "maintenance.subtitle":{ fr: "Les forgerons sont à l'œuvre. Revenez bientôt.", en: "Smiths are at work. Come back soon.", es: "Los herreros están trabajando. Vuelve pronto.", de: "Die Schmiede sind am Werk. Bald zurück.", it: "I fabbri sono al lavoro. Torna presto." },
  "maintenance.staff":   { fr: "Accès Staff", en: "Staff Access", es: "Acceso Staff", de: "Staff-Zugang", it: "Accesso Staff" },

  // Banned
  "banned.title":    { fr: "Vous êtes banni du royaume", en: "You are banished from the realm", es: "Has sido desterrado del reino", de: "Aus dem Königreich verbannt", it: "Sei stato bandito dal regno" },
  "banned.until":    { fr: "Jusqu'au", en: "Until", es: "Hasta", de: "Bis", it: "Fino a" },
  "banned.reason":   { fr: "Raison", en: "Reason", es: "Razón", de: "Grund", it: "Motivo" },

  // Admin
  "admin.ban":       { fr: "Bannir", en: "Ban", es: "Banear", de: "Bannen", it: "Bandire" },
  "admin.unban":     { fr: "Lever le ban", en: "Lift ban", es: "Levantar ban", de: "Bann aufheben", it: "Rimuovi ban" },
  "admin.ban_duration":{ fr: "Durée du bannissement (heures)", en: "Ban duration (hours)", es: "Duración del baneo (horas)", de: "Banndauer (Stunden)", it: "Durata ban (ore)" },
  "admin.ban_reason":  { fr: "Raison", en: "Reason", es: "Razón", de: "Grund", it: "Motivo" },
  "admin.edit_user":   { fr: "Modifier le héros", en: "Edit hero", es: "Editar héroe", de: "Held bearbeiten", it: "Modifica eroe" },
  "admin.maintenance_mode": { fr: "Mode Maintenance", en: "Maintenance Mode", es: "Modo Mantenimiento", de: "Wartungsmodus", it: "Modalità Manutenzione" },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("nexoria_lang") || "fr");

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l) => {
    if (LANGS[l]) {
      localStorage.setItem("nexoria_lang", l);
      setLangState(l);
      // Persist language to backend so the Polyglot badge can trigger.
      if (getToken()) {
        api.put("/profile", { language: l }).catch(() => {});
      }
    }
  }, []);

  const t = useCallback((key, fallback = "") => {
    const entry = TR[key];
    if (!entry) return fallback || key;
    return entry[lang] || entry.fr || fallback || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, langs: LANGS }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
