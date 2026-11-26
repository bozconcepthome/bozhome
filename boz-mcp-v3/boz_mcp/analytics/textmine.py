"""Türkçe metin madenciliği: normalizasyon, konu sınıflandırma, n-gram."""
from __future__ import annotations

import re
from collections import Counter

_TR = str.maketrans({"İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç"})
_WORD = re.compile(r"[a-zçğıöşü0-9]+", re.IGNORECASE)

STOPWORDS = set("""ve ile bir bu şu o da de mi mı mu mü için ama fakat çok daha en gibi ne neden nasıl acaba merhaba
merhabalar iyi günler teşekkür teşekkürler ederim lütfen var yok mı olur olarak olan oldu ben biz siz sizin benim bana
size ürün ürünü ürünün ürünler kaç kadar tane ya veya hem ki şey her hiç cm one size tek ebat adet""".split())

TOPICS: dict[str, list[str]] = {
    "ölçü/boyut": ["ölçü", "boyut", "ebat", "yükseklik", "genişlik", "derinlik", "uzunluk", "cm", "çap", "santim", "kaç metre"],
    "malzeme/kalite": ["malzeme", "metal", "demir", "çelik", "paslan", "krom", "ahşap", "mdf", "kalınlık", "kalın", "ince", "tel", "boya", "kaplama", "kalite", "sağlam"],
    "taşıma kapasitesi": ["kaç kg", "kilo", "taşır", "taşıma", "ağırlık", "dayanır", "çeker"],
    "montaj/kurulum": ["montaj", "kurulum", "vida", "monte", "delme", "delik", "yapışkan", "matkap", "kurulu", "demonte", "birleştir"],
    "kargo/teslimat": ["kargo", "teslim", "gönderi", "kaç günde", "ne zaman gelir", "sipariş", "kargoya", "ulaş"],
    "renk/varyant": ["renk", "siyah", "beyaz", "gold", "altın", "gümüş", "bronz", "farklı renk", "rengi"],
    "stok/tedarik": ["stok", "gelecek mi", "ne zaman gel", "tükendi", "yeniden"],
    "hasar/kusur": ["kırık", "hasar", "ezik", "çizik", "bozuk", "paslandı", "matlaş", "kusur", "yamuk", "eğri", "kırıldı", "çatlak", "lekeli", "soyul"],
    "eksik parça": ["eksik", "parça yok", "parçası yok", "vida yok", "gelmedi", "çıkmadı"],
    "iade/değişim": ["iade", "değişim", "değiştir", "geri gönder"],
    "fatura": ["fatura"],
    "fiyat/kampanya": ["indirim", "fiyat", "kampanya", "kupon", "pahalı", "ucuz"],
    "adet/set": ["kaç adet", "takım", "set", "2'li", "ikili", "tane mi", "çift"],
    "kullanım alanı": ["banyo", "mutfak", "salon", "dış mekan", "balkon", "nem", "su", "ıslak"],
}

COMPLAINT_TOPICS = {"hasar/kusur", "eksik parça", "iade/değişim"}


def norm(text: str | None) -> str:
    return (text or "").translate(_TR).lower()


def tokens(text: str | None, stop: bool = True) -> list[str]:
    toks = _WORD.findall(norm(text))
    return [t for t in toks if not (stop and (t in STOPWORDS or len(t) < 2))]


def classify(text: str | None) -> list[str]:
    t = norm(text)
    hits = [topic for topic, kws in TOPICS.items() if any(k in t for k in kws)]
    return hits or ["diğer"]


def ngrams(texts: list[str], n: int = 2, top: int = 30, stop: bool = True) -> list[tuple[str, int]]:
    c: Counter[str] = Counter()
    for tx in texts:
        tk = tokens(tx, stop)
        c.update(" ".join(tk[i:i + n]) for i in range(len(tk) - n + 1))
    return c.most_common(top)


def similarity(a: str, b: str) -> float:
    sa, sb = set(tokens(a)), set(tokens(b))
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)
