/** Resolve in-app notification title/message from kind + params (client i18n). */

import {
  applyI18nPlaceholders,
  hasVisiblePlaceholders,
  sanitizeI18nVars,
} from "./i18n-safe";

const KIND_KEY_MAP = {
  referral: (p) => {
    const v = p.variant || "reward";
    return `notif.referral.${v}`;
  },
  vip: (p) => `notif.vip.${p.variant || "daily"}`,
  season_reward: (p) => `notif.season_reward.${p.variant || "rank"}`,
};

/** VIP daily chest bonus — must match backend VIP_DAILY_BONUS_AETHER. */
const VIP_DAILY_BONUS_AETHER = 100;

/** Message body is the whole param value (legacy rows stored French text directly). */
const MESSAGE_IS_PARAM = {
  badge: "description",
  referral: "label",
  craft_milestone: "label",
  community_challenge: "reward",
  forum_reply: "threadTitle",
  friend_message: "preview",
  ticket_reply: "preview",
  season_start: "description",
  aether_grant: "reason",
};

function normalizeParams(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { ...parsed } : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  return {};
}

function normalizeParamAliases(params) {
  const out = { ...params };
  if (out.itemName == null && out.item != null) out.itemName = out.item;
  if (out.itemName == null && out.item_name != null) out.itemName = out.item_name;
  if (out.name == null && out.badgeName != null) out.name = out.badgeName;
  if (out.description == null && out.desc != null) out.description = out.desc;
  if (out.threadTitle == null && out.thread_title != null) out.threadTitle = out.thread_title;
  if (out.statusLabel == null && out.status_label != null) out.statusLabel = out.status_label;
  return out;
}

function isPlainLegacyText(text) {
  return Boolean(text && typeof text === "string" && !hasVisiblePlaceholders(text));
}

function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m;
  }
  return null;
}

