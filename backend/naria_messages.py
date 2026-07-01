"""Messages Naria multilingues — backend (notifications, réponses API)."""
from __future__ import annotations

from naria_language import DEFAULT_LANG, normalize_lang

# Clés alignées avec frontend/src/i18n/naria/*.json et translations-naria.js
_MESSAGES: dict[str, dict[str, str]] = {
    "naria.title": {
        "fr": "Naria — Sentinelle",
        "en": "Naria — Sentinel",
        "es": "Naria — Centinela",
        "de": "Naria — Wächterin",
        "it": "Naria — Sentinella",
        "pt": "Naria — Sentinela",
        "nl": "Naria — Wachter",
        "ja": "Naria — 番人",
    },
    "naria.warning.respect": {
        "fr": "⚠️ Naria — Sentinelle du Nexus : ton message semble contraire aux règles de la communauté. Merci de rester respectueux.",
        "en": "⚠️ Naria — Sentinel of the Nexus: your message may violate the community rules. Please remain respectful.",
        "es": "⚠️ Naria — Centinela del Nexus: tu mensaje puede infringir las normas de la comunidad. Por favor, mantén el respeto.",
        "de": "⚠️ Naria — Wächterin des Nexus: deine Nachricht könnte gegen die Community-Regeln verstoßen. Bitte bleibe respektvoll.",
        "it": "⚠️ Naria — Sentinella del Nexus: il tuo messaggio potrebbe violare le regole della community. Ti invitiamo a mantenere il rispetto.",
        "pt": "⚠️ Naria — Sentinela do Nexus: sua mensagem pode violar as regras da comunidade. Por favor, mantenha o respeito.",
        "nl": "⚠️ Naria — Wachter van de Nexus: je bericht kan in strijd zijn met de communityregels. Blijf respectvol.",
        "ja": "⚠️ Naria — ネクサスの番人：あなたのメッセージはコミュニティルールに違反している可能性があります。敬意を持って交流してください。",
    },
    "naria.warning.spam": {
        "fr": "⚠️ Naria : ton message ressemble à du spam. Évite les répétitions et la publicité non sollicitée.",
        "en": "⚠️ Naria: your message looks like spam. Avoid repetition and unsolicited advertising.",
        "es": "⚠️ Naria: tu mensaje parece spam. Evita repeticiones y publicidad no solicitada.",
        "de": "⚠️ Naria: deine Nachricht wirkt wie Spam. Vermeide Wiederholungen und unerwünschte Werbung.",
        "it": "⚠️ Naria: il tuo messaggio sembra spam. Evita ripetizioni e pubblicità non richiesta.",
        "pt": "⚠️ Naria: sua mensagem parece spam. Evite repetições e publicidade não solicitada.",
        "nl": "⚠️ Naria: je bericht lijkt op spam. Vermijd herhaling en ongevraagde reclame.",
        "ja": "⚠️ Naria：メッセージがスパムの可能性があります。繰り返しや迷惑な宣伝は避けてください。",
    },
    "naria.warning.link": {
        "fr": "⚠️ Naria : lien suspect détecté. Ne partage que des liens sûrs et autorisés.",
        "en": "⚠️ Naria: suspicious link detected. Only share safe, allowed links.",
        "es": "⚠️ Naria: enlace sospechoso detectado. Comparte solo enlaces seguros.",
        "de": "⚠️ Naria: verdächtiger Link erkannt. Teile nur sichere, erlaubte Links.",
        "it": "⚠️ Naria: link sospetto rilevato. Condividi solo link sicuri.",
        "pt": "⚠️ Naria: link suspeito detectado. Compartilhe apenas links seguros.",
        "nl": "⚠️ Naria: verdachte link gedetecteerd. Deel alleen veilige links.",
        "ja": "⚠️ Naria：不審なリンクが検出されました。安全なリンクのみ共有してください。",
    },
    "naria.warning.caps": {
        "fr": "⚠️ Naria : abus de majuscules détecté. Merci d'écrire normalement.",
        "en": "⚠️ Naria: excessive capitals detected. Please write normally.",
        "es": "⚠️ Naria: abuso de mayúsculas detectado. Escribe con normalidad.",
        "de": "⚠️ Naria: übermäßige Großbuchstaben erkannt. Bitte normal schreiben.",
        "it": "⚠️ Naria: abuso di maiuscole rilevato. Scrivi normalmente.",
        "pt": "⚠️ Naria: abuso de maiúsculas detectado. Escreva normalmente.",
        "nl": "⚠️ Naria: overmatig hoofdlettergebruik. Schrijf normaal.",
        "ja": "⚠️ Naria：大文字の乱用が検出されました。通常の書き方でお願いします。",
    },
    "naria.warning.repeated": {
        "fr": "⚠️ Naria : message répété trop souvent. Patience entre chaque envoi.",
        "en": "⚠️ Naria: message repeated too often. Please wait between posts.",
        "es": "⚠️ Naria: mensaje repetido con demasiada frecuencia. Espera entre envíos.",
        "de": "⚠️ Naria: Nachricht zu oft wiederholt. Warte zwischen den Beiträgen.",
        "it": "⚠️ Naria: messaggio ripetuto troppo spesso. Attendi tra un invio e l'altro.",
        "pt": "⚠️ Naria: mensagem repetida com frequência. Aguarde entre envios.",
        "nl": "⚠️ Naria: bericht te vaak herhaald. Wacht tussen berichten.",
        "ja": "⚠️ Naria：同じメッセージの繰り返しが多すぎます。送信の間隔を空けてください。",
    },
    "naria.warning.harassment": {
        "fr": "⚠️ Naria : comportement agressif ou menaçant détecté. Le Nexus doit rester sûr pour tous.",
        "en": "⚠️ Naria: aggressive or threatening behavior detected. The Nexus must stay safe for everyone.",
        "es": "⚠️ Naria: comportamiento agresivo o amenazante detectado. El Nexus debe ser seguro para todos.",
        "de": "⚠️ Naria: aggressives oder bedrohliches Verhalten erkannt. Der Nexus muss für alle sicher bleiben.",
        "it": "⚠️ Naria: comportamento aggressivo o minaccioso rilevato. Il Nexus deve restare sicuro.",
        "pt": "⚠️ Naria: comportamento agressivo ou ameaçador detectado. O Nexus deve ser seguro para todos.",
        "nl": "⚠️ Naria: agressief of bedreigend gedrag gedetecteerd. De Nexus moet veilig blijven.",
        "ja": "⚠️ Naria：攻撃的または脅迫的な行為が検出されました。ネクサスはすべての人にとって安全でなければなりません。",
    },
    "naria.warning.offensive": {
        "fr": "⚠️ Naria : langage offensant détecté. Merci de respecter les autres joueurs.",
        "en": "⚠️ Naria: offensive language detected. Please respect other players.",
        "es": "⚠️ Naria: lenguaje ofensivo detectado. Respeta a los demás jugadores.",
        "de": "⚠️ Naria: beleidigende Sprache erkannt. Bitte respektiere andere Spieler.",
        "it": "⚠️ Naria: linguaggio offensivo rilevato. Rispetta gli altri giocatori.",
        "pt": "⚠️ Naria: linguagem ofensiva detectada. Respeite os outros jogadores.",
        "nl": "⚠️ Naria: beledigende taal gedetecteerd. Respecteer andere spelers.",
        "ja": "⚠️ Naria：攻撃的な言葉遣いが検出されました。他のプレイヤーを尊重してください。",
    },
    "naria.content.hidden": {
        "fr": "Message masqué par la modération.",
        "en": "Message hidden by moderation.",
        "es": "Mensaje oculto por moderación.",
        "de": "Nachricht durch Moderation ausgeblendet.",
        "it": "Messaggio nascosto dalla moderazione.",
        "pt": "Mensagem ocultada pela moderação.",
        "nl": "Bericht verborgen door moderatie.",
        "ja": "モデレーションにより非表示にされました。",
    },
    "naria.content.blocked": {
        "fr": "Ton message a été bloqué par Naria car il semble contraire aux règles du Nexus.",
        "en": "Your message was blocked by Naria because it may violate Nexus rules.",
        "es": "Tu mensaje fue bloqueado por Naria porque puede infringir las reglas del Nexus.",
        "de": "Deine Nachricht wurde von Naria blockiert, da sie gegen die Nexus-Regeln verstoßen könnte.",
        "it": "Il tuo messaggio è stato bloccato da Naria perché potrebbe violare le regole del Nexus.",
        "pt": "Sua mensagem foi bloqueada pela Naria porque pode violar as regras do Nexus.",
        "nl": "Je bericht is geblokkeerd door Naria omdat het mogelijk de Nexus-regels schendt.",
        "ja": "ネクサスのルールに違反する可能性があるため、Nariaがメッセージをブロックしました。",
    },
    "naria.content.hidden_notice": {
        "fr": "Ton message a été masqué par Naria car il semble contraire aux règles du Nexus.",
        "en": "Your message was hidden by Naria because it may violate Nexus rules.",
        "es": "Tu mensaje fue ocultado por Naria porque puede infringir las reglas del Nexus.",
        "de": "Deine Nachricht wurde von Naria ausgeblendet, da sie gegen die Nexus-Regeln verstoßen könnte.",
        "it": "Il tuo messaggio è stato nascosto da Naria perché potrebbe violare le regole del Nexus.",
        "pt": "Sua mensagem foi ocultada pela Naria porque pode violar as regras do Nexus.",
        "nl": "Je bericht is verborgen door Naria omdat het mogelijk de Nexus-regels schendt.",
        "ja": "ネクサスのルールに違反する可能性があるため、Nariaがメッセージを非表示にしました。",
    },
    "naria.restriction.temporary": {
        "fr": "Tu ne peux plus publier temporairement. Naria a détecté des infractions répétées. Temps restant : {minutes} min.",
        "en": "You cannot post temporarily. Naria detected repeated violations. Time remaining: {minutes} min.",
        "es": "No puedes publicar temporalmente. Naria detectó infracciones repetidas. Tiempo restante: {minutes} min.",
        "de": "Du kannst vorübergehend nicht posten. Naria hat wiederholte Verstöße erkannt. Verbleibend: {minutes} Min.",
        "it": "Non puoi pubblicare temporaneamente. Naria ha rilevato infrazioni ripetute. Tempo rimanente: {minutes} min.",
        "pt": "Você não pode publicar temporariamente. Naria detectou infrações repetidas. Tempo restante: {minutes} min.",
        "nl": "Je kunt tijdelijk niet posten. Naria detecteerde herhaalde overtredingen. Resterend: {minutes} min.",
        "ja": "一時的に投稿できません。Nariaが繰り返しの違反を検出しました。残り：{minutes}分。",
    },
    "naria.restriction.hour": {
        "fr": "Tu ne peux plus publier temporairement (1 h). L'équipe a été alertée.",
        "en": "You cannot post temporarily (1 h). The team has been alerted.",
        "es": "No puedes publicar temporalmente (1 h). El equipo ha sido alertado.",
        "de": "Du kannst vorübergehend nicht posten (1 h). Das Team wurde benachrichtigt.",
        "it": "Non puoi pubblicare temporaneamente (1 h). Il team è stato avvisato.",
        "pt": "Você não pode publicar temporariamente (1 h). A equipe foi alertada.",
        "nl": "Je kunt tijdelijk niet posten (1 u). Het team is gewaarschuwd.",
        "ja": "一時的に投稿できません（1時間）。チームに通知されました。",
    },
    "naria.ban.notice": {
        "fr": "Comportement grave détecté. Naria a signalé ton compte à l'équipe.",
        "en": "Serious behavior detected. Naria has reported your account to the team.",
        "es": "Comportamiento grave detectado. Naria ha reportado tu cuenta al equipo.",
        "de": "Schwerwiegendes Verhalten erkannt. Naria hat dein Konto dem Team gemeldet.",
        "it": "Comportamento grave rilevato. Naria ha segnalato il tuo account al team.",
        "pt": "Comportamento grave detectado. Naria reportou sua conta à equipe.",
        "nl": "Ernstig gedrag gedetecteerd. Naria heeft je account gemeld aan het team.",
        "ja": "重大な行為が検出されました。Nariaがあなたのアカウントをチームに報告しました。",
    },
}

