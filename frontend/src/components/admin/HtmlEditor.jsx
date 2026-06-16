import React, { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Code, Eye,
  Image as ImageIcon, Upload, Minus, Quote, Undo2, Redo2, Eraser, Loader2,
  Table, Highlighter, Subscript, Superscript, SeparatorHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import EmojiPicker from "@/components/editor/EmojiPicker";
import { stripHtml } from "@/lib/stripHtml";
import "@/pages/Maintenance.css";

const COLORS = ["#ffffff", "#a5f3fc", "#c4b5fd", "#fbbf24", "#4ade80", "#f87171", "#e9d5ff", "#c9a565"];
const HIGHLIGHTS = ["transparent", "#fef08a", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fecaca"];
const FONT_SIZES = [
  { label: "Petit", value: "0.85em" },
  { label: "Normal", value: "1em" },
  { label: "Grand", value: "1.25em" },
  { label: "Titre", value: "1.5em" },
];

function ToolbarButton({ icon: Icon, title, onClick, disabled, active }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded border border-transparent transition-colors disabled:opacity-30 ${
        active ? "text-violet-200 bg-violet-500/15" : "text-zinc-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

/**
 * Éditeur HTML enrichi.
 * variant="article" — articles news (toolbar complet, tableaux, tailles)
 * variant="forum"   — forum (émojis mis en avant)
 */
export default function HtmlEditor({
  value,
  onChange,
  label,
  hint,
  minHeight = 120,
  testid,
  variant = "forum",
}) {
  const isArticle = variant === "article";
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState("visual");
  const [source, setSource] = useState(value || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setSource(value || "");
    if (mode === "visual" && editorRef.current) {
      const next = value || "";
      if (editorRef.current.innerHTML !== next) editorRef.current.innerHTML = next;
    }
  }, [value, mode]);

  const syncFromEditor = () => {
    const html = editorRef.current?.innerHTML || "";
    setSource(html);
    onChange(html);
  };

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    syncFromEditor();
  };

  const insertHtml = (html) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncFromEditor();
  };

  const insertLink = () => {
    const url = window.prompt("URL du lien :", "https://");
    if (url) exec("createLink", url);
  };

  const insertImageUrl = () => {
    const url = window.prompt("URL de l'image :", "https://");
    if (!url) return;
    insertImageHtml(url);
  };

  const insertImageHtml = (url, alt = "Image") => {
    const safeAlt = alt.replace(/"/g, "'");
    insertHtml(`<img src="${url}" alt="${safeAlt}" style="max-width:100%;height:auto;border-radius:8px;margin:8px 0;" />`);
  };

  const insertTable = () => {
    insertHtml(
      `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid rgba(255,255,255,0.15);">`
      + `<thead><tr><th style="border:1px solid rgba(255,255,255,0.15);padding:8px;background:rgba(123,47,247,0.15);">Colonne 1</th>`
      + `<th style="border:1px solid rgba(255,255,255,0.15);padding:8px;background:rgba(123,47,247,0.15);">Colonne 2</th></tr></thead>`
      + `<tbody><tr><td style="border:1px solid rgba(255,255,255,0.15);padding:8px;">—</td>`
      + `<td style="border:1px solid rgba(255,255,255,0.15);padding:8px;">—</td></tr></tbody></table><p><br></p>`
    );
  };

  const insertCallout = () => {
    insertHtml(
      `<blockquote style="border-left:4px solid #c9a565;padding:12px 16px;margin:12px 0;background:rgba(201,165,101,0.08);border-radius:0 8px 8px 0;">`
      + `<strong>Note importante :</strong> votre texte ici…</blockquote><p><br></p>`
    );
  };

  const applyFontSize = (size) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      insertHtml(`<span style="font-size:${size}">texte</span>`);
      return;
    }
    const span = document.createElement("span");
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch {
      exec("fontSize", "4");
    }
    syncFromEditor();
  };

  const applyHighlight = (color) => {
    if (color === "transparent") {
      exec("removeFormat");
      return;
    }
    exec("hiliteColor", color);
    exec("backColor", color);
  };

  const insertEmoji = (emojiOrCode) => {
    const text = emojiOrCode.startsWith(":") ? emojiOrCode : emojiOrCode;
    insertHtml(`${text}&nbsp;`);
  };

  const uploadImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image uniquement");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image max 5 Mo");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload/image", form);
      insertImageHtml(data.url, file.name);
      toast.success("Image ajoutée");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        await uploadImage(item.getAsFile());
        return;
      }
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file) await uploadImage(file);
  };

  const switchToSource = () => {
    if (mode === "visual") syncFromEditor();
    setMode("source");
  };

  const switchToVisual = () => {
    onChange(source);
    setMode("visual");
    if (editorRef.current) editorRef.current.innerHTML = source;
  };

  const wordCount = stripHtml(source).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-1.5" data-testid={testid}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{label}</label>
        <div className="flex items-center gap-2">
          {wordCount > 0 && (
            <span className="text-[9px] text-zinc-600 font-mono-stat">{wordCount} mot{wordCount > 1 ? "s" : ""}</span>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => (mode === "source" ? switchToVisual() : setMode("visual"))}
              className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${mode === "visual" ? "border-violet-500/40 text-violet-200" : "border-white/10 text-zinc-500"}`}
            >
              <Eye className="w-3 h-3" /> Visuel
            </button>
            <button
              type="button"
              onClick={switchToSource}
              className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${mode === "source" ? "border-cyan-500/40 text-cyan-200" : "border-white/10 text-zinc-500"}`}
            >
              <Code className="w-3 h-3" /> HTML
            </button>
          </div>
        </div>
      </div>
      {hint && <p className="text-[10px] text-zinc-600 italic">{hint}</p>}

      <div className="rounded-lg border border-white/10 bg-[#0A0A0E] overflow-hidden">
        {mode === "visual" && (
          <div className="border-b border-white/10 bg-black/40">
            <div className="flex flex-wrap gap-0.5 px-2 py-1.5 items-center">
              <EmojiPicker onPick={insertEmoji} onPickCode={insertEmoji} />
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={Bold} title="Gras (Ctrl+B)" onClick={() => exec("bold")} />
              <ToolbarButton icon={Italic} title="Italique" onClick={() => exec("italic")} />
              <ToolbarButton icon={Underline} title="Souligné" onClick={() => exec("underline")} />
              <ToolbarButton icon={Strikethrough} title="Barré" onClick={() => exec("strikeThrough")} />
              <ToolbarButton icon={Subscript} title="Indice" onClick={() => exec("subscript")} />
              <ToolbarButton icon={Superscript} title="Exposant" onClick={() => exec("superscript")} />
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={Heading1} title="Titre H1" onClick={() => exec("formatBlock", "h1")} />
              <ToolbarButton icon={Heading2} title="Titre H2" onClick={() => exec("formatBlock", "h2")} />
              {isArticle && <ToolbarButton icon={Heading3} title="Titre H3" onClick={() => exec("formatBlock", "h3")} />}
              <ToolbarButton icon={AlignLeft} title="Paragraphe" onClick={() => exec("formatBlock", "p")} />
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={List} title="Liste" onClick={() => exec("insertUnorderedList")} />
              <ToolbarButton icon={ListOrdered} title="Liste numérotée" onClick={() => exec("insertOrderedList")} />
              <ToolbarButton icon={Quote} title="Citation" onClick={() => exec("formatBlock", "blockquote")} />
              {isArticle && (
                <ToolbarButton icon={SeparatorHorizontal} title="Encadré / callout" onClick={insertCallout} />
              )}
              <ToolbarButton icon={Minus} title="Séparateur" onClick={() => exec("insertHorizontalRule")} />
              {isArticle && <ToolbarButton icon={Table} title="Insérer tableau" onClick={insertTable} />}
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={AlignLeft} title="Gauche" onClick={() => exec("justifyLeft")} />
              <ToolbarButton icon={AlignCenter} title="Centrer" onClick={() => exec("justifyCenter")} />
              <ToolbarButton icon={AlignRight} title="Droite" onClick={() => exec("justifyRight")} />
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={Link2} title="Lien" onClick={insertLink} />
              <ToolbarButton icon={ImageIcon} title="Image par URL" onClick={insertImageUrl} />
              <ToolbarButton
                icon={uploading ? Loader2 : Upload}
                title="Uploader une image"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              />
              <span className="w-px h-5 bg-white/10 mx-0.5" />
              <ToolbarButton icon={Undo2} title="Annuler" onClick={() => exec("undo")} />
              <ToolbarButton icon={Redo2} title="Rétablir" onClick={() => exec("redo")} />
              <ToolbarButton icon={Eraser} title="Effacer format" onClick={() => exec("removeFormat")} />
            </div>
            <div className="flex flex-wrap items-center gap-2 px-2 pb-1.5">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Couleur</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); }}
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ background: c }}
                />
              ))}
              {isArticle && (
                <>
                  <span className="w-px h-4 bg-white/10 mx-1" />
                  <Highlighter className="w-3 h-3 text-zinc-600" />
                  {HIGHLIGHTS.filter((h) => h !== "transparent").map((c) => (
                    <button
                      key={c}
                      type="button"
                      title="Surligner"
                      onMouseDown={(e) => { e.preventDefault(); applyHighlight(c); }}
                      className="w-4 h-4 rounded border border-white/20 shrink-0"
                      style={{ background: c }}
                    />
                  ))}
                  <span className="w-px h-4 bg-white/10 mx-1" />
                  <select
                    className="text-[9px] bg-black/50 border border-white/10 rounded px-1 py-0.5 text-zinc-400"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) applyFontSize(e.target.value); e.target.value = ""; }}
                  >
                    <option value="">Taille</option>
                    {FONT_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => uploadImage(e.target.files?.[0])}
        />

        {mode === "visual" ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncFromEditor}
            onBlur={syncFromEditor}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="px-3 py-2.5 text-sm text-zinc-100 outline-none maintenance-rich maintenance-editor-surface max-w-none"
            style={{ minHeight }}
            data-placeholder={variant === "forum" ? "Rédigez votre message… :sword: :crown:" : "Rédigez votre article…"}
          />
        ) : (
          <textarea
            value={source}
            onChange={(e) => { setSource(e.target.value); onChange(e.target.value); }}
            className="w-full px-3 py-2.5 text-xs font-mono text-cyan-100/90 bg-transparent outline-none resize-y"
            style={{ minHeight }}
            spellCheck={false}
          />
        )}
      </div>
      {mode === "visual" && (
        <p className="text-[9px] text-zinc-600">
          Émojis · glisser-déposer images · upload max 5 Mo
          {variant === "forum" ? " · codes :sword: :crown: :fire:" : " · tableaux et callouts en mode article"}
        </p>
      )}
    </div>
  );
}
