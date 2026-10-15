"""Safety-aware recommendation pipeline (Algorithm 1 in the paper).

    1  crisis gate  -> EMERGENCY (bypass retrieval)
    2  retrieve with the hybrid ranker
    3  if max score < tau -> CATEGORY_BROWSE (low-confidence fallback)
    4  else top-k with 'why this?' explanation

Queries are processed in memory only; nothing is logged or stored here.
"""
from .preprocess import tokenize
from .rankers import doc_text

EMERGENCY = "EMERGENCY"
CATEGORY_BROWSE = "CATEGORY_BROWSE"
OK = "OK"
INVALID = "INVALID"

HELPLINES = [
    {"name": "Tele-MANAS (Govt. of India)", "number": "14416", "desc": "24/7, free, multiple languages"},
    {"name": "KIRAN Mental Health", "number": "1800-599-0019", "desc": "24/7 toll-free"},
    {"name": "Emergency services", "number": "112", "desc": "Immediate danger"},
]


class Recommender:
    def __init__(self, corpus, hybrid, gate, tau: float, k: int = 5):
        self.corpus, self.hybrid, self.gate, self.tau, self.k = corpus, hybrid, gate, float(tau), int(k)
        self._doc_lemmas = [{l for _, l in tokenize(doc_text(r))} for r in corpus]
        self._doc_surface = [{s for s, _ in tokenize(doc_text(r))} for r in corpus]

    def categories(self):
        seen, out = set(), []
        for r in self.corpus:
            if r["category"] not in seen:
                seen.add(r["category"])
                out.append(r["category"])
        return out

    def explain(self, query: str, i: int) -> dict:
        q = tokenize(query)
        matched = sorted({s for s, l in q if l in self._doc_lemmas[i]})
        tags = [t for t in self.corpus[i].get("tags", []) if any(w in t for w in {l for _, l in q})]
        return {"matched_terms": matched, "matched_tags": tags, "category": self.corpus[i]["category"]}

    def recommend(self, text: str, k: int | None = None) -> dict:
        text = (text or "").strip()
        if not text or len(text) > 1000:
            return {"status": INVALID, "results": []}
        k = k or self.k

        q_vec = self.hybrid.sbert.encoder.encode([text])[0]  # encoded once, used by gate and retrieval
        verdict = self.gate.check(text, q_vec)
        if verdict["flag"]:
            return {"status": EMERGENCY, "results": [], "helplines": HELPLINES}

        scores = self.hybrid.score(text, q_vec)
        top = float(scores.max()) if len(scores) else 0.0
        if top < self.tau:
            return {"status": CATEGORY_BROWSE, "results": [], "categories": self.categories(), "confidence": top}

        order = scores.argsort()[::-1][:k]
        results = []
        for i in order:
            r = self.corpus[int(i)]
            results.append({
                "id": r["id"], "title": r["title"], "description": r["description"], "category": r["category"],
                "duration_min": r["duration_min"], "type": r["type"], "tags": r["tags"],
                "score": round(float(scores[i]), 4), "why": self.explain(text, int(i)),
            })
        return {"status": OK, "results": results, "confidence": top}
