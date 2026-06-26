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
