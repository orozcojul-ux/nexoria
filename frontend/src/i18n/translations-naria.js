/** Naria — messages multilingues (alignés avec backend/naria_messages.py) */
import { T } from "./translations.js";

export const TRANSLATIONS_NARIA = {
  "naria.title": T("Naria — Sentinelle", "Naria — Sentinel", {
    es: "Naria — Centinela", de: "Naria — Wächterin", it: "Naria — Sentinella",
    pt: "Naria — Sentinela", nl: "Naria — Wachter", ja: "Naria — 番人",
  }),
  "naria.warning.respect": T(
    "⚠️ Naria — Sentinelle du Nexus : ton message semble contraire aux règles de la communauté. Merci de rester respectueux.",
    "⚠️ Naria — Sentinel of the Nexus: your message may violate the community rules. Please remain respectful.",
    {
      es: "⚠️ Naria — Centinela del Nexus: tu mensaje puede infringir las normas de la comunidad. Por favor, mantén el respeto.",
      de: "⚠️ Naria — Wächterin des Nexus: deine Nachricht könnte gegen die Community-Regeln verstoßen. Bitte bleibe respektvoll.",
      it: "⚠️ Naria — Sentinella del Nexus: il tuo messaggio potrebbe violare le regole della community. Ti invitiamo a mantenere il rispetto.",
      pt: "⚠️ Naria — Sentinela do Nexus: sua mensagem pode violar as regras da comunidade. Por favor, mantenha o respeito.",
      nl: "⚠️ Naria — Wachter van de Nexus: je bericht kan in strijd zijn met de communityregels. Blijf respectvol.",
      ja: "⚠️ Naria — ネクサスの番人：あなたのメッセージはコミュニティルールに違反している可能性があります。敬意を持って交流してください。",
    },
  ),
  "naria.warning.spam": T(
    "⚠️ Naria : ton message ressemble à du spam. Évite les répétitions et la publicité non sollicitée.",
    "⚠️ Naria: your message looks like spam. Avoid repetition and unsolicited advertising.",
    { es: "⚠️ Naria: tu mensaje parece spam.", de: "⚠️ Naria: deine Nachricht wirkt wie Spam.", it: "⚠️ Naria: il tuo messaggio sembra spam.", pt: "⚠️ Naria: sua mensagem parece spam.", nl: "⚠️ Naria: je bericht lijkt op spam.", ja: "⚠️ Naria：スパムの可能性があります。" },
  ),
  "naria.warning.link": T(
    "⚠️ Naria : lien suspect détecté. Ne partage que des liens sûrs et autorisés.",
    "⚠️ Naria: suspicious link detected. Only share safe, allowed links.",
    { es: "⚠️ Naria: enlace sospechoso detectado.", de: "⚠️ Naria: verdächtiger Link erkannt.", it: "⚠️ Naria: link sospetto rilevato.", pt: "⚠️ Naria: link suspeito detectado.", nl: "⚠️ Naria: verdachte link gedetecteerd.", ja: "⚠️ Naria：不審なリンクが検出されました。" },
  ),
  "naria.warning.caps": T(
    "⚠️ Naria : abus de majuscules détecté. Merci d'écrire normalement.",
    "⚠️ Naria: excessive capitals detected. Please write normally.",
    { es: "⚠️ Naria: abuso de mayúsculas detectado.", de: "⚠️ Naria: übermäßige Großbuchstaben erkannt.", it: "⚠️ Naria: abuso di maiuscole rilevato.", pt: "⚠️ Naria: abuso de maiúsculas detectado.", nl: "⚠️ Naria: overmatig hoofdlettergebruik.", ja: "⚠️ Naria：大文字の乱用が検出されました。" },
  ),
  "naria.warning.repeated": T(
    "⚠️ Naria : message répété trop souvent. Patience entre chaque envoi.",
    "⚠️ Naria: message repeated too often. Please wait between posts.",
    { es: "⚠️ Naria: mensaje repetido con demasiada frecuencia.", de: "⚠️ Naria: Nachricht zu oft wiederholt.", it: "⚠️ Naria: messaggio ripetuto troppo spesso.", pt: "⚠️ Naria: mensagem repetida com frequência.", nl: "⚠️ Naria: bericht te vaak herhaald.", ja: "⚠️ Naria：同じメッセージの繰り返しが多すぎます。" },
  ),
  "naria.warning.harassment": T(
    "⚠️ Naria : comportement agressif ou menaçant détecté. Le Nexus doit rester sûr pour tous.",
    "⚠️ Naria: aggressive or threatening behavior detected. The Nexus must stay safe for everyone.",
    { es: "⚠️ Naria: comportamiento agresivo o amenazante detectado.", de: "⚠️ Naria: aggressives Verhalten erkannt.", it: "⚠️ Naria: comportamento aggressivo rilevato.", pt: "⚠️ Naria: comportamento agressivo detectado.", nl: "⚠️ Naria: agressief gedrag gedetecteerd.", ja: "⚠️ Naria：攻撃的な行為が検出されました。" },
  ),
  "naria.warning.offensive": T(
    "⚠️ Naria : langage offensant détecté. Merci de respecter les autres joueurs.",
    "⚠️ Naria: offensive language detected. Please respect other players.",
    { es: "⚠️ Naria: lenguaje ofensivo detectado.", de: "⚠️ Naria: beleidigende Sprache erkannt.", it: "⚠️ Naria: linguaggio offensivo rilevato.", pt: "⚠️ Naria: linguagem ofensiva detectada.", nl: "⚠️ Naria: beledigende taal gedetecteerd.", ja: "⚠️ Naria：攻撃的な言葉遣いが検出されました。" },
  ),
  "naria.content.hidden": T(
    "Message masqué par la modération.",
    "Message hidden by moderation.",
    { es: "Mensaje oculto por moderación.", de: "Nachricht ausgeblendet.", it: "Messaggio nascosto.", pt: "Mensagem ocultada.", nl: "Bericht verborgen.", ja: "モデレーションにより非表示。" },
  ),
  "naria.content.blocked": T(
    "Ton message a été bloqué par Naria car il semble contraire aux règles du Nexus.",
    "Your message was blocked by Naria because it may violate Nexus rules.",
    { es: "Tu mensaje fue bloqueado por Naria.", de: "Deine Nachricht wurde von Naria blockiert.", it: "Il tuo messaggio è stato bloccato da Naria.", pt: "Sua mensagem foi bloqueada pela Naria.", nl: "Je bericht is geblokkeerd door Naria.", ja: "Nariaがメッセージをブロックしました。" },
  ),
  "naria.content.hidden_notice": T(
    "Ton message a été masqué par Naria car il semble contraire aux règles du Nexus.",
    "Your message was hidden by Naria because it may violate Nexus rules.",
    { es: "Tu mensaje fue ocultado por Naria.", de: "Deine Nachricht wurde ausgeblendet.", it: "Il tuo messaggio è stato nascosto da Naria.", pt: "Sua mensagem foi ocultada pela Naria.", nl: "Je bericht is verborgen door Naria.", ja: "Nariaがメッセージを非表示にしました。" },
  ),
  "naria.restriction.temporary": T(
    "Tu ne peux plus publier temporairement. Temps restant : {minutes} min.",
    "You cannot post temporarily. Time remaining: {minutes} min.",
    { es: "No puedes publicar temporalmente. Tiempo restante: {minutes} min.", de: "Du kannst vorübergehend nicht posten. Verbleibend: {minutes} Min.", it: "Non puoi pubblicare temporaneamente. Tempo rimanente: {minutes} min.", pt: "Você não pode publicar temporariamente. Tempo restante: {minutes} min.", nl: "Je kunt tijdelijk niet posten. Resterend: {minutes} min.", ja: "一時的に投稿できません。残り：{minutes}分。" },
  ),
  "naria.restriction.hour": T(
    "Tu ne peux plus publier temporairement (1 h). L'équipe a été alertée.",
    "You cannot post temporarily (1 h). The team has been alerted.",
    { es: "No puedes publicar temporalmente (1 h).", de: "Du kannst vorübergehend nicht posten (1 h).", it: "Non puoi pubblicare temporaneamente (1 h).", pt: "Você não pode publicar temporariamente (1 h).", nl: "Je kunt tijdelijk niet posten (1 u).", ja: "一時的に投稿できません（1時間）。" },
  ),
  "naria.ban.notice": T(
    "Comportement grave détecté. Naria a signalé ton compte à l'équipe.",
    "Serious behavior detected. Naria has reported your account to the team.",
    { es: "Comportamiento grave detectado.", de: "Schwerwiegendes Verhalten erkannt.", it: "Comportamento grave rilevato.", pt: "Comportamento grave detectado.", nl: "Ernstig gedrag gedetecteerd.", ja: "重大な行為が検出されました。" },
  ),
  "community.naria.official": T(
    "Sentinelle officielle du Nexus",
    "Official Nexus Sentinel",
    { es: "Centinela oficial del Nexus", de: "Offizielle Nexus-Sentinellin", it: "Sentinella ufficiale del Nexus", pt: "Sentinela oficial do Nexus", nl: "Officiële Nexus-Sentinell", ja: "ネクサス公式センチネル" },
  ),
  "community.naria.bio": T(
    "Naria veille sur le Nexus, analyse les échanges dans plusieurs langues et protège la communauté en temps réel.",
    "Naria watches over the Nexus, analyzes exchanges in multiple languages and protects the community in real time.",
    {
      es: "Naria vela por el Nexus, analiza los intercambios en varios idiomas y protege a la comunidad en tiempo real.",
      de: "Naria wacht über den Nexus, analysiert Austausch in mehreren Sprachen und schützt die Community in Echtzeit.",
      it: "Naria veglia sul Nexus, analizza gli scambi in più lingue e protegge la community in tempo reale.",
      pt: "Naria vigia o Nexus, analisa as conversas em vários idiomas e protege a comunidade em tempo real.",
      nl: "Naria waakt over de Nexus, analyseert uitwisselingen in meerdere talen en beschermt de community.",
      ja: "Nariaはネクサスを見守り、複数言語のやり取りを分析し、コミュニティをリアルタイムで保護します。",
    },
  ),
};