_RULE_TO_MESSAGE_KEY = {
    "spam_light": "naria.warning.spam",
    "duplicate": "naria.warning.repeated",
    "caps_abuse": "naria.warning.caps",
    "suspicious_link": "naria.warning.link",
    "external_discord": "naria.warning.link",
    "bad_word": "naria.warning.offensive",
    "insult": "naria.warning.offensive",
    "filter_evasion": "naria.warning.offensive",
    "hate_threat": "naria.warning.harassment",
    "harassment": "naria.warning.harassment",
    "excessive_length": "naria.warning.spam",
    "excessive_emoji": "naria.warning.spam",
}


def get_message(key: str, lang: str, **params) -> str:
    lang = normalize_lang(lang)
    bucket = _MESSAGES.get(key) or _MESSAGES["naria.warning.respect"]
    text = bucket.get(lang) or bucket.get("en") or bucket.get("fr") or key
    for k, v in params.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def message_key_for_rule(rule: str) -> str:
    return _RULE_TO_MESSAGE_KEY.get(rule, "naria.warning.respect")


def pick_user_message(hits: list, lang: str, *, restrict_minutes: int = 0, hide: bool = False, block: bool = False) -> tuple[str, str]:
    """Retourne (message_key, message_traduit)."""
    if block:
        key = "naria.content.blocked"
        return key, get_message(key, lang)
    if hide:
        key = "naria.content.hidden_notice"
        return key, get_message(key, lang)
    if restrict_minutes >= 60:
        key = "naria.restriction.hour"
        return key, get_message(key, lang)
    if restrict_minutes > 0:
        key = "naria.restriction.temporary"
        return key, get_message(key, lang, minutes=restrict_minutes)

    primary_rule = hits[0].rule if hits else "default"
    key = message_key_for_rule(primary_rule)
    return key, get_message(key, lang)


def hidden_placeholder(lang: str) -> str:
    return get_message("naria.content.hidden", lang)
