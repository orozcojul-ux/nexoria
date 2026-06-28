import { T } from "./translations.js";

/** News article page, comments, report modal. */
export const TRANSLATIONS_NEWS_UI = {
  // ─── Article page ───
  "news.article.loading": T("Chargement…", "Loading…", { es: "Cargando…", de: "Laden…", it: "Caricamento…", pt: "Carregando…", nl: "Laden…", ja: "読み込み中…" }),
  "news.article.notFound": T(
    "Cet article n'existe pas ou n'est plus publié.",
    "This article does not exist or is no longer published.",
    { es: "Este artículo no existe o ya no está publicado.", de: "Dieser Artikel existiert nicht oder ist nicht mehr veröffentlicht.", it: "Questo articolo non esiste o non è più pubblicato.", pt: "Este artigo não existe ou já não está publicado.", nl: "Dit artikel bestaat niet of is niet meer gepubliceerd.", ja: "この記事は存在しないか、公開が終了しています。" },
  ),
  "news.article.backDashboard": T("Retour au tableau de bord", "Back to dashboard", { es: "Volver al panel", de: "Zurück zum Dashboard", it: "Torna alla dashboard", pt: "Voltar ao painel", nl: "Terug naar dashboard", ja: "ダッシュボードに戻る" }),

  // ─── Comments ───
  "news.comments.title": T("Commentaires", "Comments", { es: "Comentarios", de: "Kommentare", it: "Commenti", pt: "Comentários", nl: "Reacties", ja: "コメント" }),
  "news.comments.placeholder": T(
    "Réagir à cette actualité… (+15 XP)",
    "React to this news… (+15 XP)",
    { es: "Reacciona a esta noticia… (+15 XP)", de: "Auf diese News reagieren… (+15 XP)", it: "Reagisci a questa notizia… (+15 XP)", pt: "Reage a esta notícia… (+15 XP)", nl: "Reageer op dit nieuws… (+15 XP)", ja: "このニュースにコメント… (+15 XP)" },
  ),
  "news.comments.publish": T("Publier", "Publish", { es: "Publicar", de: "Veröffentlichen", it: "Pubblica", pt: "Publicar", nl: "Plaatsen", ja: "投稿" }),
  "news.comments.loading": T("Chargement…", "Loading…", { es: "Cargando…", de: "Laden…", it: "Caricamento…", pt: "Carregando…", nl: "Laden…", ja: "読み込み中…" }),
  "news.comments.empty": T(
    "Soyez le premier à commenter cette actualité.",
    "Be the first to comment on this news.",
    { es: "Sé el primero en comentar esta noticia.", de: "Sei der Erste, der diese News kommentiert.", it: "Sii il primo a commentare questa notizia.", pt: "Sê o primeiro a comentar esta notícia.", nl: "Wees de eerste om op dit nieuws te reageren.", ja: "最初のコメントを投稿しましょう。" },
  ),
  "news.comments.published": T("+15 XP — commentaire publié", "+15 XP — comment published", { es: "+15 XP — comentario publicado", de: "+15 XP — Kommentar veröffentlicht", it: "+15 XP — commento pubblicato", pt: "+15 XP — comentário publicado", nl: "+15 XP — reactie geplaatst", ja: "+15 XP — コメントを投稿しました" }),
  "news.comments.hideConfirm": T("Masquer ce commentaire ?", "Hide this comment?", { es: "¿Ocultar este comentario?", de: "Diesen Kommentar ausblenden?", it: "Nascondere questo commento?", pt: "Ocultar este comentário?", nl: "Deze reactie verbergen?", ja: "このコメントを非表示にしますか？" }),
  "news.comments.moderated": T("Commentaire modéré", "Comment moderated", { es: "Comentario moderado", de: "Kommentar moderiert", it: "Commento moderato", pt: "Comentário moderado", nl: "Reactie gemodereerd", ja: "コメントをモデレートしました" }),
  "news.comments.delete": T("Supprimer", "Delete", { es: "Eliminar", de: "Löschen", it: "Elimina", pt: "Eliminar", nl: "Verwijderen", ja: "削除" }),

  // ─── Report modal ───
  "report.button": T("Signaler", "Report", { es: "Reportar", de: "Melden", it: "Segnala", pt: "Denunciar", nl: "Rapporteren", ja: "通報" }),
  "report.buttonTitle": T("Signaler aux modérateurs", "Report to moderators", { es: "Reportar a moderadores", de: "Moderatoren melden", it: "Segnala ai moderatori", pt: "Denunciar aos moderadores", nl: "Rapporteren aan moderators", ja: "モデレーターに通報" }),
  "report.modalTitle": T("Signaler aux modérateurs", "Report to moderators", { es: "Reportar a moderadores", de: "An Moderatoren melden", it: "Segnala ai moderatori", pt: "Denunciar aos moderadores", nl: "Rapporteren aan moderators", ja: "モデレーターに通報" }),
  "report.context": T("Contexte : {label}", "Context: {label}", { es: "Contexto: {label}", de: "Kontext: {label}", it: "Contesto: {label}", pt: "Contexto: {label}", nl: "Context: {label}", ja: "コンテキスト: {label}" }),
  "report.reasonLabel": T("Motif", "Reason", { es: "Motivo", de: "Grund", it: "Motivo", pt: "Motivo", nl: "Reden", ja: "理由" }),
  "report.detailsLabel": T("Détails", "Details", { es: "Detalles", de: "Details", it: "Dettagli", pt: "Detalhes", nl: "Details", ja: "詳細" }),
  "report.detailsPlaceholder": T(
    "Expliquez le problème pour aider les modérateurs…",
    "Explain the issue to help moderators…",
    { es: "Explica el problema para ayudar a los moderadores…", de: "Erkläre das Problem für die Moderatoren…", it: "Spiega il problema per aiutare i moderatori…", pt: "Explica o problema para ajudar os moderadores…", nl: "Leg het probleem uit voor de moderators…", ja: "モデレーター向けに問題を説明してください…" },
  ),
  "report.cancel": T("Annuler", "Cancel", { es: "Cancelar", de: "Abbrechen", it: "Annulla", pt: "Cancelar", nl: "Annuleren", ja: "キャンセル" }),
  "report.submit": T("Envoyer le signalement", "Submit report", { es: "Enviar reporte", de: "Meldung senden", it: "Invia segnalazione", pt: "Enviar denúncia", nl: "Melding verzenden", ja: "通報を送信" }),
  "report.detailsMin": T("Décrivez le problème (5 caractères minimum)", "Describe the issue (5 characters minimum)", { es: "Describe el problema (mínimo 5 caracteres)", de: "Problem beschreiben (mindestens 5 Zeichen)", it: "Descrivi il problema (minimo 5 caratteri)", pt: "Descreve o problema (mínimo 5 caracteres)", nl: "Beschrijf het probleem (minimaal 5 tekens)", ja: "問題を説明してください（5文字以上）" }),
  "report.sent": T("Signalement envoyé au Conseil des modérateurs", "Report sent to the moderators' Council", { es: "Reporte enviado al Consejo de moderadores", de: "Meldung an den Moderationsrat gesendet", it: "Segnalazione inviata al Consiglio dei moderatori", pt: "Denúncia enviada ao Conselho de moderadores", nl: "Melding verzonden naar de moderatorsraad", ja: "モデレーター評議会に通報を送信しました" }),
  "report.reason.spam": T("Spam / publicité", "Spam / advertising", { es: "Spam / publicidad", de: "Spam / Werbung", it: "Spam / pubblicità", pt: "Spam / publicidade", nl: "Spam / reclame", ja: "スパム / 広告" }),
  "report.reason.harassment": T("Harcèlement / insultes", "Harassment / insults", { es: "Acoso / insultos", de: "Belästigung / Beleidigungen", it: "Molestie / insulti", pt: "Assédio / insultos", nl: "Intimidatie / beledigingen", ja: "ハラスメント / 侮辱" }),
  "report.reason.inappropriate": T("Contenu inapproprié", "Inappropriate content", { es: "Contenido inapropiado", de: "Unangemessener Inhalt", it: "Contenuto inappropriato", pt: "Conteúdo inadequado", nl: "Ongepaste inhoud", ja: "不適切なコンテンツ" }),
  "report.reason.cheating": T("Triche / abus", "Cheating / abuse", { es: "Trampa / abuso", de: "Cheating / Missbrauch", it: "Cheating / abuso", pt: "Trapaça / abuso", nl: "Cheating / misbruik", ja: "チート / 不正利用" }),
  "report.reason.other": T("Autre", "Other", { es: "Otro", de: "Sonstiges", it: "Altro", pt: "Outro", nl: "Overig", ja: "その他" }),

  // ─── Content translate feedback ───
  "contentTranslate.unavailable": T(
    "Traduction automatique indisponible",
    "Auto-translation unavailable",
    { es: "Traducción automática no disponible", de: "Automatische Übersetzung nicht verfügbar", it: "Traduzione automatica non disponibile", pt: "Tradução automática indisponível", nl: "Automatische vertaling niet beschikbaar", ja: "自動翻訳は利用できません" },
  ),
  "contentTranslate.failed": T(
    "Échec de la traduction",
    "Translation failed",
    { es: "Error de traducción", de: "Übersetzung fehlgeschlagen", it: "Traduzione fallita", pt: "Falha na tradução", nl: "Vertaling mislukt", ja: "翻訳に失敗しました" },
  ),
};
