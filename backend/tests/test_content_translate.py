from content_translate import (
    inject_html_segments,
    make_cache_key,
    make_content_cache_key,
    mark_html_segments,
    normalize_lang,
    pack_segments,
    parse_accept_language,
    split_text_for_translation,
    text_hash,
    unpack_segments,
)


def test_normalize_lang():
    assert normalize_lang("en") == "en"
    assert normalize_lang("pt-BR") == "pt"
    assert normalize_lang("nl") == "nl"
    assert normalize_lang("xx") == "fr"


def test_parse_accept_language():
    assert parse_accept_language("en,fr;q=0.9") == "en"
    assert parse_accept_language("") == "fr"


def test_cache_key_stable():
    h = text_hash("Hello world")
    k1 = make_cache_key("news", "news_1", "title", "fr", "en", h)
    k2 = make_cache_key("news", "news_1", "title", "fr", "en", h)
    assert k1 == k2
    assert k1 != make_cache_key("news", "news_2", "title", "fr", "en", h)


def test_content_cache_key():
    h = text_hash("Bonjour")
    key = make_content_cache_key(h, "fr", "en")
    assert key
    assert key == make_content_cache_key(h, "fr", "en")
    assert not make_content_cache_key("", "fr", "en")


def test_cache_get_skips_when_db_is_none():
    import content_translate as ct
    ct.init(None)
    import asyncio
    assert asyncio.run(ct._cache_get("any-key")) is None


def test_use_libretranslate_localhost(monkeypatch):
    import content_translate as ct

    monkeypatch.setenv("LIBRETRANSLATE_URL", "http://127.0.0.1:5000")
    monkeypatch.delenv("CONTENT_TRANSLATE_USE_LIBRETRANSLATE", raising=False)
    assert ct._use_libretranslate() is True

    monkeypatch.setenv("CONTENT_TRANSLATE_USE_LIBRETRANSLATE", "0")
    assert ct._use_libretranslate() is False


def test_mark_and_inject_html_preserves_structure():
    source = "<p>Hello <strong>world</strong></p><p>Second <mark>line</mark></p>"
    marked, segments = mark_html_segments(source)
    assert segments == ["Hello ", "world", "Second ", "line"]
    assert "<strong>" in marked and 'data-nx-tx="1"' in marked
    translated = ["Hola ", "mundo", "Segunda ", "línea"]
    out = inject_html_segments(marked, translated)
    assert out == "<p>Hola <strong>mundo</strong></p><p>Segunda <mark>línea</mark></p>"


def test_pack_and_unpack_segments():
    segments = ["Bonjour", "le forum", "les rôles"]
    packed = pack_segments(segments)
    fake = packed.replace("Bonjour", "Hola").replace("le forum", "el foro").replace("les rôles", "los roles")
    out = unpack_segments(fake, len(segments))
    assert out == ["Hola", "el foro", "los roles"]


def test_split_text_short_unchanged():
    text = "Bonjour le forum."
    assert split_text_for_translation(text, max_len=1000) == [text]


def test_split_text_by_paragraphs():
    text = "Premier paragraphe.\n\nDeuxième paragraphe plus long.\n\nTroisième."
    chunks = split_text_for_translation(text, max_len=40)
    assert len(chunks) >= 2
    assert "".join(chunks) == text


def test_split_long_paragraph_by_sentences():
    sent = "Phrase un. Phrase deux. Phrase trois. " * 20
    chunks = split_text_for_translation(sent.strip(), max_len=120)
    assert len(chunks) > 1
    assert all(len(c) <= 120 for c in chunks)


def test_mymemory_disabled_by_default(monkeypatch):
    import content_translate as ct

    monkeypatch.delenv("CONTENT_TRANSLATION_DISABLE_MYMEMORY", raising=False)
    monkeypatch.delenv("CONTENT_TRANSLATE_ALLOW_MYMEMORY", raising=False)
    assert ct._allow_mymemory_for("Bonjour") is False
    assert ct._allow_mymemory_for("x" * 500) is False


def test_mymemory_only_short_when_enabled(monkeypatch):
    import content_translate as ct

    monkeypatch.setenv("CONTENT_TRANSLATE_ALLOW_MYMEMORY", "1")
    assert ct._allow_mymemory_for("Bonjour") is True
    assert ct._allow_mymemory_for("x" * 500) is False


def test_content_timeout_default(monkeypatch):
    import content_translate as ct

    monkeypatch.delenv("CONTENT_TRANSLATION_TIMEOUT_SECONDS", raising=False)
    assert ct._content_timeout() == 25.0


def test_chunk_size_default(monkeypatch):
    import content_translate as ct

    monkeypatch.delenv("CONTENT_TRANSLATION_CHUNK_SIZE", raising=False)
    assert ct._chunk_size() == 1000
