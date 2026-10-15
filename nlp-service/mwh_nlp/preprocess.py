"""Text preprocessing for the lexical rankers (BM25, TF-IDF).

Lowercasing, tokenisation, stop-word removal (English + a short list of frequent Hinglish function
words, because some queries are code-mixed) and light rule-based suffix stripping. This is a simple
suffix-stripping lemmatiser, not a dictionary lemmatiser such as WordNet.
SBERT receives the raw text.
"""
import re

_EN = (
    "a an the and or but if then so of to in on at for from by with about as is are was were be been being am "
    "i me my mine we our ours you your yours he she it its they them their this that these those there here "
    "have has had do does did not no nor can could will would should shall may might must just very really too "
    "also im ive dont cant wont isnt arent wasnt didnt doesnt get gets got getting lot bit some any all more most "
    "much many what when where why how who whom which than into out up down over again once only own same such "
    "both each few other while during before after above below between through off under until against because "
    "feel feeling feels felt want wants wanted need needs like know think thing things way keep keeps still even "
    "make makes try trying going go goes cannot ever every always never something anything nothing everything "
    "much one two lately now today tomorrow yesterday day days time"
)
_HI = (
    "hai hain hu hun ho hoga hogi tha thi the ka ki ke ko se me mein par pe aur ya toh to bhi nahi nahin na "
    "kya kyun kyu kaise kaun kab ek yeh ye woh wo mujhe mujhse main mera meri mere tum tumhe aap hum humko "
    "rha rhi raha rahi rahe karna karta karti karte kar karu karun kuch koi sab bahut bohot zyada bas phir "
    "abhi ab jab tab jaata jata hota hoti hote lagta lagti lagte wala wali waale"
)
STOPWORDS = frozenset((_EN + " " + _HI).split())

_TOKEN = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")


def _lemma(w: str) -> str:
    if len(w) <= 3:
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("sses"):
        return w[:-2]
    if w.endswith("ing") and len(w) > 5:
        base = w[:-3]
        if len(base) > 2 and base[-1] == base[-2] and base[-1] not in "ls":
            base = base[:-1]
        return base
    if w.endswith("ed") and len(w) > 4:
        base = w[:-2]
        if len(base) > 2 and base[-1] == base[-2] and base[-1] not in "ls":
            base = base[:-1]
        return base
    if w.endswith("es") and len(w) > 4 and w[-3] in "sxz":
        return w[:-2]
    if w.endswith("s") and not w.endswith(("ss", "us", "is")) and len(w) > 3:
        return w[:-1]
    return w


def tokenize(text: str):
    """Return the list of (surface, lemma) pairs after stop-word removal."""
    out = []
    for t in _TOKEN.findall((text or "").lower().replace("’", "'")):
        t = t.replace("'", "")
        if len(t) < 2 or t in STOPWORDS:
            continue
        out.append((t, _lemma(t)))
    return out


def lemmas(text: str):
    return [l for _, l in tokenize(text)]


def ngrams(tokens, n_max=2):
    """Unigrams plus bigrams (joined with a space)."""
    out = list(tokens)
    if n_max >= 2:
        out += [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
    return out
