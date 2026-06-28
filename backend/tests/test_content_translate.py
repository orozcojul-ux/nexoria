from content_translate import normalize_lang, parse_accept_language, text_hash, make_cache_key


def test_normalize_lang():
    assert normalize_lang("en") == "en"
    assert normalize_lang("pt-BR") == "pt"
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


def test_cache_get_skips_when_db_is_none():
    import content_translate as ct
    ct.init(None)
    import asyncio
    assert asyncio.run(ct._cache_get("any-key")) is None


def test_mark_and_inject_html_preserves_structure():
    from content_translate import inject_html_segments, mark_html_segments

    source = "<p>Hello <strong>world</strong></p><p>Second <mark>line</mark></p>"
    marked, segments = mark_html_segments(source)
    assert segments == ["Hello ", "world", "Second ", "line"]
    assert "<strong>" in marked and 'data-nx-tx="1"' in marked
    translated = ["Hola ", "mundo", "Segunda ", "línea"]
    out = inject_html_segments(marked, translated)
    assert out == "<p>Hola <strong>mundo</strong></p><p>Segunda <mark>línea</mark></p>"


def test_pack_and_unpack_segments():
    from content_translate import pack_segments, unpack_segments

    segments = ["Bonjour", "le forum", "les rôles"]
    packed = pack_segments(segments)
    fake = packed.replace("Bonjour", "Hola").replace("le forum", "el foro").replace("les rôles", "los roles")
    out = unpack_segments(fake, len(segments))
    assert out == ["Hola", "el foro", "los roles"]