/** Pull interpolation values from persisted French/English fallback text. */
export function extractLegacyNotificationParams(notif) {
  const title = String(notif?.title || "");
  const message = String(notif?.message || "");
  const text = `${message}\n${title}`;
  const kind = notif?.kind || "";
  const out = {};

  const badgeTitle = firstMatch(title, [
    /^Badge débloqué\s*:\s*(.+)$/i,
    /^Badge unlocked:\s*(.+)$/i,
    /^Insignia desbloqueada:\s*(.+)$/i,
    /^Abzeichen freigeschaltet:\s*(.+)$/i,
  ]);
  if (badgeTitle) out.name = badgeTitle[1].trim();

  if (kind === "badge" && isPlainLegacyText(message)) {
    out.description = message.trim();
  }

  const shopItem = firstMatch(message, [
    /^«\s*(.+?)\s*»\s*(?:est à vous|is yours|es tuyo|gehört dir|è tuo|é teu|is van jou)/i,
    /^"\s*(.+?)\s*"\s*(?:est à vous|is yours)/i,
  ]);
  if (shopItem) out.itemName = shopItem[1].trim();

  const challengeTitle = firstMatch(title, [
    /^🏆\s*Défi accompli\s*:\s*(.+)$/i,
    /^🏆\s*Challenge completed:\s*(.+)$/i,
  ]);
  if (challengeTitle) out.name = challengeTitle[1].trim();

  const guildInviteTitle = firstMatch(title, [
    /^L'ordre\s*«\s*(.+?)\s*»\s*vous invite/i,
    /^Order\s*«\s*(.+?)\s*»\s*invites you/i,
  ]);
  if (guildInviteTitle) out.name = guildInviteTitle[1].trim();

  const guildInviteTag = firstMatch(message, [/^Tag\s*\[([^\]]+)\]/i]);
  if (guildInviteTag) out.tag = guildInviteTag[1].trim();

  const guildRewardTitle = firstMatch(title, [
    /^Récompense de l'ordre\s*«\s*(.+?)\s*»/i,
    /^Reward from order\s*«\s*(.+?)\s*»/i,
  ]);
  if (guildRewardTitle) out.name = guildRewardTitle[1].trim();

  const seasonTitle = firstMatch(title, [
    /^Saison\s*«\s*(.+?)\s*»\s*ouverte/i,
    /^Season\s*«\s*(.+?)\s*»\s*is open/i,
  ]);
  if (seasonTitle) out.name = seasonTitle[1].trim();

  const seasonRankTitle = firstMatch(title, [
    /^Récompense saison\s*#(\d+)/i,
    /^Season reward\s*#(\d+)/i,
  ]);
  if (seasonRankTitle) out.rank = parseInt(seasonRankTitle[1], 10);

  const forumReply = firstMatch(title, [
    /^(.+?)\s+a répondu à votre sujet/i,
    /^(.+?)\s+replied to your topic/i,
  ]);
  if (forumReply) out.username = forumReply[1].trim();

  const ecusReceived = firstMatch(title, [
    /^💰\s*(.+?)\s+vous a envoyé\s+(\d[\d\s,.]*)\s*[ÉE]cus/i,
    /^💰\s*(.+?)\s+sent you\s+(\d[\d\s,.]*)\s*[ÉE]cus/i,
  ]);
  if (ecusReceived) {
    out.username = ecusReceived[1].trim();
    out.amount = parseInt(ecusReceived[2].replace(/[\s,.]/g, ""), 10);
  }

  const itemReceived = firstMatch(title, [
    /^🎁\s*(.+?)\s+vous a offert\s+(.+)$/i,
    /^🎁\s*(.+?)\s+gifted you\s+(.+)$/i,
  ]);
  if (itemReceived) {
    out.username = itemReceived[1].trim();
    out.name = itemReceived[2].trim();
  }

  const itemReceivedQty = firstMatch(message, [
    /^x(\d+)\s+(.+?)\s*—/i,
  ]);
  if (itemReceivedQty) {
    out.quantity = parseInt(itemReceivedQty[1], 10);
    if (!out.name) out.name = itemReceivedQty[2].trim();
  }

  const tradeUser = firstMatch(title, [
    /^🤝\s*(.+?)\s+vous propose un échange/i,
    /^✅\s*(.+?)\s+a accepté votre échange/i,
    /^❌\s*(.+?)\s+a refusé votre échange/i,
    /^⌛\s*Votre échange avec\s*(.+?)\s+a expiré/i,
    /^🤝\s*(.+?)\s+proposes a trade/i,
    /^✅\s*(.+?)\s+accepted your trade/i,
    /^❌\s*(.+?)\s+declined your trade/i,
    /^⌛\s*Your trade with\s*(.+?)\s+expired/i,
  ]);
  if (tradeUser) out.username = tradeUser[1].trim();

  const friendUser = firstMatch(title, [
    /^(.+?)\s+souhaite vous lier/i,
    /^(.+?)\s+a accepté votre demande/i,
    /^Message de\s+(.+)$/i,
    /^(.+?)\s+wants to connect/i,
    /^(.+?)\s+accepted your request/i,
    /^Message from\s+(.+)$/i,
  ]);
  if (friendUser) out.username = friendUser[1].trim();

  const ticketTitle = firstMatch(title, [
    /^Le Conseil a répondu à\s*«\s*(.+?)\s*»/i,
    /^The Council replied to\s*«\s*(.+?)\s*»/i,
    /^Doléance\s*«\s*(.+?)\s*»\s*→/i,
    /^Ticket\s*«\s*(.+?)\s*»\s*→/i,
  ]);
  if (ticketTitle) out.subject = ticketTitle[1].trim();

  const vipUntil = firstMatch(message, [
    /jusqu'au\s+(\d{2}\/\d{2}\/\d{4})/i,
    /until\s+(\d{2}\/\d{2}\/\d{4})/i,
  ]);
  if (vipUntil) out.until = vipUntil[1];

  const councilItem = firstMatch(message, [
    /^Vous recevez\s*:\s*(.+?)\s+(.+?)\s*\((.+?)\)\.?$/i,
    /^You receive:\s*(.+?)\s+(.+?)\s*\((.+?)\)\.?$/i,
  ]);
  if (councilItem) {
    out.icon = councilItem[1].trim();
    out.name = councilItem[2].trim();
    out.rarity = councilItem[3].trim();
  }

  const amountMatch = text.match(/\+\s*(\d[\d\s,.]*)\s*(?:[ée]?cus|Écus|aether)/i);
  if (amountMatch) {
    out.amount = parseInt(amountMatch[1].replace(/[\s,.]/g, ""), 10);
  }

  const ecusPurchase = firstMatch(message, [
    /^\+(\d[\d\s,.]*)\s*[ÉE]cus crédités/i,
    /^\+(\d[\d\s,.]*)\s*[ÉE]cus credited/i,
  ]);
  if (ecusPurchase) {
    out.ecus = parseInt(ecusPurchase[1].replace(/[\s,.]/g, ""), 10);
  }

  const xpMatch = text.match(/\+\s*(\d[\d\s,.]*)\s*XP\b/i);
  if (xpMatch) {
    out.xp = parseInt(xpMatch[1].replace(/[\s,.]/g, ""), 10);
  }

  const seqMatch = text.match(/(?:n[°º.]?\s*|#\s*)(\d+)/i);
  if (seqMatch && /premiers|first|primeros|ersten|primi|primeiros|eerste|最初/i.test(text)) {
    out.seq = parseInt(seqMatch[1], 10);
  }

  const maxMatch = text.match(/(\d+)\s*premiers|first\s*(\d+)|primeros\s*(\d+)/i);
  if (maxMatch) {
    out.max = parseInt(maxMatch[1] || maxMatch[2] || maxMatch[3], 10);
  }

  const signMatch = text.match(/^([+-])\s*(\d[\d\s,.]*)\s*(?:[ée]?cus|Écus)/i);
  if (signMatch) {
    out.sign = signMatch[1];
    if (out.amount == null) {
      out.amount = parseInt(signMatch[2].replace(/[\s,.]/g, ""), 10);
    }
  }

  const paramKey = MESSAGE_IS_PARAM[kind];
  if (paramKey && isPlainLegacyText(message) && out[paramKey] == null) {
    out[paramKey] = message.trim();
  }

  if (kind === "referral" && isPlainLegacyText(title) && out.label == null) {
    const referralTitle = firstMatch(title, [
      /^Récompense de parrainage$/i,
      /^Titre débloqué$/i,
      /^Parrain Légendaire\s*!$/i,
    ]);
    if (!referralTitle && title.trim()) {
      out.label = title.trim();
    }
  }

  if (kind === "craft_milestone" && isPlainLegacyText(title) && out.label == null) {
    out.label = title.replace(/^Palier Forge débloqué\s*/i, "").trim() || title.trim();
  }

  return out;
}

export function enrichNotificationParams(notif, params) {
  let out = normalizeParamAliases({ ...params });
  const legacy = extractLegacyNotificationParams(notif);

  for (const [key, value] of Object.entries(legacy)) {
    if (value == null || value === "") continue;
    if (out[key] == null || out[key] === "") out[key] = value;
  }

  if (notif?.kind === "vip" && (out.variant || "daily") === "daily" && out.amount == null) {
    out.amount = VIP_DAILY_BONUS_AETHER;
  }

  if (notif?.kind === "aether_grant" && !out.sign && out.amount != null) {
    out.sign = out.amount >= 0 ? "+" : "";
  }

  return out;
}

function resolveKeyPrefix(notif) {
  const kind = notif?.kind || "";
  const params = notif?.params || {};
  const mapper = KIND_KEY_MAP[kind];
  if (mapper) return mapper(params);
  if (kind === "broadcast") return "notif.broadcast";
  if (kind) return `notif.${kind}`;
  return null;
}

function applyNotificationPlaceholders(text, params) {
  if (!text) return "";
  return applyI18nPlaceholders(text, sanitizeI18nVars(params));
}

function resolveWithLegacyFallback(notif, resolved) {
  const legacyTitle = notif?.title || "";
  const legacyMessage = notif?.message || "";
  return {
    title: hasVisiblePlaceholders(resolved.title) && isPlainLegacyText(legacyTitle)
      ? legacyTitle
      : resolved.title,
    message: hasVisiblePlaceholders(resolved.message) && isPlainLegacyText(legacyMessage)
      ? legacyMessage
      : resolved.message,
  };
}

function tryTranslate(t, key, params) {
  if (!key) return null;
  const titleKey = `${key}.title`;
  const messageKey = `${key}.message`;
  const title = t(titleKey, params);
  if (!title || title === titleKey) return null;
  const message = t(messageKey, params);
  return {
    title: applyNotificationPlaceholders(title, params),
    message: applyNotificationPlaceholders(
      message && message !== messageKey ? message : "",
      params,
    ),
  };
}

export function translateNotification(notif, t) {
  if (!notif) return { title: "", message: "" };

  const params = enrichNotificationParams(notif, normalizeParams(notif.params));

  if (notif.kind === "ticket_status" && params.status) {
    params.statusLabel = t(`tickets.status.${params.status}`, params.status);
  }
  if (notif.kind === "aether_grant" && !params.reason) {
    params.reason = t("notif.aether_grant.default_reason");
  }
  if (notif.kind === "season_reward" && params.variant === "rank") {
    params.passSuffix = params.passBonus ? t("notif.season_reward.pass_suffix") : "";
  }

  if (notif.kind === "broadcast") {
    return {
      title: params.title || notif.title || "",
      message: params.message || notif.message || "",
    };
  }

  const prefix = resolveKeyPrefix(notif);
  const resolved = tryTranslate(t, prefix, params);
  if (resolved) return resolveWithLegacyFallback(notif, resolved);

  return {
    title: notif.title || "",
    message: notif.message || "",
  };
}
