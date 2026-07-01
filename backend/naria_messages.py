"""Messages Sentinelles multilingues — backend (notifications, réponses API)."""
from __future__ import annotations

from naria_language import DEFAULT_LANG, normalize_lang
from naria_system import NARIA_USERNAME

# Clés alignées avec frontend/src/i18n/naria/*.json et translations-naria.js
_MESSAGES: dict[str, dict[str, str]] = {
    "naria.title": {
        "fr": "{actor} — Sentinelle",
        "en": "{actor} — Sentinel",
        "es": "{actor} — Centinela",
        "de": "{actor} — Wächter",
        "it": "{actor} — Sentinella",
        "pt": "{actor} — Sentinela",
        "nl": "{actor} — Wachter",
        "ja": "{actor} — 番人",
    },
    "naria.warning.respect": {
        "fr": "⚠️ {actor} — Sentinelle du Nexus : ton message semble contraire aux règles de la communauté. Merci de rester respectueux.",
        "en": "⚠️ {actor} — Sentinel of the Nexus: your message may violate the community rules. Please remain respectful.",
        "es": "⚠️ {actor} — Centinela del Nexus: tu mensaje puede infringir las normas de la comunidad. Por favor, mantén el respeto.",
        "de": "⚠️ {actor} — Wächterin des Nexus: deine Nachricht könnte gegen die Community-Regeln verstoßen. Bitte bleibe respektvoll.",
        "it": "⚠️ {actor} — Sentinella del Nexus: il tuo messaggio potrebbe violare le regole della community. Ti invitiamo a mantenere il rispetto.",
        "pt": "⚠️ {actor} — Sentinela do Nexus: sua mensagem pode violar as regras da comunidade. Por favor, mantenha o respeito.",
        "nl": "⚠️ {actor} — Wachter van de Nexus: je bericht kan in strijd zijn met de communityregels. Blijf respectvol.",
        "ja": "⚠️ {actor} — ネクサスの番人：あなたのメッセージはコミュニティルールに違反している可能性があります。敬意を持って交流してください。",
    },
    "naria.warning.spam": {
        "fr": "⚠️ {actor} : ton message ressemble à du spam. Évite les répétitions et la publicité non sollicitée.",
        "en": "⚠️ {actor}: your message looks like spam. Avoid repetition and unsolicited advertising.",
        "es": "⚠️ {actor}: tu mensaje parece spam. Evita repeticiones y publicidad no solicitada.",
        "de": "⚠️ {actor}: deine Nachricht wirkt wie Spam. Vermeide Wiederholungen und unerwünschte Werbung.",
        "it": "⚠️ {actor}: il tuo messaggio sembra spam. Evita ripetizioni e pubblicità non richiesta.",
        "pt": "⚠️ {actor}: sua mensagem parece spam. Evite repetições e publicidade não solicitada.",
        "nl": "⚠️ {actor}: je bericht lijkt op spam. Vermijd herhaling en ongevraagde reclame.",
        "ja": "⚠️ {actor}：メッセージがスパムの可能性があります。繰り返しや迷惑な宣伝は避けてください。",
    },
    "naria.warning.link": {
        "fr": "⚠️ {actor} : lien suspect détecté. Ne partage que des liens sûrs et autorisés.",
        "en": "⚠️ {actor}: suspicious link detected. Only share safe, allowed links.",
        "es": "⚠️ {actor}: enlace sospechoso detectado. Comparte solo enlaces seguros.",
        "de": "⚠️ {actor}: verdächtiger Link erkannt. Teile nur sichere, erlaubte Links.",
        "it": "⚠️ {actor}: link sospetto rilevato. Condividi solo link sicuri.",
        "pt": "⚠️ {actor}: link suspeito detectado. Compartilhe apenas links seguros.",
        "nl": "⚠️ {actor}: verdachte link gedetecteerd. Deel alleen veilige links.",
        "ja": "⚠️ {actor}：不審なリンクが検出されました。安全なリンクのみ共有してください。",
    },
    "naria.warning.caps": {
        "fr": "⚠️ {actor} : abus de majuscules détecté. Merci d'écrire normalement.",
        "en": "⚠️ {actor}: excessive capitals detected. Please write normally.",
        "es": "⚠️ {actor}: abuso de mayúsculas detectado. Escribe con normalidad.",
        "de": "⚠️ {actor}: übermäßige Großbuchstaben erkannt. Bitte normal schreiben.",
        "it": "⚠️ {actor}: abuso di maiuscole rilevato. Scrivi normalmente.",
        "pt": "⚠️ {actor}: abuso de maiúsculas detectado. Escreva normalmente.",
        "nl": "⚠️ {actor}: overmatig hoofdlettergebruik. Schrijf normaal.",
        "ja": "⚠️ {actor}：大文字の乱用が検出されました。通常の書き方でお願いします。",
    },
    "naria.warning.repeated": {
        "fr": "⚠️ {actor} : message répété trop souvent. Patience entre chaque envoi.",
        "en": "⚠️ {actor}: message repeated too often. Please wait between posts.",
        "es": "⚠️ {actor}: mensaje repetido con demasiada frecuencia. Espera entre envíos.",
        "de": "⚠️ {actor}: Nachricht zu oft wiederholt. Warte zwischen den Beiträgen.",
        "it": "⚠️ {actor}: messaggio ripetuto troppo spesso. Attendi tra un invio e l'altro.",
        "pt": "⚠️ {actor}: mensagem repetida com frequência. Aguarde entre envios.",
        "nl": "⚠️ {actor}: bericht te vaak herhaald. Wacht tussen berichten.",
        "ja": "⚠️ {actor}：同じメッセージの繰り返しが多すぎます。送信の間隔を空けてください。",
    },
    "naria.warning.harassment": {
        "fr": "⚠️ {actor} : comportement agressif ou menaçant détecté. Le Nexus doit rester sûr pour tous.",
        "en": "⚠️ {actor}: aggressive or threatening behavior detected. The Nexus must stay safe for everyone.",
        "es": "⚠️ {actor}: comportamiento agresivo o amenazante detectado. El Nexus debe ser seguro para todos.",
        "de": "⚠️ {actor}: aggressives oder bedrohliches Verhalten erkannt. Der Nexus muss für alle sicher bleiben.",
        "it": "⚠️ {actor}: comportamento aggressivo o minaccioso rilevato. Il Nexus deve restare sicuro.",
        "pt": "⚠️ {actor}: comportamento agressivo ou ameaçador detectado. O Nexus deve ser seguro para todos.",
        "nl": "⚠️ {actor}: agressief of bedreigend gedrag gedetecteerd. De Nexus moet veilig blijven.",
        "ja": "⚠️ {actor}：攻撃的または脅迫的な行為が検出されました。ネクサスはすべての人にとって安全でなければなりません。",
    },
    "naria.warning.offensive": {
        "fr": "⚠️ {actor} : langage offensant détecté. Merci de respecter les autres joueurs.",
        "en": "⚠️ {actor}: offensive language detected. Please respect other players.",
        "es": "⚠️ {actor}: lenguaje ofensivo detectado. Respeta a los demás jugadores.",
        "de": "⚠️ {actor}: beleidigende Sprache erkannt. Bitte respektiere andere Spieler.",
        "it": "⚠️ {actor}: linguaggio offensivo rilevato. Rispetta gli altri giocatori.",
        "pt": "⚠️ {actor}: linguagem ofensiva detectada. Respeite os outros jogadores.",
        "nl": "⚠️ {actor}: beledigende taal gedetecteerd. Respecteer andere spelers.",
        "ja": "⚠️ {actor}：攻撃的な言葉遣いが検出されました。他のプレイヤーを尊重してください。",
    },
    "naria.content.hidden": {
        "fr": "Message masqué par {actor}.",
        "en": "Message hidden by {actor}.",
        "es": "Mensaje oculto por {actor}.",
        "de": "Nachricht von {actor} ausgeblendet.",
        "it": "Messaggio nascosto da {actor}.",
        "pt": "Mensagem ocultada por {actor}.",
        "nl": "Bericht verborgen door {actor}.",
        "ja": "{actor}により非表示にされました。",
    },
    "naria.content.hidden.comment": {
        "fr": "Commentaire masqué par {actor}.",
        "en": "Comment hidden by {actor}.",
        "es": "Comentario oculto por {actor}.",
        "de": "Kommentar von {actor} ausgeblendet.",
        "it": "Commento nascosto da {actor}.",
        "pt": "Comentário ocultado por {actor}.",
        "nl": "Reactie verborgen door {actor}.",
        "ja": "{actor}によりコメントが非表示になりました。",
    },
    "naria.content.hidden.post": {
        "fr": "Publication masquée par {actor}.",
        "en": "Post hidden by {actor}.",
        "es": "Publicación oculta por {actor}.",
        "de": "Beitrag von {actor} ausgeblendet.",
        "it": "Pubblicazione nascosta da {actor}.",
        "pt": "Publicação ocultada por {actor}.",
        "nl": "Bericht verborgen door {actor}.",
        "ja": "{actor}により投稿が非表示になりました。",
    },
    "naria.content.hidden.thread": {
        "fr": "Sujet masqué par {actor}.",
        "en": "Thread hidden by {actor}.",
        "es": "Tema oculto por {actor}.",
        "de": "Thema von {actor} ausgeblendet.",
        "it": "Discussione nascosta da {actor}.",
        "pt": "Tópico ocultado por {actor}.",
        "nl": "Topic verborgen door {actor}.",
        "ja": "{actor}によりスレッドが非表示になりました。",
    },
    "naria.content.hidden.reply": {
        "fr": "Réponse masquée par {actor}.",
        "en": "Reply hidden by {actor}.",
        "es": "Respuesta oculta por {actor}.",
        "de": "Antwort von {actor} ausgeblendet.",
        "it": "Risposta nascosta da {actor}.",
        "pt": "Resposta ocultada por {actor}.",
        "nl": "Antwoord verborgen door {actor}.",
        "ja": "{actor}により返信が非表示になりました。",
    },
    "naria.content.blocked": {
        "fr": "Ton message a été bloqué par {actor} car il semble contraire aux règles du Nexus.",
        "en": "Your message was blocked by {actor} because it may violate Nexus rules.",
        "es": "Tu mensaje fue bloqueado por {actor} porque puede infringir las reglas del Nexus.",
        "de": "Deine Nachricht wurde von {actor} blockiert, da sie gegen die Nexus-Regeln verstoßen könnte.",
        "it": "Il tuo messaggio è stato bloccato da {actor} perché potrebbe violare le regole del Nexus.",
        "pt": "Sua mensagem foi bloqueada por {actor} porque pode violar as regras do Nexus.",
        "nl": "Je bericht is geblokkeerd door {actor} omdat het mogelijk de Nexus-regels schendt.",
        "ja": "ネクサスのルールに違反する可能性があるため、{actor}がメッセージをブロックしました。",
    },
    "naria.content.hidden_notice": {
        "fr": "Ton message a été masqué par {actor} car il semble contraire aux règles du Nexus.",
        "en": "Your message was hidden by {actor} because it may violate Nexus rules.",
        "es": "Tu mensaje fue ocultado por {actor} porque puede infringir las reglas del Nexus.",
        "de": "Deine Nachricht wurde von {actor} ausgeblendet, da sie gegen die Nexus-Regeln verstoßen könnte.",
        "it": "Il tuo messaggio è stato nascosto da {actor} perché potrebbe violare le regole del Nexus.",
        "pt": "Sua mensagem foi ocultada por {actor} porque pode violar as regras do Nexus.",
        "nl": "Je bericht is verborgen door {actor} omdat het mogelijk de Nexus-regels schendt.",
        "ja": "ネクサスのルールに違反する可能性があるため、{actor}がメッセージを非表示にしました。",
    },
    "naria.restriction.temporary": {
        "fr": "Tu ne peux plus publier temporairement. {actor} a détecté des infractions répétées. Temps restant : {minutes} min.",
        "en": "You cannot post temporarily. {actor} detected repeated violations. Time remaining: {minutes} min.",
        "es": "No puedes publicar temporalmente. {actor} detectó infracciones repetidas. Tiempo restante: {minutes} min.",
        "de": "Du kannst vorübergehend nicht posten. {actor} hat wiederholte Verstöße erkannt. Verbleibend: {minutes} Min.",
        "it": "Non puoi pubblicare temporaneamente. {actor} ha rilevato infrazioni ripetute. Tempo rimanente: {minutes} min.",
        "pt": "Você não pode publicar temporariamente. {actor} detectou infrações repetidas. Tempo restante: {minutes} min.",
        "nl": "Je kunt tijdelijk niet posten. {actor} detecteerde herhaalde overtredingen. Resterend: {minutes} min.",
        "ja": "一時的に投稿できません。{actor}が繰り返しの違反を検出しました。残り：{minutes}分。",
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
        "fr": "Comportement grave détecté. {actor} a signalé ton compte à l'équipe.",
        "en": "Serious behavior detected. {actor} has reported your account to the team.",
        "es": "Comportamiento grave detectado. {actor} ha reportado tu cuenta al equipo.",
        "de": "Schwerwiegendes Verhalten erkannt. {actor} hat dein Konto dem Team gemeldet.",
        "it": "Comportamento grave rilevato. {actor} ha segnalato il tuo account al team.",
        "pt": "Comportamento grave detectado. {actor} reportou sua conta à equipe.",
        "nl": "Ernstig gedrag gedetecteerd. {actor} heeft je account gemeld aan het team.",
        "ja": "重大な行為が検出されました。{actor}があなたのアカウントをチームに報告しました。",
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


def get_message(key: str, lang: str, *, actor: str | None = None, **params) -> str:
    lang = normalize_lang(lang)
    bucket = _MESSAGES.get(key) or _MESSAGES["naria.warning.respect"]
    text = bucket.get(lang) or bucket.get("en") or bucket.get("fr") or key
    text = text.replace("{actor}", actor or NARIA_USERNAME)
    for k, v in params.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def message_key_for_rule(rule: str) -> str:
    return _RULE_TO_MESSAGE_KEY.get(rule, "naria.warning.respect")


def pick_user_message(
    hits: list,
    lang: str,
    *,
    actor: str | None = None,
    restrict_minutes: int = 0,
    hide: bool = False,
    block: bool = False,
) -> tuple[str, str]:
    """Retourne (message_key, message_traduit)."""
    actor_name = actor or NARIA_USERNAME
    if block:
        key = "naria.content.blocked"
        return key, get_message(key, lang, actor=actor_name)
    if hide:
        key = "naria.content.hidden_notice"
        return key, get_message(key, lang, actor=actor_name)
    if restrict_minutes >= 60:
        key = "naria.restriction.hour"
        return key, get_message(key, lang, actor=actor_name)
    if restrict_minutes > 0:
        key = "naria.restriction.temporary"
        return key, get_message(key, lang, actor=actor_name, minutes=restrict_minutes)

    primary_rule = hits[0].rule if hits else "default"
    key = message_key_for_rule(primary_rule)
    return key, get_message(key, lang, actor=actor_name)


_HIDDEN_KEY_BY_CONTENT_TYPE = {
    "news_comment": "naria.content.hidden.comment",
    "feed_comment": "naria.content.hidden.comment",
    "feed_post": "naria.content.hidden.post",
    "forum_thread": "naria.content.hidden.thread",
    "forum_reply": "naria.content.hidden.reply",
    "friend_message": "naria.content.hidden",
}


def hidden_placeholder(lang: str, *, actor: str | None = None, content_type: str = "generic") -> str:
    key = _HIDDEN_KEY_BY_CONTENT_TYPE.get(content_type, "naria.content.hidden")
    return get_message(key, lang, actor=actor or NARIA_USERNAME)
